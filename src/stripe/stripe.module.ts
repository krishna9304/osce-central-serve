import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { PlansRepository } from './repositories/plan.repository';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeController } from './stripe.controller';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { SubscriptionsRepository } from './repositories/subscription.repository';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { Recharge, RechargeSchema } from './schemas/recharge.schema';
import { RechargesRepository } from './repositories/recharge.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    MongooseModule.forFeature([
      { name: Recharge.name, schema: RechargeSchema },
    ]),
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        STRIPE_SECRET_KEY: Joi.string().required(),
      }),
      envFilePath: '.env',
    }),
  ],
  providers: [
    StripeService,
    ConfigService,
    PlansRepository,
    SubscriptionsRepository,
    UsersRepository,
    RechargesRepository,
  ],
  controllers: [StripeController],
  exports: [
    StripeService,
    PlansRepository,
    SubscriptionsRepository,
    RechargesRepository,
  ],
})
export class StripeModule {}
