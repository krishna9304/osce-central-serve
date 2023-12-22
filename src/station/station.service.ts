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

@Injectable()
export class StationService {
  constructor(
    private readonly stationRepository: StationsRepository,
    private readonly streamRepository: StreamRepository,
    private readonly stationCategoryRepository: StationCategoryRepository,
    private readonly patientRepository: PatientRepository,
    private readonly evaluatorRepository: EvaluatorRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
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
    try {
      const { associatedStream } = categoryRequestData;
      const streamExists = await this.streamRepository.exists({
        streamId: associatedStream,
      });

      if (!streamExists)
        throw new NotFoundException(
          'Provided stream ID is invalid and does not match our records.',
        );

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
    try {
      const { stationCategory } = stationRequestData;
      const categoryExists = await this.stationCategoryRepository.exists({
        categoryId: stationCategory,
      });

      if (!categoryExists)
        throw new NotFoundException(
          'Provided category ID is invalid and does not match our records.',
        );

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
    try {
      const { associatedStation } = patientRequestData;
      const stationExists = await this.stationRepository.exists({
        stationId: associatedStation,
      });

      if (!stationExists)
        throw new NotFoundException(
          'Provided station ID is invalid and does not match our records.',
        );

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
    try {
      const { associatedStation } = evaluatorRequestData;

      const stationExists = await this.stationRepository.exists({
        stationId: associatedStation,
      });

      if (!stationExists)
        throw new NotFoundException(
          'Provided station ID is invalid and does not match our records.',
        );

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
    try {
      const streamExists = await this.streamRepository.exists({
        streamId,
      });

      if (!streamExists)
        throw new NotFoundException(
          'Provided stream ID is invalid and does not match our records.',
        );

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
    try {
      const categoryExists = await this.stationCategoryRepository.exists({
        categoryId,
      });

      if (!categoryExists)
        throw new NotFoundException(
          'Provided category ID is invalid and does not match our records.',
        );

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
    try {
      const stationExists = await this.stationRepository.exists({
        stationId,
      });

      if (!stationExists)
        throw new NotFoundException(
          'Provided station ID is invalid and does not match our records.',
        );

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
    try {
      const stationExists = await this.stationRepository.exists({
        stationId,
      });

      if (!stationExists)
        throw new NotFoundException(
          'Provided station ID is invalid and does not match our records.',
        );

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
}
