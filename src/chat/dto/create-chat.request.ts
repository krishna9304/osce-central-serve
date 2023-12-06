import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateChatRequest {
  @IsNotEmpty()
  @IsString()
  role: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  created_at: string;

  updated_at: string;

  metadata: any;
}
