import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export interface Conversation {
  user: string;
  assistant: string;
}

export interface Findings {
  image?: string;
  name: string;
  value: string;
  marks: number;
  subcategory: string;
}

export interface ContextualParam {
  heading: string;
  description: string;
}

@Schema({ versionKey: false })
export class Patient extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  patientId: string;

  @Prop({ required: true, unique: true })
  patientName: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ required: true })
  sex: string;

  @Prop({ required: true })
  age: string;

  @Prop({ required: true })
  dateOfBirth: string;

  @Prop({ required: true })
  persona: string;

  @Prop({ required: true })
  presentingComplaint: string;

  @Prop({ required: true })
  historyOfPresentingComplaint: string;

  @Prop({ default: [] })
  additionalContextualParameters: Array<ContextualParam>;

  @Prop({ default: '' })
  ideasConcernsExpectations: string;

  @Prop({ required: true })
  exampleConversations: string;

  @Prop({ required: true })
  associatedStation: string;

  @Prop({ default: [] })
  findings: Array<Findings>;

  @Prop({ required: true })
  voiceId11Labs: string;

  @Prop({ default: '' })
  patientSpecificAdditionalInstructions: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

PatientSchema.pre('save', function (next) {
  this.patientId = `${Patient.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  next();
});
