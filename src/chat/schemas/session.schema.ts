import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export enum ExamSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Schema({ versionKey: false })
export class ExamSession extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: `session-${randomUUID().replace('-', '').slice(0, 10)}`,
    unique: true,
  })
  sessionId: string;

  @Prop({ required: true })
  stationId: string;

  @Prop({ required: true })
  associatedUser: string;

  @Prop({ default: ExamSessionStatus.ACTIVE })
  status: string;

  @Prop({ default: Date.now() })
  startTime: string;

  @Prop({ default: null })
  endTime: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const ExamSessionSchema = SchemaFactory.createForClass(ExamSession);
