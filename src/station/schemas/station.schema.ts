import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class Station extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  stationId: string;

  @Prop({ required: true })
  stripeProductId: string;

  @Prop({ required: true, unique: true })
  stationName: string;

  @Prop({ required: true })
  stationDescription: string;

  @Prop({ required: true })
  pricePerUnit: number;

  @Prop({ required: true })
  stationCategory: string;

  @Prop({ required: true })
  candidateInstructions: string;

  @Prop({ default: 'inactive' })
  status: string;

  @Prop({ default: false })
  freeTierEligible: boolean;

  @Prop({ default: 8 })
  sessionDurationInMinutes: number;

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const StationSchema = SchemaFactory.createForClass(Station);

StationSchema.pre('save', function (next) {
  this.stationId = `${Station.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
