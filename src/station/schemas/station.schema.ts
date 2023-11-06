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
  systemPrompt: string;

  @Prop({ required: true })
  exampleConversations: string;

  @Prop({ default: null })
  deployedModelId: string;

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
