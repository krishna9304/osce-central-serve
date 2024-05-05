import { Module, forwardRef } from '@nestjs/common';
import { StationController } from './station.controller';
import { StationService } from './station.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Station, StationSchema } from './schemas/station.schema';
import { AuthModule } from 'src/auth/auth.module';
import { StationsRepository } from './repositories/station.repository';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { UtilModule } from 'src/utils/util.module';
import { StreamRepository } from './repositories/stream.repository';
import { StationCategoryRepository } from './repositories/category.repository';
import { PatientRepository } from './repositories/patient.repository';
import { EvaluatorRepository } from './repositories/evaluator.repository';
import { Stream, StreamSchema } from './schemas/stream.schema';
import {
  StationCategory,
  StationCategorySchema,
} from './schemas/category.schema';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { Evaluator, EvaluatorSchema } from './schemas/evaluator.schema';
import {
  ExamSession,
  ExamSessionSchema,
} from 'src/chat/schemas/session.schema';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { Chat, ChatSchema } from 'src/chat/schemas/chat.schema';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { Evaluation, EvaluationSchema } from './schemas/evaluation.schema';
import { EvaluationRepository } from './repositories/evaluation.repository';
import { SocketModule } from 'src/socket/socket.module';
import { SocketService } from 'src/socket/socket.service';
import { SocketGateway } from 'src/socket/socket.gateway';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Station.name, schema: StationSchema }]),
    MongooseModule.forFeature([{ name: Stream.name, schema: StreamSchema }]),
    MongooseModule.forFeature([
      { name: Evaluation.name, schema: EvaluationSchema },
    ]),
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    MongooseModule.forFeature([
      { name: StationCategory.name, schema: StationCategorySchema },
    ]),
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    MongooseModule.forFeature([
      { name: Evaluator.name, schema: EvaluatorSchema },
    ]),
    MongooseModule.forFeature([
      { name: ExamSession.name, schema: ExamSessionSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    UtilModule,
    StripeModule,
  ],
  controllers: [StationController],
  providers: [
    StationService,
    StationsRepository,
    UsersRepository,
    StreamRepository,
    StationCategoryRepository,
    PatientRepository,
    EvaluatorRepository,
    ExamSessionsRepository,
    ChatsRepository,
    EvaluationRepository,
    SocketGateway,
    SocketService,
  ],
  exports: [StationService, StationsRepository],
})
export class StationModule {}
