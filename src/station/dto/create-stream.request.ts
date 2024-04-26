import { IsNotEmpty, IsString } from 'class-validator';

export class CreateStreamRequest {
  streamId: string;

  @IsNotEmpty()
  @IsString()
  streamName: string;

  @IsNotEmpty()
  @IsString()
  streamDescription: string;

  created_at: number;

  updated_at: number;

  metadata: any;
}
