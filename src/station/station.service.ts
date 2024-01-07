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
import { ConfigService } from '@nestjs/config';
import { getEvaluatorPrompt } from 'src/chat/constants/prompt';
import { User } from 'src/user/schemas/user.schema';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import axios from 'axios';
import { ExamSessionStatus } from 'src/chat/schemas/session.schema';
import { Converter } from 'showdown';
import { generatePdf } from 'html-pdf-node';
import { EvaluationRepository } from './repositories/evaluation.repository';
import { Evaluation } from './schemas/evaluation.schema';
import { SocketGateway } from 'src/socket/socket.gateway';

@Injectable()
export class StationService {
  constructor(
    private readonly stationRepository: StationsRepository,
    private readonly streamRepository: StreamRepository,
    private readonly stationCategoryRepository: StationCategoryRepository,
    private readonly patientRepository: PatientRepository,
    private readonly evaluatorRepository: EvaluatorRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
    private readonly configService: ConfigService,
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly chatsRepository: ChatsRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly socketGateway: SocketGateway,
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

    try {
      if (avatar) {
        const avatarUrl = await this.azureBlobUtil.uploadImage(avatar);
        patientRequestData.avatar = avatarUrl;
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
      let patients: Patient[] = [];
      if (!patientIds) patients = await this.patientRepository.find({});
      else {
        const listOfPatientIds = patientIds.split(',');
        patients = await this.patientRepository.find({
          patientId: { $in: listOfPatientIds },
        });
      }
      return patients;
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

  async listStations(categoryId: string): Promise<Station[]> {
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

      return stations;
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

    this.prepareEvaluationResultsInBackgrond(
      session.sessionId,
      session.stationId,
      user.userId,
      user.name,
    );
  }

  async prepareEvaluationResultsInBackgrond(
    sessionId: string,
    stationId: string,
    userId: string,
    userName: string,
  ): Promise<void> {
    this.socketGateway.sendEvaluationReportGenerationProgress(userId, '10%');

    this.socketGateway.sendEvaluationReportGenerationProgress(userId, '12%');
    const patient = await this.patientRepository.findOne({
      associatedStation: stationId,
    });

    this.socketGateway.sendEvaluationReportGenerationProgress(userId, '14%');
    const evaluator = await this.evaluatorRepository.findOne({
      associatedStation: stationId,
    });

    this.socketGateway.sendEvaluationReportGenerationProgress(userId, '16%');
    const chats = await this.chatsRepository.find({
      sessionId: sessionId,
    });

    chats.sort((a, b) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    this.socketGateway.sendEvaluationReportGenerationProgress(userId, '30%');
    const prompt = getEvaluatorPrompt(userName, patient, evaluator, chats);

    this.socketGateway.sendEvaluationReportGenerationProgress(userId, '40%');
    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configService.get<string>(
        'OPENAI_API_KEY',
      )}`,
    };

    const body = {
      messages: prompt,
      model: 'gpt-3.5-turbo-1106',
      max_tokens: 2000,
      temperature: 0.7,
    };

    try {
      const response = await axios.post(url, body, { headers });
      const markdownResponse: string = response.data.choices[0].message.content;

      this.socketGateway.sendEvaluationReportGenerationProgress(userId, '70%');
      const converter = new Converter({ emoji: true, tasklists: true });

      this.socketGateway.sendEvaluationReportGenerationProgress(userId, '80%');
      const htmlText = converter.makeHtml(markdownResponse);

      this.socketGateway.sendEvaluationReportGenerationProgress(userId, '85%');
      generatePdf(
        { content: htmlText },
        { format: 'A4' },
        async (err, buffer: Buffer) => {
          if (err)
            throw new Error('Something went wrong while generating PDF.');

          this.socketGateway.sendEvaluationReportGenerationProgress(
            userId,
            '90%',
          );
          const filename = `${stationId}-${sessionId}.pdf`;
          const uploadedUrl = await this.azureBlobUtil.uploadPdfUsingBuffer(
            buffer,
            filename,
          );

          this.socketGateway.sendEvaluationReportGenerationProgress(
            userId,
            '97%',
          );
          await this.evaluationRepository.create({
            associatedSession: sessionId,
            evaluationReportPdf: uploadedUrl,
            totalMarks: 100,
          } as Evaluation);
          this.socketGateway.sendEvaluationReportGenerationProgress(
            userId,
            '100%',
            uploadedUrl,
          );
        },
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Something went wrong while fetching evaluation results.',
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
}
