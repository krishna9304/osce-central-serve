import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class Stream extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: `stream-${randomUUID().replace('-', '').slice(0, 10)}`,
    unique: true,
  })
  streamId: string;

  @Prop({ required: true })
  streamName: string;

  @Prop({ required: true })
  streamDescription: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const StreamSchema = SchemaFactory.createForClass(Stream);
