import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export interface Conversation {
  user: string;
  assistant: string;
}

@Schema({ versionKey: false })
export class Station extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({ required: true })
  stationName: string;

  @Prop({ required: true })
  stationCategory: string;

  @Prop({ required: true })
  candidateInstructions: string;

  @Prop({ required: true })
  characterName: string;

  @Prop({ required: true })
  sex: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true })
  dateOfBirth: string;

  @Prop({ required: true })
  persona: string;

  @Prop({ required: true })
  medicationHistory: string;

  @Prop({ required: true })
  familyHistory: string;

  @Prop({ required: true })
  allergies: string;

  @Prop({ required: true })
  travelHistory: string;

  @Prop({ required: true })
  occupation: string;

  @Prop({ required: true })
  socialHistory: string;

  @Prop({ required: true })
  surgicalHistory: string;

  @Prop({ required: true })
  sexualHistory: string;

  @Prop({ required: true })
  dietHistory: string;

  @Prop({ required: true })
  smokingHistory: string;

  @Prop({ required: true })
  alcoholHistory: string;

  @Prop({ required: true })
  recreationalDrugHistory: string;

  @Prop({ required: true })
  stressHistory: string;

  @Prop({ required: true })
  periodsHistory: string;

  @Prop({ required: true })
  pillHistory: string;

  @Prop({ required: true })
  pregnancyHistory: string;

  @Prop({ required: true })
  papSmearHistory: string;

  @Prop({ required: true })
  ideasConcernsExpectations: string;

  @Prop({ required: true })
  exampleConversations: string;

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
