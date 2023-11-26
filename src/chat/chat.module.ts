import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { ExamSession, ExamSessionSchema } from './schemas/session.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { ChatsRepository } from './repositories/chat.repository';
import { ExamSessionsRepository } from './repositories/examSession.repository';
import { StationsRepository } from 'src/station/repositories/station.repository';
import { Station, StationSchema } from 'src/station/schemas/station.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    MongooseModule.forFeature([
      { name: ExamSession.name, schema: ExamSessionSchema },
    ]),
    MongooseModule.forFeature([{ name: Station.name, schema: StationSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    UsersRepository,
    ChatsRepository,
    ExamSessionsRepository,
    StationsRepository,
  ],
})
export class ChatModule {}
