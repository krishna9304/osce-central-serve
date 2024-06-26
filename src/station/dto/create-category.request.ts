import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryRequest {
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  categoryName: string;

  @IsNotEmpty()
  @IsString()
  categoryDescription: string;

  @IsNotEmpty()
  @IsString()
  associatedStream: string;

  created_at: number;

  updated_at: number;

  metadata: any;
}
