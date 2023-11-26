import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { AbstractRepository } from 'src/database/abstract.repository';
import { ExamSession } from '../schemas/session.schema';

@Injectable()
export class ExamSessionsRepository extends AbstractRepository<ExamSession> {
  protected readonly logger = new Logger(ExamSessionsRepository.name);

  constructor(
    @InjectModel(ExamSession.name) examSessionModel: Model<ExamSession>,
    @InjectConnection() connection: Connection,
  ) {
    super(examSessionModel, connection);
  }
}
