import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StationService } from './station.service';
import { CreateStationRequest } from './dto/create-station.request';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from 'src/constants/apiResponse';

@Controller('station')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'characterImage', maxCount: 1 },
      { name: 'patientExampleConversations', maxCount: 1 },
    ]),
  )
  async createStation(
    @UploadedFiles()
    files: {
      characterImage?: Express.Multer.File[];
      patientExampleConversations?: Express.Multer.File[];
    },
    @Body() request: CreateStationRequest,
    @CurrentUser() user: User,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admin can create station');
    }
    const station = await this.stationService.createStation(request, files);
    const res = new ApiResponse(
      'Station created successfully It is still inactive, please schedule a fine tune job to deploy the character.',
      null,
      200,
      station,
    );
    return res.getResponse();
  }

  @Put('update/:stationId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'characterImage', maxCount: 1 },
      { name: 'patientExampleConversations', maxCount: 1 },
    ]),
  )
  async updateStation(
    @UploadedFiles()
    files: {
      characterImage?: Express.Multer.File[];
      patientExampleConversations?: Express.Multer.File[];
    },
    @Body() request: Partial<CreateStationRequest>,
    @CurrentUser() user: User,
    @Param('stationId') stationId: string,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admin can update stations');
    }
    const station = await this.stationService.updateStation(
      stationId,
      request,
      files,
    );
    const res = new ApiResponse(
      'Station updated successfully.',
      null,
      200,
      station,
    );
    return res.getResponse();
  }
}
