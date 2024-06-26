import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ApiResponse } from 'src/constants/apiResponse';
import { Request, query } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { isNumberString } from 'class-validator';
import {
  MINIMUM_SESSIONS_TO_BUY,
  SessionType,
} from './schemas/recharge.schema';
import { RechargePriceDto } from './dto/recharge-price.dto';
import { CouponDto } from './dto/coupon.dto';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /*
  @Post('plan')
  @UseGuards(JwtAuthGuard)
  async createPlan(@Body() planDto: PlanDto, @CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('You are not allowed to create a plan.');
    }
    const plan = await this.stripeService.createOscePlan(planDto);
    const res = new ApiResponse('Plan created successfully.', null, 200, plan);
    return res.getResponse();
  }

  @Get('upgrade-current-plan')
  @UseGuards(JwtAuthGuard)
  async upgradeCurrentPlan(@CurrentUser() user: User, @Req() reqBody: Request) {
    let multiples = reqBody.query['multiples']
      ? Number(reqBody.query['multiples'])
      : 1;

    const stripeSession = await this.stripeService.upgradeCurrentPlan(
      multiples,
      user,
    );
    const res = new ApiResponse(
      'Please continue with the payment. Your plan will be updated once the payment is successful.',
      null,
      200,
      { paymentUrl: stripeSession.url },
    );
    return res.getResponse();
  }

  @Put('update-plan/:planId')
  @UseGuards(JwtAuthGuard)
  async updatePlan(@CurrentUser() user: User, @Param('planId') planId: string) {
    await this.stripeService.changePlan(user, planId);
    const res = new ApiResponse('Plan updated successfully.', null, 200, null);
    return res.getResponse();
  }

  @Get('default-payment-method/:sessionId')
  async setDefaultPaymentMethod(
    @Param('sessionId') sessionId: string,
    @Res() response: Response,
  ) {
    const user = await this.stripeService.setDefaultPaymentMethod(sessionId);
    await this.stripeService.createFreeSubscription(user);
    response.redirect('https://www.osceai.uk/');
  }
  */

  @Post('recharge-price')
  @UseGuards(JwtAuthGuard)
  async createOrUpdateRechargePrice(
    @CurrentUser() user: User,
    @Body() body: RechargePriceDto,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('You are not authorised.');
    }
    const { product, price } = await this.stripeService.setRechargePrice(body);
    const res = new ApiResponse('Recharge price was set.', null, 200, {
      priceData: {
        rechargeId: product.id,
        rechargeName: product.name,
        rechargeDescription: product.description,
        baseRechargeAmount: price.unit_amount / 100,
      },
    });
    return res.getResponse();
  }

  @Get('recharge-price')
  @UseGuards(JwtAuthGuard)
  async getRechargePrice(@CurrentUser() user: User) {
    const { product, price } = await this.stripeService.getRechargePrice();
    const res = new ApiResponse('Recharge price fetched.', null, 200, {
      priceData: {
        rechargeId: product.id,
        rechargeName: product.name,
        rechargeDescription: product.description,
        baseRechargeAmount: price.unit_amount / 100,
      },
    });
    return res.getResponse();
  }

  @Get('recharge-checkout-url')
  @UseGuards(JwtAuthGuard)
  async buySessionsCheckoutUrl(
    @Req() request: Request,
    @CurrentUser() user: User,
  ) {
    if (!isNumberString(request.query['quantity'])) {
      throw new BadRequestException('Quantity must be a number.');
    }
    const quantity = parseInt(request.query['quantity'].toString());
    if (quantity < MINIMUM_SESSIONS_TO_BUY) {
      throw new BadRequestException(
        `You must buy at least ${MINIMUM_SESSIONS_TO_BUY} sessions.`,
      );
    }
    const stripeSession = await this.stripeService.getRechargeCheckoutUrl(
      user,
      quantity,
    );
    const res = new ApiResponse(
      'Please continue with the payment. Your session credits will be updated once the payment is successful.',
      null,
      200,
      { paymentUrl: stripeSession.url },
    );
    return res.getResponse();
  }

  @Get('recharge-history')
  @UseGuards(JwtAuthGuard)
  async rechargeHistory(@CurrentUser() user: User, @Query() query: any) {
    let userId;
    if (query.userId) {
      if (user.role !== 'admin' && user.userId !== query.userId) {
        throw new BadRequestException(
          'You are not authorised to view this data.',
        );
      }
      userId = query.userId;
    } else userId = user.userId;

    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    const recharges = await this.stripeService.getRecharges(
      userId,
      parseInt(query.page),
      parseInt(query.limit),
    );
    const res = new ApiResponse(
      'Recharge history fetched.',
      null,
      200,
      recharges,
    );
    return res.getResponse();
  }

  @Get('download-invoice/:invoiceId')
  @UseGuards(JwtAuthGuard)
  async downloadInvoice(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: string,
  ) {
    if (!invoiceId) {
      throw new BadRequestException('Invoice ID is required.');
    }
    const invoice = await this.stripeService.getDownloadInvoicePdfUrl(
      user,
      invoiceId,
    );
    const res = new ApiResponse('Invoice fetched.', null, 200, {
      invoiceUrl: invoice.url,
    });
    return res.getResponse();
  }

  @Post('webhook/payment-status')
  async paymentStatusWebhook(@Req() request: Request) {
    let res = new ApiResponse('Payment failed.', null, 400, null);
    switch (request.body.type) {
      case 'checkout.session.completed':
        if (request.body.data.object.payment_status !== 'paid') break;
        switch (request.body.data.object.metadata.SessionType) {
          case SessionType.RECHARGE:
            await this.stripeService.updateRechargeSuccess(
              request.body.data.object,
            );
            res = new ApiResponse(
              'Payment successful. Your session credits have been updated.',
              null,
              200,
              null,
            );
            break;
          default:
            console.log('Invalid session type.', request.body.data.object);
            break;
        }
        break;
      default:
        break;
    }

    return res.getResponse();
  }

  @Post('coupon')
  @UseGuards(JwtAuthGuard)
  async createCoupon(@CurrentUser() user: User, @Body() body: CouponDto) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException(
        'You are not authorised to create discount coupons.',
      );
    }
    const { coupon, promotionCodeData } =
      await this.stripeService.createDiscountCoupon(body);
    const res = new ApiResponse('Coupon created.', null, 200, {
      couponData: {
        couponId: coupon.id,
        couponName: coupon.name,
        couponType: coupon.percent_off ? 'percentage' : 'fixed',
        percentageOff: coupon.percent_off,
        fixedOff: coupon.amount_off,
        couponValidity: coupon.duration,
        minimumSessionsToOrder:
          promotionCodeData.metadata.minimumSessionsToOrder,
        promotionCode: promotionCodeData.code,
        description: promotionCodeData.metadata.description,
      },
    });
    return res.getResponse();
  }

  @Get('coupon')
  @UseGuards(JwtAuthGuard)
  async getCoupons() {
    const coupons = await this.stripeService.getAllPromotionCodes();
    const res = new ApiResponse('All active Coupons fetched.', null, 200, {
      couponCodes: coupons,
    });
    return res.getResponse();
  }

  @Delete('coupon/:couponId')
  @UseGuards(JwtAuthGuard)
  async deleteCoupon(
    @CurrentUser() user: User,
    @Param('couponId') couponId: string,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException(
        'You are not authorised to delete discount coupons.',
      );
    }
    await this.stripeService.deleteCoupon(couponId);
    const res = new ApiResponse('Coupon deleted.', null, 200, null);
    return res.getResponse();
  }
}
