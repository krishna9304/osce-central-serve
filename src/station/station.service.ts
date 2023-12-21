import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStationRequest } from './dto/create-station.request';
import { StationsRepository } from './repositories/station.repository';
import { AzureBlobUtil } from 'src/utils/azureblob.util';
import { CreateStreamRequest } from './dto/create-stream.request';
import { CreateCategoryRequest } from './dto/create-category.request';
import { CreatePatientRequest } from './dto/create-patient.request';
import { CreateEvaluatorRequest } from './dto/create-evaluator.request';

@Injectable()
export class StationService {
  constructor(
    private readonly stationRepository: StationsRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
  ) {}

  async createStream(streamRequestData: CreateStreamRequest) {}
  async createCategory(categoryRequestData: CreateCategoryRequest) {}
  async createStation(stationRequestData: CreateStationRequest) {}
  async createPatient(patientRequestData: CreatePatientRequest) {}
  async createEvaluator(evaluatorRequestData: CreateEvaluatorRequest) {}
}
