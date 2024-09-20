import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { AbstractRepository } from 'src/database/abstract.repository';
import { ExamSession, ExamSessionStatus } from '../schemas/session.schema';

@Injectable()
export class ExamSessionsRepository extends AbstractRepository<ExamSession> {
  protected readonly logger = new Logger(ExamSessionsRepository.name);

  constructor(
    @InjectModel(ExamSession.name) examSessionModel: Model<ExamSession>,
    @InjectConnection() connection: Connection,
  ) {
    super(examSessionModel, connection);
  }

  async updateExpiredSessions() {
    const currentTime = Date.now();

    const result = await this.model.aggregate([
      {
        $match: {
          status: ExamSessionStatus.ACTIVE,
          endTime: { $lt: currentTime },
        },
      },
      {
        $set: {
          status: ExamSessionStatus.COMPLETED,
          updated_at: currentTime,
        },
      },
      {
        $merge: {
          into: this.model.collection.name,
          on: '_id',
          whenMatched: 'merge',
          whenNotMatched: 'discard',
        },
      },
    ]);

    this.logger.debug(`CronRunner: Updated expired sessions.`);
    return result;
  }
}
