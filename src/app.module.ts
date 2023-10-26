import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SocketGateway } from './socket/socket.gateway';
import { TwilioModule } from './twilio/twilio.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
      }),
      envFilePath: '.env',
    }),
    AuthModule,
    UserModule,
    TwilioModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConfigService, SocketGateway],
})
export class AppModule {}
