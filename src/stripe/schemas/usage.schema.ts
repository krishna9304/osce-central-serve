import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export enum ValidityStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export const FREE_TRIAL_PAYMENT_ID = 'free-trial';

export interface RechargeType {
  paymentId: string;
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
