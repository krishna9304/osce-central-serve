import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
  async getStreams(@Query() query: any) {
    const streamIds = query.streamIds || null;
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const streams = await this.stationService.getStreams(
      streamIds,
      parseInt(query.page),
      parseInt(query.limit),
    );

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
  async getCategories(@Query() query: any) {
    const categoryIds = query.categoryIds || null;
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const categories = await this.stationService.getCategories(
      categoryIds,
      parseInt(query.page),
      parseInt(query.limit),
    );

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
  async getStations(@Query() query: any) {
    const stationIds = query.stationIds || null;
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const stations = await this.stationService.getStations(
      stationIds,
      parseInt(query.page),
      parseInt(query.limit),
    );

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
  async getPatients(@Query() query: any) {
    const patientIds = query.patientIds || null;
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const patients = await this.stationService.getPatients(
      patientIds,
      parseInt(query.page),
      parseInt(query.limit),
    );

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
  async getEvaluators(@Query() query: any) {
    const evaluatorIds = query.evaluatorIds || null;
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const evaluators = await this.stationService.getEvaluators(
      evaluatorIds,
      parseInt(query.page),
      parseInt(query.limit),
    );
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
  async listCategories(
    @Param('streamId') streamId: string,
    @Query() query: any,
  ) {
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const categories = await this.stationService.listCategories(
      streamId,
      parseInt(query.page),
      parseInt(query.limit),
    );
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
  async listStations(
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: User,
    @Query() query: any,
  ) {
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const stations = await this.stationService.listStations(
      categoryId,
      user,
      parseInt(query.page),
      parseInt(query.limit),
    );
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

  @Get('start-evaluation/:sessionId')
  @UseGuards(JwtAuthGuard)
  async evaluationResults(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ) {
    await this.stationService.getEvaluationResults(sessionId, user);
    const res = new ApiResponse(
      'Your evaluation report is getting ready. It will be available in a few minutes.',
      null,
      200,
      null,
    );
    return res.getResponse();
  }

  @Get('evaluation-report/:sessionId')
  @UseGuards(JwtAuthGuard)
  async evaluationReport(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: User,
  ) {
    const report = await this.stationService.getEvaluationReport(
      sessionId,
      user,
    );
    const res = new ApiResponse(
      'Evaluation report fetched successfully',
      null,
      200,
      report,
    );
    return res.getResponse();
  }

  @Put(':stationId')
  @UseGuards(JwtAuthGuard)
  async updateStation(
    @CurrentUser() user: User,
    @Param('stationId') stationId: string,
    @Body() stationRequestData: Partial<CreateStationRequest>,
  ) {
    if (user.role !== 'admin')
      throw new UnauthorizedException(
        'Unauthorized action. Only admins can update stations.',
      );

    const updatedStation = await this.stationService.updateStation(
      stationId,
      stationRequestData,
    );

    const res = new ApiResponse(
      'Station updated successfully',
      null,
      200,
      updatedStation,
    );
    return res.getResponse();
  }

  @Put('stream/:streamId')
  @UseGuards(JwtAuthGuard)
  async updateStream(
    @CurrentUser() user: User,
    @Param('streamId') streamId: string,
    @Body() streamRequestData: Partial<CreateStreamRequest>,
  ) {
    if (user.role !== 'admin')
      throw new UnauthorizedException(
        'Unauthorized action. Only admins can update streams.',
      );

    const updatedStream = await this.stationService.updateStream(
      streamId,
      streamRequestData,
    );

    const res = new ApiResponse(
      'Stream updated successfully',
      null,
      200,
      updatedStream,
    );
    return res.getResponse();
  }

  @Put('category/:categoryId')
  @UseGuards(JwtAuthGuard)
  async updateCategory(
    @CurrentUser() user: User,
    @Param('categoryId') categoryId: string,
    @Body() categoryRequestData: Partial<CreateCategoryRequest>,
  ) {
    if (user.role !== 'admin')
      throw new UnauthorizedException(
        'Unauthorized action. Only admins can update categories.',
      );

    const updatedCategory = await this.stationService.updateCategory(
      categoryId,
      categoryRequestData,
    );

    const res = new ApiResponse(
      'Category updated successfully',
      null,
      200,
      updatedCategory,
    );
    return res.getResponse();
  }

  @Put('patient/:patientId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updatePatient(
    @UploadedFile() avatar: Express.Multer.File,
    @CurrentUser() user: User,
    @Param('patientId') patientId: string,
    @Body() patientRequestData: Partial<CreatePatientRequest>,
  ) {
    if (user.role !== 'admin')
      throw new UnauthorizedException(
        'Unauthorized action. Only admins can update patients.',
      );

    const updatedPatient = await this.stationService.updatePatient(
      patientId,
      patientRequestData,
      avatar,
    );

    const res = new ApiResponse(
      'Patient updated successfully',
      null,
      200,
      updatedPatient,
    );
    return res.getResponse();
  }

  @Put('evaluator/:evaluatorId')
  @UseGuards(JwtAuthGuard)
  async updateEvaluator(
    @CurrentUser() user: User,
    @Param('evaluatorId') evaluatorId: string,
    @Body() evaluatorRequestData: Partial<CreateEvaluatorRequest>,
  ) {
    if (user.role !== 'admin')
      throw new UnauthorizedException(
        'Unauthorized action. Only admins can update evaluators.',
      );

    const updatedEvaluator = await this.stationService.updateEvaluator(
      evaluatorId,
      evaluatorRequestData,
    );

    const res = new ApiResponse(
      'Evaluator updated successfully',
      null,
      200,
      updatedEvaluator,
    );
    return res.getResponse();
  }
}
