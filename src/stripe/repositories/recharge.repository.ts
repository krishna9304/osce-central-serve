import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import {
  RECHARGE_VALIDITY_DAYS,
  Recharge,
  ValidityStatus,
} from '../schemas/recharge.schema';
import { AbstractRepository } from 'src/database/abstract.repository';
import { Stripe } from 'stripe';

@Injectable()
export class RechargesRepository extends AbstractRepository<Recharge> {
  protected readonly logger = new Logger(RechargesRepository.name);

  constructor(
    @InjectModel(Recharge.name) rechargeModel: Model<Recharge>,
    @InjectConnection() connection: Connection,
  ) {
    super(rechargeModel, connection);
  }

  async increaseSessionCount(recharge: Recharge) {
    await this.model.updateOne(
      { rechargeId: recharge.rechargeId },
      {
        $inc: {
          sessionsUsed: 1,
        },
        $set: {
          updated_at: Date.now(),
        },
      },
    );
  }

  async updatePaymentSuccessAndAddValidity(
    sessionObject: Stripe.Checkout.Session,
  ) {
    await this.model.updateOne(
      { sessionId: sessionObject.id },
      {
        $set: {
          paymentIntentId: sessionObject.payment_intent,
          invoiceId: sessionObject.invoice,
          startDate: Date.now(),
          endDate: new Date(
            new Date().setDate(new Date().getDate() + RECHARGE_VALIDITY_DAYS),
          ).getTime(),
          validityStatus: ValidityStatus.ACTIVE,
          updated_at: Date.now(),
        },
      },
    );
  }
}
