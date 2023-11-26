import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from 'src/user/schemas/user.schema';
import { ExamSessionsRepository } from './repositories/examSession.repository';
import { ExamSession, ExamSessionStatus } from './schemas/session.schema';
import { Chat } from './schemas/chat.schema';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import OpenAI from 'openai';
import { CreateChatRequest } from './dto/create-chat.request';

@Injectable()
export class ChatService {
  constructor(
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly configService: ConfigService,
  ) {}

  async startExamSession(stationId: string, user: User): Promise<ExamSession> {
    const sessionExists = await this.examSessionsRepository.exists({
      associatedUser: user.userId,
      status: ExamSessionStatus.ACTIVE,
    });

    if (sessionExists) {
      throw new BadRequestException(
        'Session already exists. Please complete the current session before starting a new one.',
      );
    }

    const examSessionData = {
      stationId,
      associatedUser: user.userId,
    } as ExamSession;
    const createdExamSession =
      await this.examSessionsRepository.create(examSessionData);

    return createdExamSession;
  }

  async chatCompletion(
    user: User,
    sessionId: string,
    request: CreateChatRequest,
  ): Promise<void> {
    const session = await this.examSessionsRepository.findOne({
      sessionId,
    });

    if (!session) {
      throw new BadRequestException('Session not found. Please try again.');
    }

    if (session.status !== ExamSessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Session is not active. Please start a new session.',
      );
    }

    if (session.associatedUser !== user.userId) {
      throw new BadRequestException(
        'You are not associated with this session. Please try again.',
      );
    }

    const stationData = await this.stationsRepository.findOne({
      stationId: session.stationId,
    });

    // await this.callOpenAIChatCompletionApi(stationData);

    const openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: request.content }],
      model: stationData.deployedModelId,
      max_tokens: 150,
      temperature: 0.9,
      stream: true,
      stop: ['\n'],
    });

    console.log(chatCompletion);
  }

  async callOpenAIChatCompletionApi(stationData) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.get<string>(
        'OPENAI_API_KEY',
      )}`,
    };

    const body = {
      prompt: stationData.patientPrompt,
      max_tokens: 150,
      temperature: 0.9,
      stream: true,
    };

    const response = await axios.post(url, body, { headers });

    const decoder = new TextDecoder();

    for await (const chunk of response.data) {
      const decodedChunk = decoder.decode(chunk);

      const lines = decodedChunk
        .split('\n')
        .map((line) => line.replace('data: ', ''))
        .filter((line) => line.length > 0)
        .filter((line) => line !== '[DONE]')
        .map((line) => JSON.parse(line));

      for (const line of lines) {
        const {
          choices: [
            {
              delta: { content },
            },
          ],
        } = line;

        if (content) {
          console.log(content);
        }
      }
    }
  }
}
