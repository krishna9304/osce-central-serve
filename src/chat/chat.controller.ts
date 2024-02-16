import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { ChatService } from './chat.service';
import { ApiResponse } from 'src/constants/apiResponse';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start-exam-session')
  @UseGuards(JwtAuthGuard)
  async startSession(
    @Query('stationId') stationId: string,
    @CurrentUser() user: User,
  ) {
    const examSession = await this.chatService.startExamSession(
      stationId,
      user,
    );

    const res = new ApiResponse('Session started.', null, 201, examSession);
    return res.getResponse();
  }

  @Put('end-exam-session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async endSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: User,
  ) {
    await this.chatService.endExamSession(sessionId, user);

    const res = new ApiResponse('Session ended.', null, 200, null);
    return res.getResponse();
  }

  @Put('findings-track/:sessionId/:findingId')
  @UseGuards(JwtAuthGuard)
  async updateFindingsRecord(
    @Param('sessionId') sessionId: string,
    @Param('findingId') findingId: string,
    @CurrentUser() user: User,
  ) {
    await this.chatService.trackFindingsRecord(sessionId, findingId, user);

    const res = new ApiResponse('Recorded succesfully.', null, 200, null);
    return res.getResponse();
  }

  @Get('session-details/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getSessionDetails(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: User,
  ) {
    const sessionDetails = await this.chatService.getSessionDetails(
      sessionId,
      user,
    );

    const res = new ApiResponse('Session details.', null, 200, sessionDetails);
    return res.getResponse();
  }

  @Get('session-list')
  @UseGuards(JwtAuthGuard)
  async getSessionList(@CurrentUser() user: User) {
    const sessionList = await this.chatService.getSessionList(user);

    const res = new ApiResponse('Session list.', null, 200, sessionList);
    return res.getResponse();
  }
}
