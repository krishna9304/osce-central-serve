import { Injectable } from '@nestjs/common';
import { CreateStationRequest } from './dto/create-station.request';
import { StationsRepository } from './repositories/station.repository';
import { AzureBlobUtil } from 'src/utils/azureblob.util';

@Injectable()
export class StationService {
  constructor(
    private readonly stationRepository: StationsRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
  ) {}

  async createStation(
    stationRequestData: CreateStationRequest,
    file: Express.Multer.File,
  ) {
    if (file) await this.azureBlobUtil.uploadImage(file);
    return await this.stationRepository.create(stationRequestData);
  }
}
