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

  @Prop({ required: true, unique: true })
  stationName: string;

  @Prop({ required: true })
  stationCategory: string;

  @Prop({ required: true })
  candidateInstructions: string;

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

StationSchema.pre('save', function (next) {
  this.stationId = `${Station.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  next();
});
