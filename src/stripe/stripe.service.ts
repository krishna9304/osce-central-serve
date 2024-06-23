import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Station } from 'src/station/schemas/station.schema';
import { User } from 'src/user/schemas/user.schema';
import { Stripe } from 'stripe';
import { PlanDto } from './dto/plan.dto';
import { PlansRepository } from './repositories/plan.repository';
import { Plan, PlanType } from './schemas/plan.schema';
import { Subscription } from './schemas/subscription.schema';
import { SubscriptionsRepository } from './repositories/subscription.repository';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { RechargesRepository } from './repositories/recharge.repository';
import {
  BASE_SESSION_PRICE,
  FREE_TRIAL_DAYS,
  FREE_TRIAL_PAYMENT_ID,
  FREE_TRIAL_SESSIONS,
  MAX_DISCOUNT,
  MINIMUM_DISCOUNT_ELIGIBLE_SESSIONS,
  RechargeMetadata,
  Recharge,
  SessionType,
  ValidityStatus,
  STRIPE_RECHARGE_PRODUCT_ID,
} from './schemas/recharge.schema';
import { RechargePriceDto } from './dto/recharge-price.dto';
import { CouponDto, CouponType, CouponValidity } from './dto/coupon.dto';
import { EmailService } from 'src/email/email.service';
import axios from 'axios';
import fs from 'fs';
import { EmailTemplate } from 'src/email/templates';

interface PromoCodeData {
  couponId: string;
  promotionCode: string;
  minimumSessionsToOrder: number;
  description: string;
  discountType: CouponType;
  percentOff: number;
  fixedOff: number;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly rechargesRepository: RechargesRepository,
    private readonly emailService: EmailService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  async createCustomer(user: Partial<User>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: user.phone,
        metadata: {
          userId: user.userId,
        },
      });

      return customer;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      await this.stripe.customers.del(customerId);
      return true;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setDefaultPaymentMethod(sessionId: string): Promise<User> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['setup_intent'],
      });
      if (session.setup_intent && typeof session.setup_intent === 'object') {
        const setupIntent = session.setup_intent as Stripe.SetupIntent;
        if (setupIntent.payment_method) {
          await this.stripe.customers.update(session.customer as string, {
            invoice_settings: {
              default_payment_method: setupIntent.payment_method as string,
            },
          });
          const user = await this.usersRepository.findOne({
            stripeCustomerId: session.customer as string,
          });
          return user;
        }
      }
      throw new Error('No payment method found or setup intent is incomplete.');
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createStationProduct(
    station: Partial<Station>,
  ): Promise<Stripe.Product> {
    try {
      const stationProduct = await this.stripe.products.create({
        name: station.stationName,
        description: station.stationDescription,
        default_price_data: {
          currency: 'inr',
          unit_amount: station.pricePerUnit * 100,
        },
      });

      return stationProduct;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createOscePlan(plan: PlanDto): Promise<Plan> {
    try {
      const oscePlanProduct = await this.stripe.products.create({
        name: plan.planDisplayName,
        description: plan.planDescription,
        default_price_data: {
          currency: 'inr',
          unit_amount: plan.pricePerUnitPerMonth * 100,
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
        },
      });
      const oscePlan = await this.plansRepository.create({
        stripePlanId: oscePlanProduct.id,
        planDisplayName: plan.planDisplayName,
        planType: plan.planType,
        planDescription: plan.planDescription,
        pricePerUnitPerMonth: plan.pricePerUnitPerMonth,
        numberOfStations: plan.numberOfStations,
        couponCodeRef: plan.couponCodeRef,
      } as Plan);

      return oscePlan;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createFreeSubscription(user: Partial<User>): Promise<Subscription> {
    const subscriptionExists = await this.subscriptionsRepository.exists({
      userId: user.userId,
    });
    if (subscriptionExists)
      throw new ForbiddenException('You already have an active subscription.');

    const plan = await this.plansRepository.findOne({
      planType: PlanType.FREE,
    });
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
    });
    if (!paymentMethods.data.length)
      throw new ForbiddenException(
        'Please add a payment method before activating a subscription.',
      );
    try {
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        default_payment_method: paymentMethods.data[0].id,
        items: [
          {
            price_data: {
              currency: 'inr',
              product: plan.stripePlanId,
              unit_amount: plan.pricePerUnitPerMonth * 100,
              recurring: {
                interval: 'month',
                interval_count: 1,
              },
            },
            quantity: 1,
          },
        ],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      const subscription = await this.subscriptionsRepository.create({
        stripeSubscriptionId: stripeSubscription.id,
        userId: user.userId,
        planId: plan.planId,
        subscriptionStart: Date.now(),
        subscriptionEnd: new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        ).getTime(),
      } as Subscription);

      return subscription;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async changePlan(
    user: Partial<User>,
    newPlanId: string,
  ): Promise<Subscription> {
    const newPlanExists = await this.plansRepository.exists({
      planId: newPlanId,
    });

    if (!newPlanExists)
      throw new HttpException(
        'The plan you are trying to change to, does not exist.',
        HttpStatus.NOT_FOUND,
      );

    const newPlan = await this.plansRepository.findOne({
      planId: newPlanId,
    });
    const currentSubscription = await this.subscriptionsRepository.findOne({
      userId: user.userId,
    });

    if (currentSubscription.planId === newPlan.planId)
      throw new BadRequestException('You are already subscribed to this plan.');

    try {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        currentSubscription.stripeSubscriptionId,
      );
      const stripePlan = await this.stripe.products.retrieve(
        newPlan.stripePlanId,
      );
      const changePlanHistory = {
        oldPlanId: currentSubscription.planId,
        newPlanId: newPlan.planId,
        changeDate: Date.now(),
      };
      const updatedSubscription = await this.stripe.subscriptions.update(
        currentSubscription.stripeSubscriptionId,
        {
          items: [
            {
              id: stripeSubscription.items.data[0].id,
              price_data: {
                currency: 'inr',
                product: stripePlan.id,
                unit_amount: newPlan.pricePerUnitPerMonth * 100,
                recurring: {
                  interval: 'month',
                  interval_count: 1,
                },
              },
              quantity: 1,
            },
          ],
          proration_behavior: 'create_prorations',
        },
      );

      if (
        updatedSubscription.status == 'active' ||
        updatedSubscription.status == 'trialing'
      ) {
        const subscription =
          await this.subscriptionsRepository.findOneAndUpdate(
            {
              userId: user.userId,
            },
            {
              $set: {
                planId: newPlan.planId,
                subscriptionEnd: new Date(
                  new Date().setMonth(new Date().getMonth() + 1),
                ).getTime(),
                changePlanHistory: [
                  ...currentSubscription.changePlanHistory,
                  changePlanHistory,
                ],
                updated_at: Date.now(),
              },
            },
          );
        return subscription;
      } else
        throw new Error(
          'We could not charge you at the moment due to some issue with your payment method. Please try again.',
        );
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async upgradeCurrentPlan(
    multiples: number = 1,
    user: Partial<User>,
  ): Promise<Stripe.Checkout.Session> {
    const currentSubscription = await this.subscriptionsRepository.findOne({
      userId: user.userId,
    });
    const plan = await this.plansRepository.findOne({
      planId: currentSubscription.planId,
    });
    if (plan.planType === PlanType.FREE)
      throw new ForbiddenException(
        'You should atleast upgrade yourself to a basic plan to buy additional sessions.',
      );
    try {
      const paymentSession = await this.stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: 'https://www.osceai.uk/',
        cancel_url: 'https://www.osceai.uk/cancel',
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product: plan.stripePlanId,
              unit_amount: plan.pricePerUnitPerMonth * 100,
            },
            quantity: multiples,
          },
        ],
        invoice_creation: {
          enabled: true,
          invoice_data: {
            metadata: {
              UserId: user.userId,
              Name: user.name,
              Email: user.email,
              Phone: user.phone,
            },
          },
        },
      });
      return paymentSession;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePlanAndStartNewBillingCycle(object: Stripe.Invoice) {
    try {
      const user = await this.usersRepository.findOne({
        stripeCustomerId: object.customer as string,
      });
      const subscription = await this.subscriptionsRepository.findOne({
        userId: user.userId,
      });
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
      );
      const stripePlanId = stripeSubscription.items.data[0].price
        .product as string;
      const plan = await this.plansRepository.findOne({
        stripePlanId,
      });
      const changePlanHistory = {
        oldPlanId: subscription.planId,
        newPlanId: plan.planId,
        changeDate: Date.now(),
      };
      let subscriptionEndDate = new Date(
        new Date(subscription.subscriptionEnd).setMonth(
          new Date(subscription.subscriptionEnd).getMonth() + 1,
        ),
      ).getTime();

      if (subscription.subscriptionEnd < Date.now())
        subscriptionEndDate = new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        ).getTime();

      await this.subscriptionsRepository.findOneAndUpdate(
        {
          userId: user.userId,
        },
        {
          $set: {
            planId: plan.planId,
            subscriptionEnd: subscriptionEndDate,
            changePlanHistory: [
              ...subscription.changePlanHistory,
              changePlanHistory,
            ],
            updated_at: Date.now(),
          },
        },
      );
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePaymentSuccess(object: Stripe.Checkout.Session) {
    try {
      const user = await this.usersRepository.findOne({
        stripeCustomerId: object.customer as string,
      });
      const subscription = await this.subscriptionsRepository.findOne({
        userId: user.userId,
      });
      const plan = await this.plansRepository.findOne({
        planId: subscription.planId,
      });
      const totalAmount = object.amount_total / 100;
      const totalUnits = totalAmount / plan.pricePerUnitPerMonth;
      const totalAdditionalStationUnitsBought =
        totalUnits * plan.numberOfStations;
      await this.subscriptionsRepository.findOneAndUpdate(
        {
          userId: user.userId,
        },
        {
          $set: {
            additionalStationsBought:
              subscription.additionalStationsBought +
              totalAdditionalStationUnitsBought,
            updated_at: Date.now(),
          },
        },
      );
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createRechargeDocAndStartFreeTrial(user: Partial<User>) {
    try {
      const recharge = await this.rechargesRepository.create({
        userId: user.userId,
        paymentIntentId: FREE_TRIAL_PAYMENT_ID,
        sessionId: FREE_TRIAL_PAYMENT_ID,
        rechargeAmount: 0,
        sessionsBought: FREE_TRIAL_SESSIONS,
        sessionsUsed: 0,
        startDate: Date.now(),
        endDate: new Date(
          new Date().setDate(new Date().getDate() + FREE_TRIAL_DAYS),
        ).getTime(),
        validityStatus: ValidityStatus.ACTIVE,
      } as Recharge);
      return recharge;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkUsableCreditsAndEligibility(user: Partial<User>): Promise<{
    message: string;
    eligibleRecharge: Recharge;
  }> {
    try {
      const usableRecharges = await this.rechargesRepository.find(
        {
          userId: user.userId,
          validityStatus: ValidityStatus.ACTIVE,
          $expr: {
            $lt: ['$sessionsUsed', '$sessionsBought'],
          },
        },
        {
          page: 1,
          limit: 1,
          sort: {
            startDate: 1,
          },
        },
      );

      if (!usableRecharges.length)
        return {
          message:
            'Oops! Either you do not have an active recharge or have exhausted all your sessions.',
          eligibleRecharge: null,
        };
      return {
        message: 'You are eligible to start a new session.',
        eligibleRecharge: usableRecharges[0],
      };
    } catch (error) {
      console.log('Error while checking usable credits: ', error);
      return {
        message: 'Error while checking usable credits.',
        eligibleRecharge: null,
      };
    }
  }

  async deductSessionFromRecharge(recharge: Recharge): Promise<boolean> {
    try {
      await this.rechargesRepository.increaseSessionCount(recharge);
      return true;
    } catch (error) {
      console.log('Error while deducting sessions: ', error);
      return false;
    }
  }

  calculateDiscountedTotalPrice(quantity: number): number {
    let discountRate;
    if (quantity < MINIMUM_DISCOUNT_ELIGIBLE_SESSIONS) {
      discountRate = 0;
    } else {
      discountRate = Math.log(quantity) / 7 / 3;
      discountRate = Math.min(discountRate, MAX_DISCOUNT);
    }

    const pricePerItem = BASE_SESSION_PRICE * (1 - discountRate);
    const totalPrice = pricePerItem * quantity;

    return parseFloat(totalPrice.toFixed(2));
  }

  async getRechargeCheckoutUrl(
    user: User,
    quantity: number,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const rechargePriceData = await this.stripe.products.retrieve(
        STRIPE_RECHARGE_PRODUCT_ID,
      );
      const stripePrice = await this.stripe.prices.retrieve(
        rechargePriceData.default_price as string,
      );
      const metadata: RechargeMetadata | any = {
        UserId: user.userId,
        Name: user.name,
        Email: user.email,
        Phone: user.phone,
        SessionsBought: quantity,
        SessionType: SessionType.RECHARGE,
      };
      const paymentSession = await this.stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: 'https://www.osceai.uk/',
        cancel_url: 'https://www.osceai.uk/cancel',
        allow_promotion_codes: true,
        line_items: [
          {
            price: rechargePriceData.default_price as string,
            quantity,
          },
        ],
        invoice_creation: {
          enabled: true,
          invoice_data: {
            metadata,
          },
        },
        metadata,
      });
      await this.rechargesRepository.create({
        userId: user.userId,
        sessionId: paymentSession.id,
        rechargeAmount: (stripePrice.unit_amount / 100) * quantity,
        sessionsBought: quantity,
        sessionsUsed: 0,
        startDate: Date.now(),
        endDate: Date.now(),
        validityStatus: ValidityStatus.PAYMENT_PENDING,
      } as Recharge);
      return paymentSession;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async downloadReceiptPdf(paymentIntentId: string): Promise<Buffer> {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || !paymentIntent.latest_charge) {
      throw new HttpException(
        'Payment Intent not found or has no charges.',
        HttpStatus.NOT_FOUND,
      );
    }
    const chargeId = paymentIntent.latest_charge as string;
    const charge = await this.stripe.charges.retrieve(chargeId);

    if (!charge || !charge.receipt_url) {
      throw new HttpException('Receipt not found.', HttpStatus.NOT_FOUND);
    }
    const pdfUrl = `${charge.receipt_url.split('?')[0]}/pdf`;

    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data, 'binary');
  }

  async updateRechargeSuccess(object: Stripe.Checkout.Session): Promise<void> {
    const userExist = await this.usersRepository.exists({
      stripeCustomerId: object.customer as string,
    });
    if (!userExist)
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    const rechargeExist = await this.rechargesRepository.exists({
      sessionId: object.id,
    });
    if (!rechargeExist)
      throw new HttpException(
        'Recharge not found in history.',
        HttpStatus.NOT_FOUND,
      );

    const recharge = await this.rechargesRepository.findOne({
      sessionId: object.id,
    });

    if (recharge.validityStatus === ValidityStatus.ACTIVE)
      throw new HttpException(
        'Recharge is already active.',
        HttpStatus.FORBIDDEN,
      );

    try {
      const user = await this.usersRepository.findOne({
        stripeCustomerId: object.customer as string,
      });
      await this.rechargesRepository.updatePaymentSuccessAndAddValidity(object);

      const { invoiceNumber } = await this.getDownloadInvoicePdfUrl(
        user,
        recharge.invoiceId,
      );
      const pdfBuffer = await this.downloadReceiptPdf(
        object.payment_intent as string,
      );

      const base64Content = pdfBuffer.toString('base64');

      await this.emailService.sendEmail(
        user.email,
        EmailTemplate.recharge_success,
        [
          {
            filename: `Receipt-${invoiceNumber}.pdf`,
            content: base64Content,
            disposition: 'attachment',
            type: 'application/pdf',
          },
        ],
      );
    } catch (error) {
      throw new HttpException(
        `InternalServerError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getRecharges(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Recharge[]> {
    const userExists = await this.usersRepository.exists({
      userId,
    });
    if (!userExists)
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    try {
      const recharges = await this.rechargesRepository.find(
        {
          userId,
        },
        {
          page,
          limit,
          sort: {
            endDate: -1,
          },
        },
      );
      return recharges;
    } catch (error) {
      throw new HttpException(
        `InternalServerError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDownloadInvoicePdfUrl(
    user: User,
    invoiceId: string,
  ): Promise<{
    url: string;
    invoiceNumber: string;
  }> {
    const invoiceExists = await this.rechargesRepository.exists({
      invoiceId,
    });
    if (!invoiceExists)
      throw new HttpException(
        'Invoice not found. Either invoice ID is incorrect or invoice is not generated, as the payment might be pending.',
        HttpStatus.NOT_FOUND,
      );

    const recharge = await this.rechargesRepository.findOne({
      invoiceId,
    });

    if (recharge.userId !== user.userId && user.role !== 'admin')
      throw new HttpException(
        'You are not authorized to download this invoice.',
        HttpStatus.FORBIDDEN,
      );

    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return {
        url: invoice.invoice_pdf,
        invoiceNumber: invoice.number,
      };
    } catch (error) {
      throw new HttpException(
        `InternalServerError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setRechargePrice(
    data: RechargePriceDto,
  ): Promise<{ product: Stripe.Product; price: Stripe.Price }> {
    let product: Stripe.Product = null;
    let priceData: Stripe.Price = null;
    try {
      product = await this.stripe.products.retrieve(STRIPE_RECHARGE_PRODUCT_ID);
      const rechargeName = data.rechargeName ? data.rechargeName : product.name;
      const rechargeDescription = data.rechargeDescription
        ? data.rechargeDescription
        : product.description;

      priceData = await this.stripe.prices.retrieve(
        product.default_price as string,
      );
      const baseRechargeAmount = data.baseRechargeAmount
        ? data.baseRechargeAmount
        : priceData.unit_amount / 100;

      product = await this.stripe.products.update(STRIPE_RECHARGE_PRODUCT_ID, {
        name: rechargeName,
        description: rechargeDescription,
      });

      if (priceData.unit_amount !== baseRechargeAmount * 100) {
        const newPrice = await this.stripe.prices.create({
          currency: 'inr',
          product: STRIPE_RECHARGE_PRODUCT_ID,
          unit_amount: baseRechargeAmount * 100,
        });
        product = await this.stripe.products.update(
          STRIPE_RECHARGE_PRODUCT_ID,
          {
            default_price: newPrice.id,
          },
        );
        await this.stripe.prices.update(priceData.id, {
          active: false,
        });
        priceData = newPrice;
      }
    } catch (_) {
      product = await this.stripe.products.create({
        id: STRIPE_RECHARGE_PRODUCT_ID,
        name: data.rechargeName,
        active: true,
        description: data.rechargeDescription,
        default_price_data: {
          currency: 'inr',
          unit_amount: data.baseRechargeAmount * 100,
        },
      });
    }
    return { product, price: priceData };
  }

  async getRechargePrice(): Promise<{
    product: Stripe.Product;
    price: Stripe.Price;
  }> {
    try {
      const product = await this.stripe.products.retrieve(
        STRIPE_RECHARGE_PRODUCT_ID,
      );
      const price = await this.stripe.prices.retrieve(
        product.default_price as string,
      );
      return { product, price };
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createDiscountCoupon(couponRequestData: CouponDto): Promise<{
    coupon: Stripe.Coupon;
    promotionCodeData: Stripe.PromotionCode;
  }> {
    try {
      const couponData: Stripe.CouponCreateParams = {
        name: couponRequestData.couponName,
        percent_off:
          couponRequestData.couponType === CouponType.PERCENTAGE
            ? couponRequestData.percentageOff
            : undefined,
        amount_off:
          couponRequestData.couponType === CouponType.FIXED
            ? couponRequestData.fixedOff * 100
            : undefined,
        currency: 'inr',
        duration: couponRequestData.couponValidity,
        duration_in_months:
          couponRequestData.couponValidity === CouponValidity.MULTIPLE_MONTHS
            ? 3
            : undefined,
        metadata: {
          couponType: couponRequestData.couponType,
        },
      };

      const coupon = await this.stripe.coupons.create(couponData);

      const rechargePriceData = await this.stripe.products.retrieve(
        STRIPE_RECHARGE_PRODUCT_ID,
      );
      const rechargePrice = await this.stripe.prices.retrieve(
        rechargePriceData.default_price as string,
      );

      const minimumOrderAmount =
        rechargePrice.unit_amount * couponRequestData.minimumSessionsToOrder;

      const promotionCodeData = await this.stripe.promotionCodes.create({
        coupon: coupon.id,
        code: couponRequestData.promotionCode,
        active: true,
        restrictions: {
          minimum_amount: minimumOrderAmount,
          minimum_amount_currency: 'inr',
        },
        metadata: {
          minimumSessionsToOrder: couponRequestData.minimumSessionsToOrder,
          description: couponRequestData.description,
        },
      });
      return { coupon, promotionCodeData };
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllPromotionCodes(): Promise<PromoCodeData[]> {
    try {
      const promotionCodes = await this.stripe.promotionCodes.list({
        active: true,
      });

      let allPromotionCodes: Array<PromoCodeData> = [];

      for (const promotionCode of promotionCodes.data) {
        const coupon = await this.stripe.coupons.retrieve(
          promotionCode.coupon.id as string,
        );
        allPromotionCodes.push({
          promotionCode: promotionCode.code,
          couponId: coupon.id,
          minimumSessionsToOrder: parseInt(
            promotionCode.metadata.minimumSessionsToOrder,
          ),
          description: promotionCode.metadata.description,
          discountType: coupon.metadata.couponType as CouponType,
          percentOff: coupon.percent_off,
          fixedOff: coupon.amount_off,
        });
      }
      return allPromotionCodes;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteCoupon(couponId: string): Promise<void> {
    try {
      await this.stripe.coupons.retrieve(couponId);
    } catch (error) {
      throw new BadRequestException('Coupon not found.');
    }

    try {
      await this.stripe.coupons.del(couponId);
    } catch (error) {
      throw new InternalServerErrorException(`StripeError: ${error.message}`);
    }
  }
}
