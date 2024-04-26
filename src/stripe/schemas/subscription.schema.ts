import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export interface ChangePlanHistoryType {
  oldPlanId: string;
  newPlanId: string;
  changeDate: string;
}

@Schema({ versionKey: false })
export class Subscription extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({ default: null, unique: true })
  subscriptionId: string;

  @Prop({ required: true, unique: true })
  stripeSubscriptionId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  subscriptionStart: number;

  @Prop({ required: true })
  subscriptionEnd: number;

  @Prop({ default: 0 })
  additionalStationsBought: number;

  @Prop({ default: [] })
  changePlanHistory: ChangePlanHistoryType[];

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.pre('save', function (next) {
  this.subscriptionId = `${Subscription.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
