import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
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
import { socketEvents } from './socket.events';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

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

  @SubscribeMessage(socketEvents.registerSocket())
  async handleSocRegister(
    client: Socket,
    payload: { user: string },
  ): Promise<void> {
    try {
      const userId = payload.user;
      if (!userId) {
        throw new Error('User ID is null.');
      }

      const userExists = await this.usersRepository.exists({ userId: userId });
      if (!userExists) {
        throw new Error('User not found.');
      }

      const existingSocket = this.userSocketMap.get(userId);
      if (existingSocket && existingSocket !== client) {
        existingSocket.disconnect();
      }

      this.userSocketMap.set(userId, client);
      client.emit(socketEvents.registerSocketSuccess(), {
        msg: 'Connection established with the socket server.',
      });

      this.printConnections();
    } catch (error) {
      client.emit(socketEvents.error(), {
        msg: error.message,
      });
      this.logger.error(error);
    }
  }

  @SubscribeMessage(socketEvents.chatCompletion())
  async handleChatCompletion(
    client: Socket,
    payload: { content: string; sessionId: string },
    userId: string = null,
    isInitialMessage: boolean = false,
  ): Promise<void> {
    try {
      if (!client) client = this.userSocketMap.get(userId);
      if (!client) {
        throw new Error('Client not found.');
      }
      const { content, sessionId } = payload;
      if (!content || !sessionId) {
        throw new Error('Content or session ID is null.');
      }
      const sessionExists = await this.examSessionsRepository.exists({
        sessionId,
      });
      if (!sessionExists) {
        throw new Error('Session not found.');
      }

      const session = await this.examSessionsRepository.findOne({
        sessionId,
      });
      if (session.status !== ExamSessionStatus.ACTIVE) {
        throw new Error('Session is not active.');
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
        isInitialMessage,
      );
    } catch (error) {
      client.emit(socketEvents.error(), {
        msg: error.message,
      });
      this.logger.error(error);
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
    isInitialMessage: boolean,
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
          let chatCompletionEvent =
            socketEvents.receiveChatCompletion(sessionId);
          if (isInitialMessage)
            chatCompletionEvent = socketEvents.receiveFirstChatMessage();

          client.emit(chatCompletionEvent, {
            msg: fullMessage,
            audioBuffer: audioBuffer.toString('base64'),
          });
        });
        elResponse.data.on(socketEvents.error(), (error) => {
          this.logger.error(error);
          client.emit(socketEvents.error(), {
            msg: error.message,
          });
        });

        await this.chatsRepository.create({
          sessionId,
          role: 'assistant',
          content: fullMessage,
        } as Chat);

        const chatLogFilePath = join(cwd(), 'logs', sessionId, 'chat.log');
        const fileContent = readFileSync(chatLogFilePath);
        writeFileSync(
          chatLogFilePath,
          fileContent + `\nrole: assistant\ncontent: ${fullMessage}\n`,
        );
      });

      opResponse.data.on(socketEvents.error(), (error) => {
        this.logger.error(error);
        client.emit(socketEvents.error(), {
          msg: error.message,
        });
      });
    } catch (error) {
      this.logger.error(error);
      client.emit(socketEvents.error(), {
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
    const chatLogFilePath = join(cwd(), 'logs', session.sessionId, 'chat.log');
    const fileContent = readFileSync(chatLogFilePath);

    const prompt = getInitalPatientPrompt(user, patient);
    const chats = await this.chatsRepository.find(
      {
        sessionId: session.sessionId,
      },
      { limit: 10000, page: 1, sort: { created_at: 1 } },
    );
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

    if (!fileContent.length) {
      writeFileSync(
        chatLogFilePath,
        '********** Conversation transcript with all prompts to GPT **********\n\n',
      );
      writeFileSync(
        chatLogFilePath,
        prompt
          .map((p) => {
            return `role: ${p.role}\ncontent: ${p.content}\n`;
          })
          .join('\n'),
      );
    } else {
      writeFileSync(
        chatLogFilePath,
        fileContent + `\nrole: user\ncontent: ${newMessage}\n`,
      );
    }
    return prompt;
  }

  async sendEvaluationReportGenerationProgress(
    userId: string,
    percentage: string,
    score: number = null,
    sessionId: string,
  ) {
    const client = this.userSocketMap.get(userId);
    if (client) {
      client.emit(socketEvents.evaluationReportGenerationProgress(sessionId), {
        progress: percentage,
        score: score,
      });
    }
  }

  async sendError(userId: string, error: string) {
    const client = this.userSocketMap.get(userId);
    if (client) {
      client.emit(socketEvents.error(), {
        msg: error,
      });
    }
  }
}
