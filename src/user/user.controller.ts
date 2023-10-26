import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserRequest } from './dto/create-user.dto';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from './schemas/user.schema';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async createUser(
    @Body() request: CreateUserRequest,
    @CurrentUser() initilaUserData: User,
    @Res() response: Response,
  ): Promise<void> {
    const user = await this.userService.createUser(request, initilaUserData);
    return await this.authService.login(
      user,
      response,
      'User registered successfully',
    );
  }
}
