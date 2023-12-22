import {
  BadRequestException,
  Injectable,
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

      const avatarUrl = await this.azureBlobUtil.uploadImage(avatar);
      patientRequestData.avatar = avatarUrl;

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
}
