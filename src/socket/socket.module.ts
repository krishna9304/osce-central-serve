import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { Station, StationSchema } from 'src/station/schemas/station.schema';
import { Chat, ChatSchema } from 'src/chat/schemas/chat.schema';
import {
  ExamSession,
  ExamSessionSchema,
} from 'src/chat/schemas/session.schema';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { SocketGateway } from './socket.gateway';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    MongooseModule.forFeature([
      { name: ExamSession.name, schema: ExamSessionSchema },
    ]),
    MongooseModule.forFeature([{ name: Station.name, schema: StationSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),

    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        OPENAI_API_KEY: Joi.string().required(),
      }),
      envFilePath: '.env',
    }),
  ],
  providers: [
    SocketGateway,
    UsersRepository,
    ChatsRepository,
    ExamSessionsRepository,
    StationsRepository,
  ],
})
export class SocketModule {}
