import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;
  constructor(private readonly configService: ConfigService) {
    this.client = twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: `Your OTP is ${otp}`,
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        to: phoneNumber,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
