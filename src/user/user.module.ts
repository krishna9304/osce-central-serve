import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { UsersRepository } from './repositories/user.repository';
import { UtilModule } from 'src/utils/util.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { StripeService } from 'src/stripe/stripe.service';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import {
  ExamSession,
  ExamSessionSchema,
} from 'src/chat/schemas/session.schema';
import { ChatModule } from 'src/chat/chat.module';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { Chat, ChatSchema } from 'src/chat/schemas/chat.schema';
import { EvaluationRepository } from 'src/station/repositories/evaluation.repository';
import {
  Evaluation,
  EvaluationSchema,
} from 'src/station/schemas/evaluation.schema';
import { RechargesRepository } from 'src/stripe/repositories/recharge.repository';
import { Recharge, RechargeSchema } from 'src/stripe/schemas/recharge.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: ExamSession.name, schema: ExamSessionSchema },
    ]),
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    MongooseModule.forFeature([
      { name: Recharge.name, schema: RechargeSchema },
    ]),
    MongooseModule.forFeature([
      { name: Evaluation.name, schema: EvaluationSchema },
    ]),
    forwardRef(() => AuthModule),
    UtilModule,
    StripeModule,
    ChatModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UsersRepository,
    StripeService,
    ExamSessionsRepository,
    ChatsRepository,
    EvaluationRepository,
    RechargesRepository,
  ],
  exports: [UserService],
})
export class UserModule {}
