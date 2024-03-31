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
import { Patient } from './schemas/patient.schema';
import { Evaluator } from './schemas/evaluator.schema';
import {
  getEvaluatorSystemPrompt,
  getUserPromptForNonClinicalChecklist,
} from 'src/chat/constants/prompt';
import { User } from 'src/user/schemas/user.schema';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { ExamSessionStatus } from 'src/chat/schemas/session.schema';
import { EvaluationRepository } from './repositories/evaluation.repository';
import {
  ClinicalChecklistMarkingItem,
  Evaluation,
  NonClinicalChecklistMarkingItem,
} from './schemas/evaluation.schema';
import { SocketService } from 'src/socket/socket.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { NonClinicalChecklist } from './assets/checklist';

@Injectable()
export class StationService {
  constructor(
    private readonly stationRepository: StationsRepository,
    private readonly streamRepository: StreamRepository,
    private readonly stationCategoryRepository: StationCategoryRepository,
    private readonly patientRepository: PatientRepository,
    private readonly evaluatorRepository: EvaluatorRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly chatsRepository: ChatsRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly socketService: SocketService,
    private readonly configService: ConfigService,
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
      await this.stationRepository.create({
        ...stationRequestData,
      } as Station);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Kindly check the request parameters and abide by the constraints.',
      );
    }
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

    try {
      if (avatar) {
        const avatarUploadName = await this.azureBlobUtil.uploadImage(avatar);
        patientRequestData.avatar = avatarUploadName;
      }

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

  async getStreams(streamIds: string | null): Promise<Stream[]> {
    try {
      let streams: Stream[] = [];
      if (!streamIds) streams = await this.streamRepository.find({});
      else {
        const listOfstreamIds = streamIds.split(',');
        streams = await this.streamRepository.find({
          streamId: { $in: listOfstreamIds },
        });
      }
      return streams;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching streams.',
      );
    }
  }

  async getCategories(categoryIds: string | null): Promise<StationCategory[]> {
    try {
      let categories: StationCategory[] = [];
      if (!categoryIds)
        categories = await this.stationCategoryRepository.find({});
      else {
        const listOfCategoryIds = categoryIds.split(',');
        categories = await this.stationCategoryRepository.find({
          categoryId: { $in: listOfCategoryIds },
        });
      }
      return categories;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching categories.',
      );
    }
  }

  async getStations(stationIds: string | null): Promise<Station[]> {
    try {
      let stations: Station[] = [];
      if (!stationIds) stations = await this.stationRepository.find({});
      else {
        const listOfStationIds = stationIds.split(',');
        stations = await this.stationRepository.find({
          stationId: { $in: listOfStationIds },
        });
      }
      return stations;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching stations.',
      );
    }
  }

  async getPatients(patientIds: string | null): Promise<Patient[]> {
    try {
      let patientDocs: Patient[] = [];
      if (!patientIds) patientDocs = await this.patientRepository.find({});
      else {
        const listOfPatientIds = patientIds.split(',');
        patientDocs = await this.patientRepository.find({
          patientId: { $in: listOfPatientIds },
        });
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

  async getEvaluators(evaluatorIds: string | null): Promise<Evaluator[]> {
    try {
      let evaluators: Evaluator[] = [];
      if (!evaluatorIds) evaluators = await this.evaluatorRepository.find({});
      else {
        const listOfEvaluatorIds = evaluatorIds.split(',');
        evaluators = await this.evaluatorRepository.find({
          evaluatorId: { $in: listOfEvaluatorIds },
        });
      }
      return evaluators;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching evaluators.',
      );
    }
  }

  async listCategories(streamId: string): Promise<StationCategory[]> {
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

      return categories;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching categories.',
      );
    }
  }

  async listStations(categoryId: string, user: User): Promise<Station[]> {
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
        stations = await this.stationRepository.find({
          stationCategory: categoryId,
        });
      } else {
        stations = await this.stationRepository.find({
          stationCategory: categoryId,
          status: 'active',
        });
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
      session.sessionId,
      session.stationId,
      user.userId,
      user.name,
      station.stationName,
    );
  }

  async prepareEvaluationResultsInBackgrond(
    sessionId: string,
    stationId: string,
    userId: string,
    userName: string,
    stationName: string,
  ): Promise<void> {
    this.socketService.updateReportGenerationProgress(userId, '10%');

    this.socketService.updateReportGenerationProgress(userId, '12%');
    const patient = await this.patientRepository.findOne({
      associatedStation: stationId,
    });

    this.socketService.updateReportGenerationProgress(userId, '14%');
    const evaluator = await this.evaluatorRepository.findOne({
      associatedStation: stationId,
    });

    this.socketService.updateReportGenerationProgress(userId, '16%');
    const chats = await this.chatsRepository.find({
      sessionId: sessionId,
    });

    chats.sort((a, b) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    this.socketService.updateReportGenerationProgress(userId, '30%');

    const evaluateServerURL =
      this.configService.get<string>('EVALUATION_API_URL');

    const userFirstName = userName.split(' ')[0];
    const evaluatorSystemPrompt = getEvaluatorSystemPrompt(
      userFirstName,
      patient.patientName,
      chats,
    );

    try {
      // ****************Clinical Checklist Marking***************
      let totalClinicalMarks = 0;
      let securedMarks = 0;
      let userPromptPrefix =
        'Analyze the given conversation and answer the given question: \n';
      const markedClinicalChecklist: Array<ClinicalChecklistMarkingItem> = [];
      for await (const clinicalChecklistItem of evaluator.clinicalChecklist) {
        const evaluatorUserPrompt =
          userPromptPrefix +
          `Did Dr. ${userFirstName} ${clinicalChecklistItem.question} ?`;
        const options = ['Yes', 'No'];
        const res = await axios.post(evaluateServerURL, {
          systemPrompt: evaluatorSystemPrompt,
          userPrompt: evaluatorUserPrompt,
          options,
        });
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
      let totalNonClinicalMarks = 0;
      userPromptPrefix =
        'Analyze the given conversation and provide marks for given question: \n';
      const markedNonClinicalChecklist: Array<NonClinicalChecklistMarkingItem> =
        [];
      for await (const nonClinicalChecklistItem of NonClinicalChecklist) {
        const evaluatorUserPrompt =
          userPromptPrefix +
          getUserPromptForNonClinicalChecklist(
            nonClinicalChecklistItem,
            userFirstName,
          );
        const options = [1, 2, 3, 4, 5];
        const res = await axios.post(evaluateServerURL, {
          systemPrompt: evaluatorSystemPrompt,
          userPrompt: evaluatorUserPrompt,
          options,
        });
        markedNonClinicalChecklist.push({
          label: nonClinicalChecklistItem.label,
          score: parseInt(res.data.data),
        });
        totalNonClinicalMarks += 5;
        securedMarks += parseInt(res.data.data);
      }
      this.socketService.updateReportGenerationProgress(userId, '80%');
      // ************************************************************

      const totalSecurableMarks = totalClinicalMarks + totalNonClinicalMarks;
      const securedMarksOutOf12 = (securedMarks / totalSecurableMarks) * 12;

      await this.evaluationRepository.create({
        associatedSession: sessionId,
        stationName: stationName,
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
      console.log(
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
          $set: { ...stationRequestData, updated_at: new Date().toISOString() },
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
          $set: { ...streamRequestData, updated_at: new Date().toISOString() },
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
              updated_at: new Date().toISOString(),
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
          $set: { ...patientRequestData, updated_at: new Date().toISOString() },
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
            updated_at: new Date().toISOString(),
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
}
