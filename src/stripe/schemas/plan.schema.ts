import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  PREMIUM = 'premium',
}

@Schema({ versionKey: false })
export class Plan extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({ default: null, unique: true })
  planId: string;

  @Prop({ required: true, unique: true })
  stripePlanId: string;

  @Prop({ required: true })
  planDisplayName: string;

  @Prop({ required: true })
  planType: PlanType;

  @Prop({ default: '' })
  planDescription: string;

  @Prop({ required: true })
  pricePerUnitPerMonth: number;

  @Prop({ required: true })
  numberOfStations: number;

  @Prop({ default: null })
  couponCodeRef: string;

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.pre('save', function (next) {
  this.planId = `${Plan.name}-${randomUUID().replace('-', '').slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
