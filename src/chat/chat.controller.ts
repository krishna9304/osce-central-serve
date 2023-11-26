import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { ChatService } from './chat.service';
import { ApiResponse } from 'src/constants/apiResponse';
import { CreateChatRequest } from './dto/create-chat.request';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start-exam-session')
  @UseGuards(JwtAuthGuard)
  async startSession(
    @Query('stationId') stationId: string,
    @CurrentUser() user: User,
  ) {
    const examSession = this.chatService.startExamSession(stationId, user);

    const res = new ApiResponse('Session started', null, 201, examSession);

    return res.getResponse();
  }

  @Post('completions')
  @UseGuards(JwtAuthGuard)
  async chatCompletion(
    @Query('sessionId') sessionId: string,
    @CurrentUser() user: User,
    @Body() request: CreateChatRequest,
  ) {
    this.chatService.chatCompletion(user, sessionId, request);
  }
}
