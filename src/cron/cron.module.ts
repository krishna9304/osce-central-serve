import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { StationModule } from 'src/station/station.module';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ExamSession,
  ExamSessionSchema,
} from 'src/chat/schemas/session.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: ExamSession.name, schema: ExamSessionSchema },
    ]),
  ],
  providers: [CronService, ExamSessionsRepository],
  exports: [CronService],
})
export class CronModule {}
