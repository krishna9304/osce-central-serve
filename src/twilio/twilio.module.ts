import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        TWILIO_ACCOUNT_SID: Joi.string().required(),
        TWILIO_AUTH_TOKEN: Joi.string().required(),
        TWILIO_PHONE_NUMBER: Joi.string().required(),
      }),
      envFilePath: '.env',
    }),
  ],
  providers: [TwilioService, ConfigService],
  exports: [TwilioService],
})
export class TwilioModule {}
