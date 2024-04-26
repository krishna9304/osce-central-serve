import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { RechargeType, Usage } from '../schemas/usage.schema';
import { AbstractRepository } from 'src/database/abstract.repository';
import { User } from 'src/user/schemas/user.schema';

@Injectable()
export class UsagesRepository extends AbstractRepository<Usage> {
  protected readonly logger = new Logger(UsagesRepository.name);

  constructor(
    @InjectModel(Usage.name) usageModel: Model<Usage>,
    @InjectConnection() connection: Connection,
  ) {
    super(usageModel, connection);
  }

  async increaseSessionCount(user: Partial<User>, recharge: RechargeType) {
    await this.model.updateOne({ userId: user.userId }, [
      {
        $set: {
          rechargeHistory: {
            $map: {
              input: '$rechargeHistory',
              in: {
                $cond: {
                  if: { $eq: ['$$this.paymentId', recharge.paymentId] },
                  then: {
                    $mergeObjects: [
                      '$$this',
                      { sessionsUsed: { $add: ['$$this.sessionsUsed', 1] } },
                    ],
                  },
                  else: '$$this',
                },
              },
            },
          },
          updated_at: Date.now(),
        },
      },
    ]);
  }
}
