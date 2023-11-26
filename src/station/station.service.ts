import { BadRequestException, Injectable } from '@nestjs/common';
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
    files: {
      characterImage?: Express.Multer.File[];
      patientExampleConversations?: Express.Multer.File[];
    },
  ) {
    try {
      if (files.characterImage)
        stationRequestData.characterImage =
          await this.azureBlobUtil.uploadImage(files.characterImage[0]);

      if (files.patientExampleConversations)
        stationRequestData.patientExampleConversations =
          await this.azureBlobUtil.uploadTxtFile(
            files.patientExampleConversations[0],
          );

      return await this.stationRepository.create(stationRequestData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateStation(
    stationName: string,
    updateStationRequestData: Partial<CreateStationRequest>,
    files: {
      characterImage?: Express.Multer.File[];
      patientExampleConversations?: Express.Multer.File[];
    },
  ) {
    try {
      if (files.characterImage)
        updateStationRequestData.characterImage =
          await this.azureBlobUtil.uploadImage(files.characterImage[0]);

      if (files.patientExampleConversations)
        updateStationRequestData.patientExampleConversations =
          await this.azureBlobUtil.uploadTxtFile(
            files.patientExampleConversations[0],
          );

      return await this.stationRepository.findOneAndUpdate(
        { stationName },
        { ...updateStationRequestData },
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
