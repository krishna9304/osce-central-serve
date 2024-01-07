import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsMobilePhone } from 'class-validator';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

export const TEST_USER = { PHONE_NUMBER: '+910000000000', OTP: '555555' };

@Schema({ versionKey: false })
export class User extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  userId: string;

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

UserSchema.pre('save', function (next) {
  this.userId = `${User.name}-${randomUUID().replace('-', '').slice(0, 10)}`;
  next();
});
