import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';
import { OpenAIModel } from './patient.schema';

export interface ChecklistItem {
  question: string;
  marks: number;
}

export interface NonClinicalChecklistItem {
  label: string;
  instructions: string;
}

@Schema({ versionKey: false })
export class Evaluator extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  evaluatorId: string;

  @Prop({ required: true })
  clinicalChecklist: Array<ChecklistItem>;

  @Prop({ required: true })
  associatedStation: string;

  @Prop({ default: OpenAIModel.GPT3_5_TURBO, enum: OpenAIModel })
  openAiModel: string;

  @Prop({ required: true })
  initialEvaluationPrompt: string;

  @Prop({ required: true })
  nonClinicalChecklist: Array<NonClinicalChecklistItem>;

  @Prop({ default: '' })
  additionalInstructions: string;

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const EvaluatorSchema = SchemaFactory.createForClass(Evaluator);

EvaluatorSchema.pre('save', function (next) {
  this.evaluatorId = `${Evaluator.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
