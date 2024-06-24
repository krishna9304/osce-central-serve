import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateStationRequest } from './dto/create-station.request';
import { StationsRepository } from './repositories/station.repository';
import { AzureBlobUtil } from 'src/utils/azureblob.util';
import { CreateStreamRequest } from './dto/create-stream.request';
import { CreateCategoryRequest } from './dto/create-category.request';
import { CreatePatientRequest } from './dto/create-patient.request';
import { CreateEvaluatorRequest } from './dto/create-evaluator.request';
import { StreamRepository } from './repositories/stream.repository';
import { StationCategoryRepository } from './repositories/category.repository';
import { PatientRepository } from './repositories/patient.repository';
import { EvaluatorRepository } from './repositories/evaluator.repository';
import { Stream } from './schemas/stream.schema';
import { StationCategory } from './schemas/category.schema';
import { Station } from './schemas/station.schema';
import { Patient, SubCategoryType } from './schemas/patient.schema';
import { Evaluator } from './schemas/evaluator.schema';
import {
  getEvaluatorSystemPromptForClinicalChecklist,
  getEvaluatorSystemPromptForNonClinicalChecklist,
} from 'src/chat/constants/prompt';
import { User } from 'src/user/schemas/user.schema';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import {
  ExamSession,
  ExamSessionStatus,
  FindingStatus,
} from 'src/chat/schemas/session.schema';
import { EvaluationRepository } from './repositories/evaluation.repository';
import {
  ClinicalChecklistMarkingItem,
  Evaluation,
  NonClinicalChecklistMarkingItem,
} from './schemas/evaluation.schema';
import { SocketService } from 'src/socket/socket.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { OpenAiUtil } from 'src/utils/openai.util';
import { StripeService } from 'src/stripe/stripe.service';

@Injectable()
export class StationService {
  constructor(
    private readonly stationRepository: StationsRepository,
    private readonly streamRepository: StreamRepository,
    private readonly stationCategoryRepository: StationCategoryRepository,
    private readonly patientRepository: PatientRepository,
    private readonly evaluatorRepository: EvaluatorRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
    private readonly openAiUtil: OpenAiUtil,
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly chatsRepository: ChatsRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly socketService: SocketService,
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
  ) {}

  async createStream(streamRequestData: CreateStreamRequest) {
    try {
      await this.streamRepository.create({
        ...streamRequestData,
      } as Stream);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Kindly check the request parameters and abide by the constraints.',
      );
    }
  }
  async createCategory(categoryRequestData: CreateCategoryRequest) {
    const { associatedStream } = categoryRequestData;
    const streamExists = await this.streamRepository.exists({
      streamId: associatedStream,
    });

    if (!streamExists)
      throw new NotFoundException(
        'Provided stream ID is invalid and does not match our records.',
      );
    try {
      await this.stationCategoryRepository.create({
        ...categoryRequestData,
      } as StationCategory);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Kindly check the request parameters and abide by the constraints.',
      );
    }
  }
  async createStation(stationRequestData: CreateStationRequest) {
    const { stationCategory } = stationRequestData;
    const categoryExists = await this.stationCategoryRepository.exists({
      categoryId: stationCategory,
    });

    if (!categoryExists)
      throw new NotFoundException(
        'Provided category ID is invalid and does not match our records.',
      );
    try {
      const stripeProduct = await this.stripeService.createStationProduct(
        stationRequestData as Station,
      );
      await this.stationRepository.create({
        ...stationRequestData,
        stripeProductId: stripeProduct.id,
      } as Station);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  validateFindings(findings: any): string[] {
    const errors = [];
    if (typeof findings.name !== 'string' || findings.name.trim() === '')
      errors.push('Validation Error: "name" must be a non-empty string.');

    if (typeof findings.marks !== 'number')
      errors.push('Validation Error: "marks" must be a number.');

    if (
      findings.subcategory === undefined ||
      !Object.values(SubCategoryType).includes(findings.subcategory)
    )
      errors.push(
        `Validation Error: "subcategory" must be one of the following values: ${Object.values(
          SubCategoryType,
        ).join(', ')}.`,
      );

    if (
      (findings.image && findings.value) ||
      (!findings.image && !findings.value)
    )
      errors.push(
        'Validation Error: Either "image" or "value" must be present, but not both.',
      );

    if (findings.value) {
      if (
        !Array.isArray(findings.value) ||
        (findings.value.length > 0 &&
          !findings.value.every(
            (item) =>
              typeof item.key === 'string' && typeof item.value === 'string',
          ))
      ) {
        errors.push(
          'Validation Error: "value" must be an array of { key: string, value: string }.' +
            findings.name,
        );
      }
    }

    if (findings.image !== undefined && typeof findings.image !== 'string')
      errors.push('Validation Error: "image" must be a string when provided.');

    return errors;
  }

  async createPatient(
    patientRequestData: CreatePatientRequest,
    avatar: Express.Multer.File,
  ) {
    const { associatedStation } = patientRequestData;
    const stationExists = await this.stationRepository.exists({
      stationId: associatedStation,
    });

    if (!stationExists)
      throw new NotFoundException(
        'Provided station ID is invalid and does not match our records.',
      );

    const patientExists = await this.patientRepository.exists({
      associatedStation,
    });

    if (patientExists)
      throw new BadRequestException(
        'Patient already exists for the provided station.',
      );

    if (avatar) {
      const avatarUploadName = await this.azureBlobUtil.uploadImage(avatar);
      patientRequestData.avatar = avatarUploadName;
    }

    if (patientRequestData.findings) {
      if (!Array.isArray(patientRequestData.findings)) {
        throw new BadRequestException('Findings must be an array of objects.');
      }

      if (patientRequestData.findings.length > 0) {
        for (const finding of patientRequestData.findings) {
          const errs = this.validateFindings(finding);
          if (errs.length) {
            throw new BadRequestException(
              `Invalid findings object. ${errs.join(' ')}`,
            );
          }
        }
      }
    }
    try {
      await this.patientRepository.create({
        ...patientRequestData,
      } as Patient);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  validateCLinicalChecklist(clinicalChecklist: any): string[] {
    const errors = [];
    if (typeof clinicalChecklist.question !== 'string')
      errors.push('Validation Error: "question" must be a string.');

    if (typeof clinicalChecklist.marks !== 'number')
      errors.push('Validation Error: "marks" must be a number.');

    return errors;
  }

  async createEvaluator(evaluatorRequestData: CreateEvaluatorRequest) {
    const { associatedStation } = evaluatorRequestData;

    const stationExists = await this.stationRepository.exists({
      stationId: associatedStation,
    });

    if (!stationExists)
      throw new NotFoundException(
        'Provided station ID is invalid and does not match our records.',
      );

    const evaluatorExists = await this.evaluatorRepository.exists({
      associatedStation,
    });

    if (evaluatorExists)
      throw new BadRequestException(
        'Evaluator already exists for the provided station.',
      );

    if (evaluatorRequestData.clinicalChecklist) {
      if (!Array.isArray(evaluatorRequestData.clinicalChecklist)) {
        throw new BadRequestException(
          'Clinical Checklist must be an array of objects.',
        );
      }

      if (evaluatorRequestData.clinicalChecklist.length > 0) {
        for (const clinicalChecklist of evaluatorRequestData.clinicalChecklist) {
          const errs = this.validateCLinicalChecklist(clinicalChecklist);
          if (errs.length) {
            throw new BadRequestException(
              `Invalid clinical checklist object. ${errs.join(' ')}`,
            );
          }
        }
      }
    }

    try {
      await this.evaluatorRepository.create({
        ...evaluatorRequestData,
      } as Evaluator);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  async getStreams(
    streamIds: string | null,
    page: number,
    limit: number,
  ): Promise<Stream[]> {
    try {
      let streams: Stream[] = [];
      if (!streamIds)
        streams = await this.streamRepository.find(
          {},
          { page, limit, sort: { created_at: -1 } },
        );
      else {
        const listOfstreamIds = streamIds.split(',');
        streams = await this.streamRepository.find(
          {
            streamId: { $in: listOfstreamIds },
          },
          { page, limit, sort: { created_at: -1 } },
        );
      }
      return streams;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching streams.',
      );
    }
  }

  async getCategories(
    categoryIds: string | null,
    page: number,
    limit: number,
  ): Promise<StationCategory[]> {
    try {
      let categories: StationCategory[] = [];
      if (!categoryIds)
        categories = await this.stationCategoryRepository.find(
          {},
          { page, limit, sort: { created_at: -1 } },
        );
      else {
        const listOfCategoryIds = categoryIds.split(',');
        categories = await this.stationCategoryRepository.find(
          {
            categoryId: { $in: listOfCategoryIds },
          },
          { page, limit, sort: { created_at: -1 } },
        );
      }
      return categories;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching categories.',
      );
    }
  }

  async getStations(
    stationIds: string | null,
    page: number,
    limit: number,
  ): Promise<Station[]> {
    try {
      let stations: Station[] = [];
      if (!stationIds)
        stations = await this.stationRepository.find(
          {},
          { page, limit, sort: { created_at: -1 } },
        );
      else {
        const listOfStationIds = stationIds.split(',');
        stations = await this.stationRepository.find(
          {
            stationId: { $in: listOfStationIds },
          },
          { page, limit, sort: { created_at: -1 } },
        );
      }
      return stations;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching stations.',
      );
    }
  }

  async getPatients(
    patientIds: string | null,
    page: number,
    limit: number,
  ): Promise<Patient[]> {
    try {
      let patientDocs: Patient[] = [];
      if (!patientIds)
        patientDocs = await this.patientRepository.find(
          {},
          { page, limit, sort: { created_at: -1 } },
        );
      else {
        const listOfPatientIds = patientIds.split(',');
        patientDocs = await this.patientRepository.find(
          {
            patientId: { $in: listOfPatientIds },
          },
          { page, limit, sort: { created_at: -1 } },
        );
      }

      for await (const patient of patientDocs) {
        if (patient.avatar) {
          const avatarURL = await this.azureBlobUtil.getTemporaryPublicUrl(
            patient.avatar,
          );
          patient.avatar = avatarURL;
        }
      }

      return patientDocs;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching patients.',
      );
    }
  }

  async getEvaluators(
    evaluatorIds: string | null,
    page: number,
    limit: number,
  ): Promise<Evaluator[]> {
    try {
      let evaluators: Evaluator[] = [];
      if (!evaluatorIds)
        evaluators = await this.evaluatorRepository.find(
          {},
          { page, limit, sort: { created_at: -1 } },
        );
      else {
        const listOfEvaluatorIds = evaluatorIds.split(',');
        evaluators = await this.evaluatorRepository.find(
          {
            evaluatorId: { $in: listOfEvaluatorIds },
          },
          { page, limit, sort: { created_at: -1 } },
        );
      }
      return evaluators;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching evaluators.',
      );
    }
  }

  async listCategories(
    streamId: string,
    page: number,
    limit: number,
  ): Promise<StationCategory[]> {
    const streamExists = await this.streamRepository.exists({
      streamId,
    });

    if (!streamExists)
      throw new NotFoundException(
        'Provided stream ID is invalid and does not match our records.',
      );
    try {
      const categories = await this.stationCategoryRepository.find(
        {
          associatedStream: streamId,
        },
        {
          page,
          limit,
        },
      );

      return categories;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching categories.',
      );
    }
  }

  async listStations(
    categoryId: string,
    user: User,
    page: number,
    limit: number,
  ): Promise<Station[]> {
    const categoryExists = await this.stationCategoryRepository.exists({
      categoryId,
    });

    if (!categoryExists)
      throw new NotFoundException(
        'Provided category ID is invalid and does not match our records.',
      );
    try {
      let stations = [];
      if (user.role === 'admin') {
        stations = await this.stationRepository.find(
          {
            stationCategory: categoryId,
          },
          {
            page,
            limit,
          },
        );
      } else {
        stations = await this.stationRepository.find(
          {
            stationCategory: categoryId,
            status: 'active',
          },
          {
            page,
            limit,
          },
        );
      }
      const stationIds = stations.map((station) => station.stationId);
      const patients = await this.patientRepository.find({
        associatedStation: { $in: stationIds },
      });

      let stationsWithMetadata = [];
      for await (let station of stations) {
        const stationPatients = patients.filter(
          (patient) => patient.associatedStation === station.stationId,
        );
        if (stationPatients.length) {
          stationsWithMetadata.push({
            ...station,
            metadata: {
              patientName: stationPatients[0]['patientName'],
              patientAge: stationPatients[0]['age'],
              patientSex: stationPatients[0]['sex'],
              patientAvatar: stationPatients[0]['avatar']
                ? await this.azureBlobUtil.getTemporaryPublicUrl(
                    stationPatients[0]['avatar'],
                  )
                : null,
            },
          });
        } else {
          stationsWithMetadata.push(station);
        }
      }

      return stationsWithMetadata;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching stations.',
      );
    }
  }

  async patientDetails(stationId: string): Promise<Patient> {
    const stationExists = await this.stationRepository.exists({
      stationId,
    });

    if (!stationExists)
      throw new NotFoundException(
        'Provided station ID is invalid and does not match our records.',
      );

    try {
      const patient = await this.patientRepository.findOne({
        associatedStation: stationId,
      });

      if (patient.avatar) {
        const avatarURL = await this.azureBlobUtil.getTemporaryPublicUrl(
          patient.avatar,
        );
        patient.avatar = avatarURL;
      }

      return patient;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching patient details.',
      );
    }
  }

  async evaluatorDetails(stationId: string): Promise<Evaluator> {
    const stationExists = await this.stationRepository.exists({
      stationId,
    });

    if (!stationExists)
      throw new NotFoundException(
        'Provided station ID is invalid and does not match our records.',
      );
    try {
      const evaluator = await this.evaluatorRepository.findOne({
        associatedStation: stationId,
      });

      return evaluator;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching evaluator details.',
      );
    }
  }

  async getEvaluationResults(sessionId: string, user: User): Promise<void> {
    const sessionExists = await this.examSessionsRepository.exists({
      sessionId,
    });

    if (!sessionExists)
      throw new NotFoundException(
        'Provided session ID is invalid and does not match our records.',
      );

    const session = await this.examSessionsRepository.findOne({
      sessionId,
    });

    if (session.status !== ExamSessionStatus.COMPLETED)
      throw new BadRequestException(
        'Session is not completed yet. Please try again after some time.',
      );

    const evaluationExists = await this.evaluationRepository.exists({
      associatedSession: sessionId,
    });

    if (evaluationExists)
      throw new BadRequestException(
        'Evaluation report is already generated for this session.',
      );

    const station = await this.stationRepository.findOne({
      stationId: session.stationId,
    });

    this.prepareEvaluationResultsInBackgrond(
      session,
      user.userId,
      user.name,
      station,
    );
  }

  async prepareEvaluationResultsInBackgrond(
    session: ExamSession,
    userId: string,
    userName: string,
    station: Station,
  ): Promise<void> {
    let totalEvaluationProgressPercentage = 10;
    this.socketService.updateReportGenerationProgress(
      userId,
      totalEvaluationProgressPercentage + '%',
    );

    totalEvaluationProgressPercentage += 2;
    this.socketService.updateReportGenerationProgress(
      userId,
      totalEvaluationProgressPercentage + '%',
    );

    totalEvaluationProgressPercentage += 2;
    const patient = await this.patientRepository.findOne({
      associatedStation: session.stationId,
    });

    this.socketService.updateReportGenerationProgress(
      userId,
      totalEvaluationProgressPercentage + '%',
    );
    const evaluator = await this.evaluatorRepository.findOne({
      associatedStation: session.stationId,
    });

    totalEvaluationProgressPercentage += 2;
    this.socketService.updateReportGenerationProgress(
      userId,
      totalEvaluationProgressPercentage + '%',
    );
    const chats = await this.chatsRepository.find({
      sessionId: session.sessionId,
    });

    chats.sort((a, b) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    totalEvaluationProgressPercentage += 10;
    this.socketService.updateReportGenerationProgress(
      userId,
      totalEvaluationProgressPercentage + '%',
    );

    const evaluateServerURL =
      this.configService.get<string>('EVALUATION_API_URL');

    const userFirstName = userName.split(' ')[0];

    const evaluatorSystemPromptForClinicalChecklist =
      getEvaluatorSystemPromptForClinicalChecklist(
        userFirstName,
        patient.patientName,
        chats,
        evaluator.initialEvaluationPrompt,
        evaluator.additionalInstructions,
      );

    try {
      // ****************Clinical Checklist Marking***************
      let totalClinicalMarks = 0;
      let securedMarks = 0;
      let userPromptPrefix = `Hi expert medical evaluator, Please tell me whether the following activity happened during the consultation 
      between Dr. ${userFirstName} and ${patient.patientName} in either "Yes" or "No" (Yes, if it happend. No, if it didn't). 
      Please be very accurate when you choose one because this will determine how did the doctor perform the consultation: \n`;

      const markedClinicalChecklist: Array<ClinicalChecklistMarkingItem> = [];
      for await (const clinicalChecklistItem of evaluator.clinicalChecklist) {
        const evaluatorUserPrompt =
          userPromptPrefix + clinicalChecklistItem.question;
        const options = ['Yes', 'No'];
        const res = await axios.post(evaluateServerURL, {
          systemPrompt: evaluatorSystemPromptForClinicalChecklist,
          userPrompt: evaluatorUserPrompt,
          options,
        });

        totalEvaluationProgressPercentage += 0.75;
        this.socketService.updateReportGenerationProgress(
          userId,
          totalEvaluationProgressPercentage + '%',
        );

        markedClinicalChecklist.push({
          question: clinicalChecklistItem.question,
          score: res.data.data === 'Yes' ? clinicalChecklistItem.marks : 0,
        });
        totalClinicalMarks += clinicalChecklistItem.marks;
        securedMarks +=
          res.data.data === 'Yes' ? clinicalChecklistItem.marks : 0;
      }
      this.socketService.updateReportGenerationProgress(userId, '60%');

      // **************Non-Clinical Checklist Marking*************
      const evaluatorSystemPromptForNonClinicalChecklist =
        getEvaluatorSystemPromptForNonClinicalChecklist(
          userFirstName,
          patient.patientName,
          chats,
          evaluator.initialEvaluationPrompt,
          evaluator.nonClinicalChecklist,
          evaluator.additionalInstructions,
        );
      userPromptPrefix = `Dear expert medical evaluator. Please give your remark in brief, if I ask you to evaluate the consultation between Dr. ${userFirstName} and ${patient.patientName}: \n`;
      const markedNonClinicalChecklist: Array<NonClinicalChecklistMarkingItem> =
        [];
      for await (const nonClinicalChecklistItem of evaluator.nonClinicalChecklist) {
        const evaluatorUserPrompt =
          userPromptPrefix +
          `Give remarks/feedback for the judging criteria - "${nonClinicalChecklistItem.label}"`;
        const evalRemark = await this.openAiUtil.getChatCompletion(
          [
            {
              role: 'system',
              content: evaluatorSystemPromptForNonClinicalChecklist,
            },
            {
              role: 'user',
              content: evaluatorUserPrompt,
            },
          ],
          evaluator.openAiModel,
        );

        totalEvaluationProgressPercentage += 2;
        this.socketService.updateReportGenerationProgress(
          userId,
          totalEvaluationProgressPercentage + '%',
        );

        markedNonClinicalChecklist.push({
          label: nonClinicalChecklistItem.label,
          remark: evalRemark,
        });
      }
      // ********************Findings Marking**********************

      let totalFindingsMarks = 0;
      for (const finding of session.findingsRecord) {
        totalFindingsMarks += finding.marks;
        if (finding.status === FindingStatus.COMPLETED) {
          securedMarks += finding.marks;
        }
      }
      // **************Evaluation Report Generation***************

      totalEvaluationProgressPercentage += 5;
      this.socketService.updateReportGenerationProgress(
        userId,
        totalEvaluationProgressPercentage + '%',
      );
      const totalSecurableMarks = totalClinicalMarks + totalFindingsMarks;
      const securedMarksOutOf12 = (securedMarks / totalSecurableMarks) * 12;

      await this.evaluationRepository.create({
        associatedSession: session.sessionId,
        stationName: station.stationName,
        clinicalChecklist: markedClinicalChecklist,
        nonClinicalChecklist: markedNonClinicalChecklist,
        marksObtained: securedMarksOutOf12,
      } as Evaluation);

      this.socketService.updateReportGenerationProgress(
        userId,
        '100%',
        securedMarksOutOf12,
      );
    } catch (error) {
      this.socketService.updateReportGenerationProgress(userId, '100%', 0);
      this.socketService.throwError(
        userId,
        'Evaluation report generation failed',
      );
      console.error(
        'There is some error caused while producing the evaluation',
        error,
      );
    }
  }

  async getEvaluationReport(
    sessionId: string,
    user: User,
  ): Promise<Evaluation> {
    const sessionExists = await this.examSessionsRepository.exists({
      sessionId,
    });

    if (!sessionExists)
      throw new NotFoundException(
        'Provided session ID is invalid and does not match our records.',
      );

    const session = await this.examSessionsRepository.findOne({
      sessionId,
    });

    if (session.associatedUser !== user.userId)
      throw new BadRequestException(
        'You are not authorized to access this resource.',
      );

    if (session.status !== ExamSessionStatus.COMPLETED)
      throw new BadRequestException(
        'Session is not completed yet. Please try again after some time.',
      );

    const evaluationExists = await this.evaluationRepository.exists({
      associatedSession: sessionId,
    });

    if (!evaluationExists)
      throw new BadRequestException(
        'Evaluation report is not generated for this session yet.',
      );

    const evaluation = await this.evaluationRepository.findOne({
      associatedSession: sessionId,
    });

    const station = await this.stationRepository.findOne({
      stationId: session.stationId,
    });

    const patient = await this.patientRepository.findOne({
      associatedStation: session.stationId,
    });

    evaluation.metadata = {
      patientId: patient.patientId,
      patientName: patient.patientName,
      patientAge: patient.age,
      patientSex: patient.sex,
      candidateInstructions: station.candidateInstructions,
      patientAvatar: patient.avatar
        ? await this.azureBlobUtil.getTemporaryPublicUrl(patient.avatar)
        : null,
    };

    return evaluation;
  }

  async updateStation(
    stationId: string,
    stationRequestData: Partial<CreateStationRequest>,
  ): Promise<Station> {
    try {
      const updatedStation = await this.stationRepository.findOneAndUpdate(
        { stationId },
        {
          $set: { ...stationRequestData, updated_at: Date.now() },
        },
      );
      return updatedStation;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to update the station. Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  async updateStream(
    streamId: string,
    streamRequestData: Partial<CreateStreamRequest>,
  ): Promise<Stream> {
    try {
      const updatedStream = await this.streamRepository.findOneAndUpdate(
        { streamId },
        {
          $set: { ...streamRequestData, updated_at: Date.now() },
        },
      );
      return updatedStream;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to update the stream. Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  async updateCategory(
    categoryId: string,
    categoryRequestData: Partial<CreateCategoryRequest>,
  ): Promise<StationCategory> {
    try {
      const updatedCategory =
        await this.stationCategoryRepository.findOneAndUpdate(
          { categoryId },
          {
            $set: {
              ...categoryRequestData,
              updated_at: Date.now(),
            },
          },
        );
      return updatedCategory;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to update the category. Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  async updatePatient(
    patientId: string,
    patientRequestData: Partial<CreatePatientRequest>,
    avatar: Express.Multer.File,
  ): Promise<Patient> {
    try {
      if (patientRequestData.associatedStation) {
        const stationExists = await this.stationRepository.exists({
          stationId: patientRequestData.associatedStation,
        });

        if (!stationExists)
          throw new NotFoundException(
            'Provided station ID is invalid and does not match our records.',
          );

        const patientExists = await this.patientRepository.exists({
          associatedStation: patientRequestData.associatedStation,
        });

        if (patientExists)
          throw new BadRequestException(
            'Patient already exists for the provided station Id. Please try with another station Id.',
          );
      }
      if (avatar) {
        const avatarUploadName = await this.azureBlobUtil.uploadImage(avatar);
        patientRequestData.avatar = avatarUploadName;
      }

      const updatedPatient = await this.patientRepository.findOneAndUpdate(
        { patientId },
        {
          $set: { ...patientRequestData, updated_at: Date.now() },
        },
      );
      return updatedPatient;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to update the patient. Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  async updateEvaluator(
    evaluatorId: string,
    evaluatorRequestData: Partial<CreateEvaluatorRequest>,
  ): Promise<Evaluator> {
    try {
      if (evaluatorRequestData.associatedStation) {
        const stationExists = await this.stationRepository.exists({
          stationId: evaluatorRequestData.associatedStation,
        });

        if (!stationExists)
          throw new NotFoundException(
            'Provided station ID is invalid and does not match our records.',
          );

        const evaluatorExists = await this.evaluatorRepository.exists({
          associatedStation: evaluatorRequestData.associatedStation,
        });

        if (evaluatorExists)
          throw new BadRequestException(
            'Evaluator already exists for the provided station Id. Please try with another station Id.',
          );
      }
      const updatedEvaluator = await this.evaluatorRepository.findOneAndUpdate(
        { evaluatorId },
        {
          $set: {
            ...evaluatorRequestData,
            updated_at: Date.now(),
          },
        },
      );
      return updatedEvaluator;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to update the evaluator. Kindly check the request parameters and abide by the constraints.',
      );
    }
  }

  async emitMessage(payload: { content: string; sessionId: string }, userId) {
    this.socketService.emitMessage(payload, userId);
  }

  async deleteStream(streamId: string): Promise<void> {
    const streamExists = await this.streamRepository.exists({
      streamId,
    });
    if (!streamExists)
      throw new NotFoundException(
        'Provided stream ID is invalid and does not match our records.',
      );
    try {
      const categories = await this.stationCategoryRepository.find({
        associatedStream: streamId,
      });
      for await (const category of categories) {
        const stations = await this.stationRepository.find({
          stationCategory: category.categoryId,
        });
        for await (const station of stations) {
          await this.deleteStation(station.stationId);
        }
        await this.stationCategoryRepository.deleteOne({
          categoryId: category.categoryId,
        });
      }
      await this.streamRepository.deleteOne({ streamId });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while deleting the stream.',
      );
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const categoryExists = await this.stationCategoryRepository.exists({
      categoryId,
    });
    if (!categoryExists)
      throw new NotFoundException(
        'Provided category ID is invalid and does not match our records.',
      );
    try {
      const stations = await this.stationRepository.find({
        stationCategory: categoryId,
      });
      for await (const station of stations) {
        await this.deleteStation(station.stationId);
      }
      await this.stationCategoryRepository.deleteOne({ categoryId });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while deleting the category.',
      );
    }
  }

  async deleteStation(stationId: string): Promise<void> {
    const stationExists = await this.stationRepository.exists({
      stationId,
    });
    if (!stationExists)
      throw new NotFoundException(
        'Provided station ID is invalid and does not match our records.',
      );
    const station = await this.stationRepository.findOne({ stationId });
    try {
      await this.evaluatorRepository.deleteOne({
        associatedStation: stationId,
      });
      await this.patientRepository.deleteOne({ associatedStation: stationId });
      await this.stationRepository.deleteOne({ stationId });
      await this.stripeService.deleteStationProduct(station.stripeProductId);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while deleting the station.',
      );
    }
  }

  async deletePatient(patientId: string): Promise<void> {
    const patientExists = await this.patientRepository.exists({
      patientId,
    });
    if (!patientExists)
      throw new NotFoundException(
        'Provided patient ID is invalid and does not match our records.',
      );
    try {
      await this.patientRepository.deleteOne({ patientId });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while deleting the patient.',
      );
    }
  }

  async deleteEvaluator(evaluatorId: string): Promise<void> {
    const evaluatorExists = await this.evaluatorRepository.exists({
      evaluatorId,
    });
    if (!evaluatorExists)
      throw new NotFoundException(
        'Provided evaluator ID is invalid and does not match our records.',
      );
    try {
      await this.evaluatorRepository.deleteOne({ evaluatorId });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while deleting the evaluator.',
      );
    }
  }
}
