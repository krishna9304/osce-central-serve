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
import { StationModule } from './station/station.module';
import { ChatModule } from './chat/chat.module';
import { SocketModule } from './socket/socket.module';

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
    StationModule,
    ChatModule,
    SocketModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConfigService],
})
export class AppModule {}
