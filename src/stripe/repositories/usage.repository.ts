import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import {
  RECHARGE_VALIDITY_DAYS,
  RechargeType,
  Usage,
  ValidityStatus,
} from '../schemas/usage.schema';
import { AbstractRepository } from 'src/database/abstract.repository';
import { User } from 'src/user/schemas/user.schema';
import { Stripe } from 'stripe';

@Injectable()
export class UsagesRepository extends AbstractRepository<Usage> {
  protected readonly logger = new Logger(UsagesRepository.name);

  constructor(
    @InjectModel(Usage.name) usageModel: Model<Usage>,
    @InjectConnection() connection: Connection,
  ) {
    super(usageModel, connection);
  }

  async increaseSessionCount(user: Partial<User>, recharge: RechargeType) {
    await this.model.updateOne({ userId: user.userId }, [
      {
        $set: {
          rechargeHistory: {
            $map: {
              input: '$rechargeHistory',
              in: {
                $cond: {
                  if: {
                    $eq: ['$$this.paymentIntentId', recharge.paymentIntentId],
                  },
                  then: {
                    $mergeObjects: [
                      '$$this',
                      { sessionsUsed: { $add: ['$$this.sessionsUsed', 1] } },
                    ],
                  },
                  else: '$$this',
                },
              },
            },
          },
          updated_at: Date.now(),
        },
      },
    ]);
  }

  async updatePaymentSuccessAndAddValidity(
    user: Partial<User>,
    recharge: RechargeType,
    sessionObject: Stripe.Checkout.Session,
  ) {
    await this.model.updateOne({ userId: user.userId }, [
      {
        $set: {
          rechargeHistory: {
            $map: {
              input: '$rechargeHistory',
              in: {
                $cond: {
                  if: {
                    $eq: ['$$this.sessionId', recharge.sessionId],
                  },
                  then: {
                    $mergeObjects: [
                      '$$this',
                      {
                        paymentIntentId: sessionObject.payment_intent,
                        invoiceId: sessionObject.invoice,
                        startDate: Date.now(),
                        endDate: new Date(
                          new Date().setDate(
                            new Date().getDate() + RECHARGE_VALIDITY_DAYS,
                          ),
                        ).getTime(),
                        validityStatus: ValidityStatus.ACTIVE,
                      },
                    ],
                  },
                  else: '$$this',
                },
              },
            },
          },
          updated_at: Date.now(),
        },
      },
    ]);
  }
}
