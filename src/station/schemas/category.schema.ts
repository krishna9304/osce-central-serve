import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AbstractDocument } from 'src/database/abstract.schema';

@Schema({ versionKey: false })
export class StationCategory extends AbstractDocument {
  _id: Types.ObjectId;

  @Prop({
    default: null,
    unique: true,
  })
  categoryId: string;

  @Prop({ required: true, unique: true })
  categoryName: string;

  @Prop({ required: true })
  categoryDescription: string;

  @Prop({ required: true })
  associatedStream: string;

  @Prop({ default: new Date().toISOString() })
  created_at: string;

  @Prop({ default: new Date().toISOString() })
  updated_at: string;

  @Prop({ default: null, type: Object })
  metadata: any;
}

export const StationCategorySchema =
  SchemaFactory.createForClass(StationCategory);

StationCategorySchema.pre('save', function (next) {
  this.categoryId = `${StationCategory.name}-${randomUUID()
    .replace('-', '')
    .slice(0, 10)}`;
  next();
});
