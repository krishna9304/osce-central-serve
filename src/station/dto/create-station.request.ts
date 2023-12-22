import { IsNotEmpty, IsString } from 'class-validator';

export class CreateStationRequest {
  stationId: string;

  @IsNotEmpty()
  @IsString()
  stationName: string;

  @IsNotEmpty()
  @IsString()
  stationCategory: string;

  @IsNotEmpty()
  @IsString()
  candidateInstructions: string;

  status: string;

  created_at: string;

  updated_at: string;

  metadata: any;
}
