import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';
import { FindingValue } from 'src/station/schemas/patient.schema';

export enum ExamSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum FindingStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export interface FindingsRecord {
  id: string;
  finding: string;
  value?: FindingValue[];
  status: FindingStatus;
  marks: number;
  subcategory: string;
  image?: string;
}

@Schema({ versionKey: false })
export class ExamSession extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  sessionId: string;

  @Prop({ required: true })
  stationId: string;

  @Prop({ required: true })
  associatedUser: string;

  @Prop({ default: ExamSessionStatus.ACTIVE })
  status: string;

  @Prop({ default: null })
  startTime: number;

  @Prop({ default: null })
  endTime: number;

  @Prop({ default: [] })
  findingsRecord: Array<FindingsRecord>;

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const ExamSessionSchema = SchemaFactory.createForClass(ExamSession);

ExamSessionSchema.pre('save', function (next) {
  this.sessionId = `${ExamSession.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
