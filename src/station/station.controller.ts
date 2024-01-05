import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
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
      throw new UnauthorizedException(
        'Unauthorized action. Only admins can create streams.',
      );

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
      throw new UnauthorizedException(
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
      throw new UnauthorizedException(
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
      throw new UnauthorizedException(
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

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  async getStreams(@Query('streamIds') streamIds: string | null) {
    const streams = await this.stationService.getStreams(streamIds);

    const res = new ApiResponse(
      'Streams fetched successfully',
      null,
      200,
      streams,
    );
    return res.getResponse();
  }

  @Get('category')
  @UseGuards(JwtAuthGuard)
  async getCategories(@Query('categoryIds') categoryIds: string | null) {
    const categories = await this.stationService.getCategories(categoryIds);

    const res = new ApiResponse(
      'Categories fetched successfully',
      null,
      200,
      categories,
    );
    return res.getResponse();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getStations(@Query('stationIds') stationIds: string | null) {
    const stations = await this.stationService.getStations(stationIds);

    const res = new ApiResponse(
      'Stations fetched successfully',
      null,
      200,
      stations,
    );
    return res.getResponse();
  }

  @Get('patient')
  @UseGuards(JwtAuthGuard)
  async getPatients(@Query('patientIds') patietIds: string | null) {
    const patients = await this.stationService.getPatients(patietIds);

    const res = new ApiResponse(
      'Patients fetched successfully',
      null,
      200,
      patients,
    );
    return res.getResponse();
  }

  @Get('evaluator')
  @UseGuards(JwtAuthGuard)
  async getEvaluators(@Query('evaluatorIds') evaluatorIds: string | null) {
    const evaluators = await this.stationService.getEvaluators(evaluatorIds);
    const res = new ApiResponse(
      'Evaluators fetched successfully',
      null,
      200,
      evaluators,
    );
    return res.getResponse();
  }

  @Get('list-categories/:streamId')
  @UseGuards(JwtAuthGuard)
  async listCategories(@Param('streamId') streamId: string) {
    const categories = await this.stationService.listCategories(streamId);
    const res = new ApiResponse(
      'Categories fetched successfully',
      null,
      200,
      categories,
    );
    return res.getResponse();
  }

  @Get('list-stations/:categoryId')
  @UseGuards(JwtAuthGuard)
  async listStations(@Param('categoryId') categoryId: string) {
    const stations = await this.stationService.listStations(categoryId);
    const res = new ApiResponse(
      'Stations fetched successfully',
      null,
      200,
      stations,
    );
    return res.getResponse();
  }

  @Get('patient-details/:stationId')
  @UseGuards(JwtAuthGuard)
  async patientDetails(@Param('stationId') stationId: string) {
    const patientDetails = await this.stationService.patientDetails(stationId);
    const res = new ApiResponse(
      'Patient details fetched successfully',
      null,
      200,
      patientDetails,
    );
    return res.getResponse();
  }

  @Get('evaluator-details/:stationId')
  @UseGuards(JwtAuthGuard)
  async evaluatorDetails(@Param('stationId') stationId: string) {
    const evaluatorDetails =
      await this.stationService.evaluatorDetails(stationId);
    const res = new ApiResponse(
      'Evaluator details fetched successfully',
      null,
      200,
      evaluatorDetails,
    );
    return res.getResponse();
  }

  @Get('evaluation/results/:sessionId')
  @UseGuards(JwtAuthGuard)
  async evaluationResults(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ) {
    const evaluationResults = await this.stationService.getEvaluationResults(
      sessionId,
      user,
    );
    const res = new ApiResponse(
      'Evaluation results fetched successfully',
      null,
      200,
      evaluationResults,
    );
    return res.getResponse();
  }
}
