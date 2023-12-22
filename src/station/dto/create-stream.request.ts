import { IsNotEmpty, IsString } from 'class-validator';

export class CreateStreamRequest {
  streamId: string;

  @IsNotEmpty()
  @IsString()
  streamName: string;

  @IsNotEmpty()
  @IsString()
  streamDescription: string;

  created_at: string;

  updated_at: string;

  metadata: any;
}
