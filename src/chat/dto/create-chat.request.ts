import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateChatRequest {
  @IsNotEmpty()
  @IsString()
  role: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  created_at: number;

  updated_at: number;

  metadata: any;
}
