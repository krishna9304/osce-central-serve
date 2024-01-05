import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class Evaluator extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  evaluatorId: string;

  @Prop({ required: true })
  clinicalChecklist: Array<string>;

  @Prop({ required: true })
  associatedStation: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const EvaluatorSchema = SchemaFactory.createForClass(Evaluator);

EvaluatorSchema.pre('save', function (next) {
  this.evaluatorId = `${Evaluator.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  next();
});
