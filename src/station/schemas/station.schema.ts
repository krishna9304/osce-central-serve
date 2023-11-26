import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export interface Conversation {
  user: string;
  assistant: string;
}

@Schema({ versionKey: false })
export class Station extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: `station-${randomUUID().replace('-', '').slice(0, 10)}`,
    unique: true,
  })
  stationId: string;

  @Prop({ required: true, unique: true })
  stationName: string;

  @Prop({ required: true })
  stationCategory: string;

  @Prop({ required: true })
  candidateInstructions: string;

  @Prop({ required: true, unique: true })
  characterName: string;

  @Prop({ default: null })
  characterImage: string;

  @Prop({ required: true })
  sex: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true })
  dateOfBirth: string;

  @Prop({ required: true })
  persona: string;

  @Prop({ required: true })
  patientPrompt: string;

  @Prop({ required: true })
  evaluatorPrompt: string;

  @Prop({ required: true })
  patientExampleConversations: string;

  @Prop({ default: null })
  deployedModelId: string;

  @Prop({ default: null })
  openaiJobId: string;

  @Prop({ default: 'inactive' })
  status: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const StationSchema = SchemaFactory.createForClass(Station);
