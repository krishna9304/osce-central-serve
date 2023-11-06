import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsMobilePhone } from 'class-validator';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class User extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({ default: null })
  email: string;

  @Prop({ default: null })
  name: string;

  @Prop({ default: null })
  gender: string;

  @Prop({ default: null })
  profile_picture: string;

  @Prop({ default: null })
  dateOfBirth: string;

  @Prop({ required: true })
  @IsMobilePhone('en-IN')
  phone: string;

  @Prop({ default: 'inactive' })
  status: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: null })
  currentYearOfStudy: number;

  @Prop({ default: false })
  email_verified: boolean;

  @Prop({ default: false })
  phone_verified: boolean;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const UserSchema = SchemaFactory.createForClass(User);
