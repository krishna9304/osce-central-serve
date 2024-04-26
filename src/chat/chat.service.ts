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
import { SubscriptionsRepository } from 'src/stripe/repositories/subscription.repository';
import { PlansRepository } from 'src/stripe/repositories/plan.repository';
import { PlanType } from 'src/stripe/schemas/plan.schema';

@Injectable()
export class ChatService {
  constructor(
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly patientsRepository: PatientRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly plansRepository: PlansRepository,
  ) {}

  async checkUsableCreditsAndEligibility(
    user: User,
    stationId: string,
  ): Promise<Array<any>> {
    const subscription = await this.subscriptionsRepository.findOne({
      userId: user.userId,
    });

    const plan = await this.plansRepository.findOne({
      planId: subscription.planId,
    });

    const examSessions = await this.examSessionsRepository.find({
      associatedUser: user.userId,
      startTime: {
        $gte: subscription.subscriptionStart,
        $lte: subscription.subscriptionEnd,
      },
    });

    if (
      examSessions.length >=
      plan.numberOfStations + subscription.additionalStationsBought
    ) {
      return [false, 'No more sessions left. Please upgrade your plan.'];
    }

    const station = await this.stationsRepository.findOne({
      stationId,
    });

    if (plan.planType === PlanType.FREE && !station.freeTierEligible) {
      return [false, 'Station not available in free tier. Please upgrade your plan'];
    }

    return [true, ''];
  }

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

    const isEligible = await this.checkUsableCreditsAndEligibility(
      user,
      stationId,
    );
    if (!isEligible[0]) throw new ForbiddenException(isEligible[1]);

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

  async getSessionList(user: User): Promise<ExamSession[]> {
    try {
      const sessions = await this.examSessionsRepository.find({
        associatedUser: user.userId,
      });

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
