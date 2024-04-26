import { Controller, Post, Req } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ApiResponse } from 'src/constants/apiResponse';
import { Request } from 'express';

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

  @Post('webhook/payment-status')
  async paymentStatusWebhook(@Req() request: Request) {
    let res = new ApiResponse('Payment failed.', null, 400, null);
    switch (request.body.type) {
      case 'checkout.session.completed':
        break;
      default:
        break;
    }

    return res.getResponse();
  }
}
