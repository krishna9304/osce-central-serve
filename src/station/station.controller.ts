import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StationService } from './station.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { CreateStreamRequest } from './dto/create-stream.request';
import { ApiResponse } from 'src/constants/apiResponse';
import { CreateCategoryRequest } from './dto/create-category.request';
import { CreateStationRequest } from './dto/create-station.request';
import { CreatePatientRequest } from './dto/create-patient.request';
import { CreateEvaluatorRequest } from './dto/create-evaluator.request';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('station')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createStation(
    @CurrentUser() user: User,
    @Body() stationRequestData: CreateStationRequest,
  ) {
    if (user.role !== 'admin')
      throw new Error('Unauthorized action. Only admins can create stations.');

    await this.stationService.createStation(stationRequestData);

    const res = new ApiResponse(
      'Station created successfully',
      null,
      201,
      null,
    );
    return res.getResponse();
  }

  @Post('stream')
  @UseGuards(JwtAuthGuard)
  async createStream(
    @CurrentUser() user: User,
    @Body() streamRequestData: CreateStreamRequest,
  ) {
    if (user.role !== 'admin')
      throw new Error('Unauthorized action. Only admins can create streams.');

    await this.stationService.createStream(streamRequestData);

    const res = new ApiResponse('Stream created successfully', null, 201, null);
    return res.getResponse();
  }

  @Post('category')
  @UseGuards(JwtAuthGuard)
  async createCategory(
    @CurrentUser() user: User,
    @Body() categoryRequestData: CreateCategoryRequest,
  ) {
    if (user.role !== 'admin')
      throw new Error(
        'Unauthorized action. Only admins can create categories.',
      );

    await this.stationService.createCategory(categoryRequestData);

    const res = new ApiResponse(
      'Category created successfully',
      null,
      201,
      null,
    );
    return res.getResponse();
  }

  @Post('patient')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async createPatient(
    @UploadedFile() avatar: Express.Multer.File,
    @CurrentUser() user: User,
    @Body() patientRequestData: CreatePatientRequest,
  ) {
    if (user.role !== 'admin')
      throw new Error(
        'Unauthorized action. Only admins can create categories.',
      );

    await this.stationService.createPatient(patientRequestData, avatar);

    const res = new ApiResponse(
      'Patient created successfully',
      null,
      201,
      null,
    );
    return res.getResponse();
  }

  @Post('evaluator')
  @UseGuards(JwtAuthGuard)
  async createEvaluator(
    @CurrentUser() user: User,
    @Body() evaluatorRequestData: CreateEvaluatorRequest,
  ) {
    if (user.role !== 'admin')
      throw new Error(
        'Unauthorized action. Only admins can create categories.',
      );

    await this.stationService.createEvaluator(evaluatorRequestData);

    const res = new ApiResponse(
      'Evaluator created successfully',
      null,
      201,
      null,
    );
    return res.getResponse();
  }
}
