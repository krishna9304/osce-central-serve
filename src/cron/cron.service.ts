import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';

@Injectable()
export class CronService {
  private readonly logger: Logger = new Logger(CronService.name);
  constructor(
    private readonly examSessionsRepository: ExamSessionsRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredSessionUpdation() {
    try {
      await this.examSessionsRepository.updateExpiredSessions();
    } catch (error) {
      this.logger.error(`Error in updating expired sessions: ${error}`);
    }
  }
}
