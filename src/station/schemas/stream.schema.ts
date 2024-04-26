import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class Stream extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  streamId: string;

  @Prop({ required: true })
  streamName: string;

  @Prop({ required: true })
  streamDescription: string;

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const StreamSchema = SchemaFactory.createForClass(Stream);

StreamSchema.pre('save', function (next) {
  this.streamId = `${Stream.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
