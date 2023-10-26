import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ApiResponse } from 'src/constants/ApiResponse';
import { TwilioService } from 'src/twilio/twilio.service';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';

export interface TokenPayload {
  userId: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly twilioService: TwilioService,
    private readonly userService: UserService,
  ) {}

  async login(user: User | null, response: Response, message: string = '') {
    const tokenPayload: TokenPayload = {
      userId: user._id.toHexString(),
      email: user.email,
    };

    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get('JWT_EXPIRATION'),
    );

    const token = this.jwtService.sign(tokenPayload);
    const res = new ApiResponse(message, null, 201, {
      user,
      token,
    });
    response
      .cookie('Authentication', token, {
        httpOnly: true,
        expires,
      })
      .status(200)
      .send(res.getResponse());
  }

  logout(response: Response) {
    response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(),
    });
  }

  async sendOTP(phone: string): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.twilioService.sendOTP(phone, otp);
    await this.userService.updateMetadata(phone, { otp });
  }

  async verifyOtp(phone: string, otp: string): Promise<User> {
    return this.userService.validate(phone, otp);
  }
}
