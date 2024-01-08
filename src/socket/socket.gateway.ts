import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import axios from 'axios';
import { Server, Socket } from 'socket.io';
import { getInitalPatientPrompt } from 'src/chat/constants/prompt';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { Chat } from 'src/chat/schemas/chat.schema';
import {
  ExamSession,
  ExamSessionStatus,
} from 'src/chat/schemas/session.schema';
import { PatientRepository } from 'src/station/repositories/patient.repository';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { Patient } from 'src/station/schemas/patient.schema';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { User } from 'src/user/schemas/user.schema';

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, Socket>();
  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly patientRepository: PatientRepository,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(_client: Socket) {
    this.printConnections();
  }

  handleDisconnect(client: Socket): void {
    this.removeSocketFromMap(client);
  }

  @SubscribeMessage('CHAT_COMPLETION')
  async handleChatCompletion(
    client: Socket,
    payload: { content: string; sessionId: string },
  ): Promise<void> {
    try {
      const { content, sessionId } = payload;
      console.log(payload);

      const sessionExists = await this.examSessionsRepository.exists({
        sessionId,
      });

      if (!sessionExists) {
        this.logger.log('Session not found.');
        client.emit('ERROR', {
          msg: 'Session not found.',
        });
        return;
      }

      const session = await this.examSessionsRepository.findOne({
        sessionId,
      });

      if (session.status !== ExamSessionStatus.ACTIVE) {
        this.logger.log('Session is not active.');
        client.emit('ERROR', {
          msg: 'Session is not active.',
        });
        return;
      }

      const station = await this.stationsRepository.findOne({
        stationId: session.stationId,
      });

      const user = await this.usersRepository.findOne({
        userId: session.associatedUser,
      });

      const patient = await this.patientRepository.findOne({
        associatedStation: station.stationId,
      });

      const prompt = await this.createPrompt(user, patient, session, content);
      console.log(prompt);

      await this.chatsRepository.create({
        sessionId,
        role: 'user',
        content,
      } as Chat);

      const fullMessage = await this.callOpenAIChatCompletionApi(
        client,
        prompt,
      );

      await this.chatsRepository.create({
        sessionId,
        role: 'assistant',
        content: fullMessage,
      } as Chat);
    } catch (error) {
      client.emit('ERROR', {
        msg: error.message,
      });
      console.log(error);
      this.logger.log('Something went wrong. Please try again.');
    }
  }

  @SubscribeMessage('REG_SOC')
  handleSocRegister(client: Socket, payload: { user: string }): void {
    const user = payload.user;

    const existingSocket = this.userSocketMap.get(user);

    if (existingSocket && existingSocket !== client) {
      existingSocket.disconnect();
    }

    this.userSocketMap.set(user, client);
    client.emit('REG_SOC_SUCCESS', {
      msg: 'Connection established with the socket server.',
    });

    this.printConnections();
  }

  private removeSocketFromMap(socket: Socket): void {
    const user = [...this.userSocketMap.entries()].find(
      ([_, socketItem]) => socketItem === socket,
    )?.[0];
    if (user) {
      this.userSocketMap.delete(user);
    }
  }

  private printConnections() {
    const connectedSocketsInfo: string[] = [];

    this.userSocketMap.forEach((_, user) => {
      connectedSocketsInfo.push(`User: ${user}`);
    });

    if (connectedSocketsInfo.length > 0) {
      const connectedSocketsCount = connectedSocketsInfo.length;
      const connectedSocketsMessage = connectedSocketsInfo.join('\n');
      this.logger.log(
        `Connected Sockets (${connectedSocketsCount}):\n${connectedSocketsMessage}`,
      );
    } else {
      this.logger.log('No connected sockets.');
    }
  }

  async callOpenAIChatCompletionApi(
    client: Socket,
    prompt: Array<{ role: string; content: string }>,
  ) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.get<string>(
        'OPENAI_API_KEY',
      )}`,
    };

    const body = {
      messages: prompt,
      model: 'gpt-3.5-turbo-1106',
      max_tokens: 150,
      temperature: 0.7,
      stream: true,
    };

    try {
      const response = await axios.post(url, body, { headers });

      const data = response.data
        .split('\n')
        .filter((s) => s != '' && !s.includes('[DONE]'))
        .map((t) => JSON.parse(t.slice(6, t.length)));

      let fullMessage = [];

      for (let i = 0; i < data.length - 1; i++) {
        const chunk = data[i];
        const msg = chunk.choices[0].delta.content;
        fullMessage.push(msg);
        client.emit('RECEIVE_CHAT_COMPLETION', {
          msg,
        });
      }

      client.emit('RECEIVE_CHAT_COMPLETION', {
        msg: 'CHAT_COMPLETION_DONE',
      });

      return fullMessage.join('');
    } catch (error) {
      console.log(error);
      client.emit('ERROR', {
        msg: error.message,
      });
      this.logger.log('Something went wrong. Please try again.');
    }
  }

  async createPrompt(
    user: User,
    patient: Patient,
    session: ExamSession,
    newMessage: string,
  ): Promise<Array<{ role: string; content: string }>> {
    const prompt = getInitalPatientPrompt(user, patient);

    const chats = await this.chatsRepository.find({
      sessionId: session.sessionId,
    });

    chats.sort((a, b) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const history = chats.map((chat) => {
      return {
        role: chat.role,
        content: chat.content,
      };
    });

    prompt.push(...history);
    prompt.push({
      role: 'user',
      content: newMessage,
    });
    return prompt;
  }

  async sendEvaluationReportGenerationProgress(
    userId: string,
    percentage: string,
    pdfUrl: string = null,
  ) {
    const client = this.userSocketMap.get(userId);
    if (client) {
      client.emit('EVALUATION_REPORT_GENERATION_PROGRESS', {
        progress: percentage,
        pdfUrl,
      });
    }
  }
}
