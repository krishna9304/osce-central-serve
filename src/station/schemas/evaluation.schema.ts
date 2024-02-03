import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export interface NonClinicalChecklistMarkingItem {
  label: string;
  score: number;
}

export interface ClinicalChecklistMarkingItem {
  question: string;
  score: number;
}

@Schema({ versionKey: false })
export class Evaluation extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  evaluationId: string;

  @Prop({ default: 0 })
  marksObtained: number;

  @Prop({ default: 12 })
  totalMarks: number;

  @Prop({ default: null })
  evaluationReportPdf: string;

  @Prop({ required: true })
  nonClinicalChecklist: Array<NonClinicalChecklistMarkingItem>;

  @Prop({ required: true })
  clinicalChecklist: Array<ClinicalChecklistMarkingItem>;

  @Prop({ required: true })
  associatedSession: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const EvaluationSchema = SchemaFactory.createForClass(Evaluation);

EvaluationSchema.pre('save', function (next) {
  this.evaluationId = `${Evaluation.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  next();
});
