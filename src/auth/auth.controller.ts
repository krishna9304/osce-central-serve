import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiResponse as APIresp } from 'src/constants/apiResponse';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() request) {
    await this.authService.sendOTP(request.phone);
    const res = new APIresp('OTP sent successfully', null, 200, null);
    return res.getResponse();
  }

  @Post('verify')
  async verify(@Body() request, @Res() response: Response) {
    const user = await this.authService.verifyOtp(request.phone, request.otp);
    await this.authService.login(user, response, 'User logged in successfully');
    const res = new APIresp('User logged in successfully', null, 200, user);
    return res.getResponse();
  }

  @Get('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res() response: Response) {
    await this.authService.logout(response);
    response.send(null);
  }

  @Get('self')
  @UseGuards(JwtAuthGuard)
  async getSelf(@CurrentUser() user: User) {
    const res = new APIresp('User authenticated succesfully', null, 200, user);
    return res.getResponse();
  }

  @Post('refresh-token')
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Res() response: Response,
  ) {
    const newTokens = await this.authService.refreshToken(refreshToken);
    const res = new APIresp(
      'Auth tokens refreshed successfully',
      null,
      200,
      newTokens,
    );
    response.status(200).send(res.getResponse());
  }
}
