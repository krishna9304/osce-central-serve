import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlanDto } from './dto/plan.dto';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { StripeService } from './stripe.service';
import { ApiResponse } from 'src/constants/apiResponse';
import { Request, Response } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

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

  @Post('webhook/payment-status')
  async paymentStatusWebhook(@Req() request: Request) {
    let res = new ApiResponse('Payment failed.', null, 400, null);
    switch (request.body.type) {
      case 'checkout.session.completed':
        if (request.body.data.object.payment_status === 'paid') {
          await this.stripeService.updatePaymentSuccess(
            request.body.data.object,
          );
          res = new ApiResponse('Payment was successful.', null, 200, null);
        }
        break;
      case 'invoice.paid':
        if (request.body.data.object.subscription) {
          await this.stripeService.updatePlanAndStartNewBillingCycle(
            request.body.data.object,
          );
          res = new ApiResponse(
            'Invoice was paid successfully.',
            null,
            200,
            null,
          );
        }
        break;
      case 'invoice.payment_failed':
        break;
      default:
        break;
    }

    return res.getResponse();
  }
}
