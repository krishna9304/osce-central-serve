import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateStationRequest {
  _id: Types.ObjectId;

  stationId: string;

  stripeProductId: string;

  @IsNotEmpty()
  @IsString()
  stationName: string;

  @IsNotEmpty()
  @IsString()
  stationDescription: string;

  @IsNotEmpty()
  @IsNumber()
  pricePerUnit: number;

  @IsNotEmpty()
  @IsString()
  stationCategory: string;

  @IsNotEmpty()
  @IsString()
  candidateInstructions: string;

  status: string;

  freeTierEligible: boolean;

  created_at: number;

  updated_at: number;

  metadata: any;
}
