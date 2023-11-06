import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StationService } from './station.service';
import { CreateStationRequest } from './dto/create-station.request';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from 'src/constants/apiResponse';

@Controller('station')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('characterImage'))
  async createStation(
    @UploadedFile() file: Express.Multer.File,
    @Body() request: CreateStationRequest,
    @CurrentUser() user: User,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admin can create station');
    }
    const station = await this.stationService.createStation(request, file);
    const res = new ApiResponse(
      'Station created successfully It is still inactive, please schedule a fine tune job to deploy the character.',
      null,
      200,
      station,
    );
    return res.getResponse();
  }
}
