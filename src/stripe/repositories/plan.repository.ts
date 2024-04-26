import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Plan } from '../schemas/plan.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class PlansRepository extends AbstractRepository<Plan> {
  protected readonly logger = new Logger(PlansRepository.name);

  constructor(
    @InjectModel(Plan.name) planModel: Model<Plan>,
    @InjectConnection() connection: Connection,
  ) {
    super(planModel, connection);
  }
}
