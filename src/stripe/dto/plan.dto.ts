import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { PlanType } from '../schemas/plan.schema';

export class PlanDto {
  planId: string;

  @IsString()
  @IsNotEmpty()
  planDisplayName: string;

  @IsString()
  @IsNotEmpty()
  planType: PlanType;

  @IsString()
  planDescription: string;

  @IsNumber()
  @IsNotEmpty()
  pricePerUnitPerMonth: number;

  @IsNumber()
  @IsNotEmpty()
  numberOfStations: number;

  couponCodeRef: string;

  created_at: number;
  updated_at: number;

  metadata: any;
}
