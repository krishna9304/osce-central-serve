import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Subscription } from '../schemas/subscription.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class SubscriptionsRepository extends AbstractRepository<Subscription> {
  protected readonly logger = new Logger(SubscriptionsRepository.name);

  constructor(
    @InjectModel(Subscription.name) subscriptionModel: Model<Subscription>,
    @InjectConnection() connection: Connection,
  ) {
    super(subscriptionModel, connection);
  }
}
