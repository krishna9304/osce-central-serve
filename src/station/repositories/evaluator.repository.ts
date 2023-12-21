import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Evaluator } from '../schemas/evaluator.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class EvaluatorRepository extends AbstractRepository<Evaluator> {
  protected readonly logger = new Logger(EvaluatorRepository.name);

  constructor(
    @InjectModel(Evaluator.name) evaluatorModel: Model<Evaluator>,
    @InjectConnection() connection: Connection,
  ) {
    super(evaluatorModel, connection);
  }
}
