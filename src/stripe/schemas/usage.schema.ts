import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export enum ValidityStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PAYMENT_PENDING = 'payment-pending',
}

export enum SessionType {
  RECHARGE = 'recharge',
}

export const FREE_TRIAL_PAYMENT_ID = 'free-trial';
export const FREE_TRIAL_SESSIONS = 2;
export const FREE_TRIAL_DAYS = 7;
export const BASE_SESSION_PRICE = 500; // in rupees
export const MINIMUM_DISCOUNT_ELIGIBLE_SESSIONS = 10;
export const MINIMUM_SESSIONS_TO_BUY = 5;
export const MAX_DISCOUNT = 0.2; // 20%
export const RECHARGE_VALIDITY_DAYS = 30;

export interface RechargeMetadata {
  UserId: string;
  Name: string;
  Email: string;
  Phone: string;
  SessionsBought: number;
  SessionType: SessionType;
}

export interface RechargeType {
  paymentIntentId: string | null;
  sessionId: string;
  invoiceId: string | null;
  startDate: number;
  endDate: number;
  rechargeAmount: number;
  sessionsBought: number;
  sessionsUsed: number;
  validityStatus: ValidityStatus;
}

@Schema({ versionKey: false })
export class Usage extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({ default: null, unique: true })
  usageId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  rechargeHistory: RechargeType[];

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const UsageSchema = SchemaFactory.createForClass(Usage);

UsageSchema.pre('save', function (next) {
  this.usageId = `${Usage.name}-${randomUUID().replace('-', '').slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
