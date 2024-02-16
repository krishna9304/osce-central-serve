import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from 'src/user/schemas/user.schema';
import { ExamSessionsRepository } from './repositories/examSession.repository';
import {
  ExamSession,
  ExamSessionStatus,
  FindingStatus,
} from './schemas/session.schema';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { ConfigService } from '@nestjs/config';
import { ChatsRepository } from './repositories/chat.repository';
import { PatientRepository } from 'src/station/repositories/patient.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatService {
  constructor(
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly patientsRepository: PatientRepository,
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

    const stationExists = await this.stationsRepository.exists({
      stationId,
    });

    if (!stationExists) {
      throw new NotFoundException('Station does not exist.');
    }

    const patientExists = await this.patientsRepository.exists({
      associatedStation: stationId,
    });

    if (!patientExists) {
      throw new NotFoundException('No patient found for this station.');
    }

    const patient = await this.patientsRepository.findOne({
      associatedStation: stationId,
    });

    const examSessionData = {
      stationId,
      associatedUser: user.userId,
      findingsRecord: patient.findings.map((finding) => ({
        id: randomUUID(),
        finding: finding.name,
        value: finding.value,
        status: FindingStatus.PENDING,
      })),
    } as ExamSession;

    const createdExamSession =
      await this.examSessionsRepository.create(examSessionData);

    return createdExamSession;
  }

  async endExamSession(sessionId: string, user: User): Promise<void> {
    const sessionExists = await this.examSessionsRepository.exists({
      sessionId,
      associatedUser: user.userId,
      status: ExamSessionStatus.ACTIVE,
    });

    if (!sessionExists) {
      throw new BadRequestException(
        'Session does not exist or has already been completed.',
      );
    }

    try {
      await this.examSessionsRepository.findOneAndUpdate(
        {
          sessionId,
        },
        { status: ExamSessionStatus.COMPLETED },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        "Something went wrong. Coundn't end session.",
      );
    }
  }

  async trackFindingsRecord(
    sessionId: string,
    findingId: string,
    user: User,
  ): Promise<void> {
    const sessionExists = await this.examSessionsRepository.exists({
      sessionId,
      associatedUser: user.userId,
      status: ExamSessionStatus.ACTIVE,
    });

    if (!sessionExists) {
      throw new BadRequestException(
        'Session does not exist or has already been completed.',
      );
    }

    const session = await this.examSessionsRepository.findOne({
      sessionId,
    });

    const finding = session.findingsRecord.find(
      (record) => record.id === findingId,
    );

    if (!finding) {
      throw new NotFoundException('Finding not found.');
    }

    if (finding.status === FindingStatus.COMPLETED) {
      throw new BadRequestException('Finding already completed.');
    }

    try {
      await this.examSessionsRepository.findOneAndUpdate(
        {
          sessionId,
        },
        {
          $set: {
            'findingsRecord.$[elem].status': FindingStatus.COMPLETED,
          },
        },
        {
          arrayFilters: [{ 'elem.id': findingId }],
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        error.message ||
          "Something went wrong. Coundn't update findings record.",
      );
    }
  }
}
