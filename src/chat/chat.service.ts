import {
  BadRequestException,
  ForbiddenException,
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
  FindingsRecord,
} from './schemas/session.schema';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { PatientRepository } from 'src/station/repositories/patient.repository';
import { randomUUID } from 'crypto';
import { AzureBlobUtil } from 'src/utils/azureblob.util';
import { EvaluationRepository } from 'src/station/repositories/evaluation.repository';
import { StripeService } from 'src/stripe/stripe.service';
import { StationService } from 'src/station/station.service';
import { initialSessionMessageFromTheUser } from './constants/prompt';

@Injectable()
export class ChatService {
  constructor(
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly patientsRepository: PatientRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
    private readonly stripeService: StripeService,
    private readonly stationService: StationService,
  ) {}

  async startExamSession(
    stationId: string,
    user: User,
  ): Promise<
    ExamSession & {
      metadata: {
        patientName: string;
        stationName: string;
        patientAge: string;
        patientSex: string;
        avatar: string;
      };
    }
  > {
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

    const eligibility =
      await this.stripeService.checkUsableCreditsAndEligibility(user);
    if (!eligibility.eligibleRecharge)
      throw new ForbiddenException(eligibility.message);

    const patientExists = await this.patientsRepository.exists({
      associatedStation: stationId,
    });

    if (!patientExists) {
      throw new NotFoundException('No patient found for this station.');
    }

    const patient = await this.patientsRepository.findOne({
      associatedStation: stationId,
    });

    const patientFindings: FindingsRecord[] = [];
    for await (const finding of patient.findings) {
      if (finding.image) {
        finding.image = await this.azureBlobUtil.getTemporaryPublicUrl(
          finding.image,
        );
      }
      patientFindings.push({
        id: randomUUID(),
        finding: finding.name,
        value: finding.value,
        image: finding.image,
        marks: finding.marks,
        subcategory: finding.subcategory,
        status: FindingStatus.PENDING,
      });
    }

    const examSessionData = {
      stationId,
      associatedUser: user.userId,
      findingsRecord: patientFindings,
    } as ExamSession;

    const createdExamSession =
      await this.examSessionsRepository.create(examSessionData);
    const sessionDeducted = await this.stripeService.deductSessionFromRecharge(
      eligibility.eligibleRecharge,
    );
    if (!sessionDeducted) {
      this.examSessionsRepository.deleteOne({
        sessionId: createdExamSession.sessionId,
      });
      throw new InternalServerErrorException(
        "Something went wrong. Coundn't start session.",
      );
    }

    this.stationService.emitMessage(
      {
        content: initialSessionMessageFromTheUser,
        sessionId: createdExamSession.sessionId,
      },
      user.userId,
    );

    return {
      ...createdExamSession,
      metadata: {
        patientName: patient.patientName,
        stationName: stationId,
        patientAge: patient.age,
        patientSex: patient.sex,
        avatar: patient.avatar
          ? await this.azureBlobUtil.getTemporaryPublicUrl(patient.avatar)
          : null,
      },
    };
  }

  async endExamSession(sessionId: string, user: User): Promise<void> {
    const sessionExists = await this.examSessionsRepository.exists({
      sessionId,
      associatedUser: user.userId,
      status: ExamSessionStatus.ACTIVE,
    });

    if (!sessionExists)
      throw new BadRequestException(
        'Session does not exist or has already been completed.',
      );

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

  async getSessionDetails(sessionId: string, user: User): Promise<ExamSession> {
    const sessionExists = await this.examSessionsRepository.exists({
      sessionId,
      associatedUser: user.userId,
    });

    if (!sessionExists) {
      throw new NotFoundException('Session not found.');
    }

    try {
      const session = await this.examSessionsRepository.findOne({
        sessionId,
        associatedUser: user.userId,
      });

      const patient = await this.patientsRepository.findOne({
        associatedStation: session.stationId,
      });
      const station = await this.stationsRepository.findOne({
        stationId: session.stationId,
      });

      session.metadata = {
        patientName: patient.patientName,
        stationName: station.stationName,
        patientAge: patient.age,
        patientSex: patient.sex,
        avatar: patient.avatar
          ? await this.azureBlobUtil.getTemporaryPublicUrl(patient.avatar)
          : null,
      };

      return session;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || "Something went wrong. Coundn't get session details.",
      );
    }
  }

  async getSessionList(
    user: User,
    page: number,
    limit: number,
  ): Promise<ExamSession[]> {
    try {
      const sessions = await this.examSessionsRepository.find(
        {
          associatedUser: user.userId,
        },
        {
          limit,
          page,
          sort: {
            created_at: -1,
          },
        },
      );

      const sessionsWithPatientDetails = [];
      for await (const session of sessions) {
        const patient = await this.patientsRepository.findOne({
          associatedStation: session.stationId,
        });
        const station = await this.stationsRepository.findOne({
          stationId: session.stationId,
        });
        const evaluationExists = await this.evaluationRepository.exists({
          associatedSession: session.sessionId,
        });
        sessionsWithPatientDetails.push({
          ...session,
          metadata: {
            patientName: patient.patientName,
            stationName: station.stationName,
            patientAge: patient.age,
            patientSex: patient.sex,
            avatar: patient.avatar
              ? await this.azureBlobUtil.getTemporaryPublicUrl(patient.avatar)
              : null,
            evaluated: evaluationExists ? true : false,
          },
        });
      }

      return sessionsWithPatientDetails;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || "Something went wrong. Coundn't get session list.",
      );
    }
  }
}
