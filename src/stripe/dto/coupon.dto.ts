import { IsEnum, IsNumber, IsString } from 'class-validator';
import Stripe from 'stripe';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CouponValidity {
  FOREVER = 'forever',
  ONCE = 'once',
  MULTIPLE_MONTHS = 'repeating',
}

export class CouponDto {
  @IsString()
  couponName: string;

  @IsEnum(CouponType)
  couponType: CouponType;

  percentageOff: number;

  fixedOff: number;

  @IsEnum(CouponValidity)
  couponValidity: Stripe.Coupon.Duration;

  @IsNumber()
  minimumSessionsToOrder: number;

  @IsString()
  promotionCode: string;

  @IsString()
  description: string;
}
