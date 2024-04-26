import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
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
import { UsagesRepository } from './repositories/usage.repository';
import {
  FREE_TRIAL_PAYMENT_ID,
  RechargeType,
  Usage,
  ValidityStatus,
} from './schemas/usage.schema';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly usagesRepository: UsagesRepository,
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

  async createUsageDocAndStartFreeTrial(user: Partial<User>) {
    try {
      const freeTrialDays = parseInt(
        this.configService.get<string>('FREE_TRIAL_DAYS'),
      );
      const recharge: RechargeType = {
        paymentId: FREE_TRIAL_PAYMENT_ID,
        rechargeAmount: 0,
        sessionsBought: 2,
        sessionsUsed: 0,
        startDate: Date.now(),
        endDate: new Date(
          new Date().setDate(new Date().getDate() + freeTrialDays),
        ).getTime(),
        validityStatus: ValidityStatus.ACTIVE,
      };
      const usage = await this.usagesRepository.create({
        userId: user.userId,
        rechargeHistory: [recharge],
      } as Usage);
      return usage;
    } catch (error) {
      throw new HttpException(
        `StripeError: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkUsableCreditsAndEligibility(user: Partial<User>): Promise<{
    message: string;
    eligibleRecharge: RechargeType;
  }> {
    try {
      const usage = await this.usagesRepository.findOne({
        userId: user.userId,
      });
      const recharges = usage.rechargeHistory;
      const activeRecharges = recharges.filter(
        (recharge) => recharge.validityStatus === ValidityStatus.ACTIVE,
      );

      if (!activeRecharges.length)
        return {
          message: 'No active recharge found.',
          eligibleRecharge: null,
        };

      const usableRecharges = activeRecharges.filter(
        (recharge) => recharge.sessionsUsed < recharge.sessionsBought,
      );

      if (!usableRecharges.length)
        return {
          message: 'You have exhausted all your sessions. Please recharge.',
          eligibleRecharge: null,
        };
      usableRecharges.sort((a, b) => a.startDate - b.startDate);
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

  async deductSessionFromRecharge(
    user: Partial<User>,
    recharge: RechargeType,
  ): Promise<boolean> {
    try {
      await this.usagesRepository.increaseSessionCount(user, recharge);
      return true;
    } catch (error) {
      console.log('Error while deducting sessions: ', error);
      return false;
    }
  }
}
