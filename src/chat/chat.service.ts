import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from 'src/user/schemas/user.schema';
import { ExamSessionsRepository } from './repositories/examSession.repository';
import { ExamSession, ExamSessionStatus } from './schemas/session.schema';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { ConfigService } from '@nestjs/config';
import { ChatsRepository } from './repositories/chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly chatRepository: ChatsRepository,
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
}
