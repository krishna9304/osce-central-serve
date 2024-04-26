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
import { Usage, UsageSchema } from './schemas/usage.schema';
import { UsagesRepository } from './repositories/usage.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    MongooseModule.forFeature([{ name: Usage.name, schema: UsageSchema }]),
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        STRIPE_SECRET_KEY: Joi.string().required(),
        FREE_TRIAL_DAYS: Joi.number().required(),
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
    UsagesRepository,
  ],
  controllers: [StripeController],
  exports: [
    StripeService,
    PlansRepository,
    SubscriptionsRepository,
    UsagesRepository,
  ],
})
export class StripeModule {}
