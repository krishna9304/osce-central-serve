import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class Chat extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: null })
  created_at: number;

  @Prop({ default: null })
  updated_at: number;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

ChatSchema.pre('save', function (next) {
  this.created_at = Date.now();
  this.updated_at = Date.now();
  next();
});
