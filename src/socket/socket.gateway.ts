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
import { ElevenLabsUtil } from 'src/utils/elevenlabs.util';
import { OpenAiUtil } from 'src/utils/openai.util';

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
    private readonly openAiUtil: OpenAiUtil,
    private readonly elevenLabsUtil: ElevenLabsUtil,
  ) {}

  handleConnection(_client: Socket) {
    this.printConnections();
  }

  handleDisconnect(client: Socket): void {
    this.removeSocketFromMap(client);
  }

  @SubscribeMessage('REG_SOC')
  async handleSocRegister(
    client: Socket,
    payload: { user: string },
  ): Promise<void> {
    const userId = payload.user;
    if (!userId) {
      client.emit('ERROR', {
        msg: 'UserID is null.',
      });
      return;
    }

    const userExists = await this.usersRepository.exists({ userId: userId });
    if (!userExists) {
      client.emit('ERROR', {
        msg: 'Unauthorized. User not found.',
      });
      return;
    }

    const existingSocket = this.userSocketMap.get(userId);
    if (existingSocket && existingSocket !== client) {
      existingSocket.disconnect();
    }

    this.userSocketMap.set(userId, client);
    client.emit('REG_SOC_SUCCESS', {
      msg: 'Connection established with the socket server.',
    });

    this.printConnections();
  }

  @SubscribeMessage('CHAT_COMPLETION')
  async handleChatCompletion(
    client: Socket,
    payload: { content: string; sessionId: string },
    userId: string = null,
  ): Promise<void> {
    if (!client) client = this.userSocketMap.get(userId);
    if (!client) {
      this.logger.log('Socket not found.');
      return;
    }
    try {
      const { content, sessionId } = payload;
      if (!content || !sessionId) {
        client.emit('ERROR', {
          msg: 'Content or sessionId is null.',
        });
        return;
      }
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
      await this.chatsRepository.create({
        sessionId,
        role: 'user',
        content,
      } as Chat);

      await this.callOpenAIChatCompletionAnd11LabsVoiceApi(
        client,
        prompt,
        patient,
        sessionId,
      );
    } catch (error) {
      client.emit('ERROR', {
        msg: error.message,
      });
      this.logger.error(error);
      this.logger.log('Something went wrong. Please try again.');
    }
  }

  private removeSocketFromMap(socket: Socket): void {
    const user = [...this.userSocketMap.entries()].find(
      ([_, socketItem]) => socketItem === socket,
    )?.[0];
    if (user) {
      this.userSocketMap.delete(user);
      this.logger.log(`Socket for user ${user} disconnected.`);
      this.printConnections();
      this.sendError(user, 'Socket disconnected.');
    }
  }

  private printConnections() {
    const connectedSocketsInfo: string[] = [];

    this.userSocketMap.forEach((_, userId) => {
      connectedSocketsInfo.push(`User: ${userId}`);
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

  async callOpenAIChatCompletionAnd11LabsVoiceApi(
    client: Socket,
    prompt: Array<{ role: string; content: string }>,
    patient: Patient,
    sessionId: string,
  ) {
    try {
      const opResponse = await this.openAiUtil.getChatCompletionsStream(
        prompt,
        patient.openAiModel,
      );
      let textBuffer = Buffer.from([]);
      opResponse.data.on('data', (chunk) => {
        textBuffer = Buffer.concat([textBuffer, chunk]);
      });

      opResponse.data.on('end', async () => {
        const data = textBuffer
          .toString()
          .split('\n')
          .filter((s) => s != '' && !s.includes('[DONE]'))
          .map((t) => JSON.parse(t.slice(6, t.length)));

        const fullMessage = data
          .map((chunk) => chunk.choices[0].delta.content)
          .join('');

        const elResponse = await this.elevenLabsUtil.getAudioStream(
          fullMessage,
          patient.voiceId11Labs,
        );
        let audioBuffer = Buffer.from([]);
        elResponse.data.on('data', (chunk) => {
          audioBuffer = Buffer.concat([audioBuffer, chunk]);
        });

        elResponse.data.on('end', async () => {
          client.emit('RECEIVE_CHAT_COMPLETION', {
            msg: fullMessage,
            audioBuffer: audioBuffer.toString('base64'),
          });
        });
        elResponse.data.on('error', (error) => {
          this.logger.error(error);
          client.emit('ERROR', {
            msg: error.message,
          });
        });

        await this.chatsRepository.create({
          sessionId,
          role: 'assistant',
          content: fullMessage,
        } as Chat);
      });

      opResponse.data.on('error', (error) => {
        this.logger.error(error);
        client.emit('ERROR', {
          msg: error.message,
        });
      });
    } catch (error) {
      this.logger.error(error);
      client.emit('ERROR', {
        msg: error.message,
      });
      this.logger.error('Something went wrong. Please try again.');
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
    score: number = null,
  ) {
    const client = this.userSocketMap.get(userId);
    if (client) {
      client.emit('EVALUATION_REPORT_GENERATION_PROGRESS', {
        progress: percentage,
        score: score,
      });
    }
  }

  async sendError(userId: string, error: string) {
    const client = this.userSocketMap.get(userId);
    if (client) {
      client.emit('ERROR', {
        msg: error,
      });
    }
  }
}
