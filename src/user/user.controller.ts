import { Body, Controller, Post, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserRequest } from './dto/create-user.dto';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async createUser(
    @Body() request: CreateUserRequest,
    @Res() response: Response,
  ): Promise<void> {
    const user = await this.userService.createUser(request);
    return await this.authService.login(
      user,
      response,
      'User registered successfully',
    );
  }
}
