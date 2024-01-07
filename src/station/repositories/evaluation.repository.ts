import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Evaluation } from '../schemas/evaluation.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class EvaluationRepository extends AbstractRepository<Evaluation> {
  protected readonly logger = new Logger(EvaluationRepository.name);

  constructor(
    @InjectModel(Evaluation.name) evaluationModel: Model<Evaluation>,
    @InjectConnection() connection: Connection,
  ) {
    super(evaluationModel, connection);
  }
}
