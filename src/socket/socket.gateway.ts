import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import axios from 'axios';
import { Server, Socket } from 'socket.io';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { Chat } from 'src/chat/schemas/chat.schema';
import { ExamSessionStatus } from 'src/chat/schemas/session.schema';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { Station } from 'src/station/schemas/station.schema';

@WebSocketGateway()
export class SocketGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, Socket>();
  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly configService: ConfigService,
  ) {}

  handleDisconnect(client: Socket): void {
    this.removeSocketFromMap(client);
  }

  @SubscribeMessage('CHAT_COMPLETION')
  async handleChatCompletion(
    client: Socket,
    payload: { content: string; sessionId: string },
  ): Promise<void> {
    const { content, sessionId } = payload;
    console.log(typeof payload, content, sessionId);

    const session = await this.examSessionsRepository.findOne({
      sessionId,
    });

    if (!session) {
      this.logger.log('Session not found.');
    }

    if (session.status !== ExamSessionStatus.ACTIVE) {
      this.logger.log('Session is not active.');
    }

    const station = await this.stationsRepository.findOne({
      stationId: session.stationId,
    });

    await this.chatsRepository.create({
      sessionId,
      role: 'user',
      content,
    } as Chat);

    const fullMessage = await this.callOpenAIChatCompletionApi(
      client,
      content,
      station,
      sessionId,
    );

    await this.chatsRepository.create({
      sessionId,
      role: 'assistant',
      content: fullMessage,
    } as Chat);
  }

  @SubscribeMessage('REG_SOC')
  handleSocRegister(client: Socket, payload: { user: string }): void {
    const user = payload.user;
    const existingSocket = this.userSocketMap.get(user);

    if (existingSocket && existingSocket !== client) {
      existingSocket.disconnect();
    }

    this.userSocketMap.set(user, client);

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
    content: string,
    stationData: Station,
    sessionId: string,
  ) {
    const chats = await this.chatsRepository.find({
      sessionId,
    });

    const history = chats.map((chat) => {
      return {
        role: chat.role,
        content: chat.content,
      };
    });

    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.get<string>(
        'OPENAI_API_KEY',
      )}`,
    };
    console.log(history);

    const body = {
      messages: [
        {
          role: 'system',
          content: stationData.patientPrompt,
        },
        ...history,
        {
          role: 'user',
          content: content,
        },
      ],
      model: stationData.deployedModelId,
      max_tokens: 150,
      temperature: 0.9,
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

      return fullMessage.join('');
    } catch (error) {
      console.log(error);
      this.logger.log('Something went wrong. Please try again.');
    }
  }
}
