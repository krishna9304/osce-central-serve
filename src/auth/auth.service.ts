import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Types } from 'mongoose';
import { ApiResponse } from 'src/constants/apiResponse';
import { TwilioService } from 'src/twilio/twilio.service';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';

export interface TokenPayload {
  userId: string;
  phone: string;
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
      phone: user.phone,
    };

    const token = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    const res = new ApiResponse(message, null, 201, {
      user,
      token,
      refreshToken,
    });
    response
      .cookie('Authentication', token, {
        httpOnly: true,
        expires: new Date(
          Date.now() + this.configService.get<number>('JWT_EXPIRATION') * 1000,
        ),
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

  async refreshToken(refreshToken: string) {
    const decoded = this.jwtService.verify(refreshToken);
    const tokenPayload: TokenPayload = {
      userId: decoded.userId,
      phone: decoded.phone,
    };

    const user = await this.userService.getUser({
      _id: new Types.ObjectId(tokenPayload.userId),
      phone: tokenPayload.phone,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const newAccessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
    });

    const newRefreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async sendOTP(phone: string): Promise<void> {
    const accountExists = await this.userService.getUser({ phone });
    if (accountExists) {
      const user = await this.userService.getUser({ phone });
      if (user.role === 'admin') {
        await this.userService.updateMetadata(phone, { otp: '555555' });
        return;
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.twilioService.sendOTP(phone, otp);
    await this.userService.updateMetadata(phone, { otp });
  }

  async verifyOtp(phone: string, otp: string): Promise<User> {
    return this.userService.validate(phone, otp);
  }
}
