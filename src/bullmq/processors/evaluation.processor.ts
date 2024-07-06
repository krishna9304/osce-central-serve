import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExamSession } from 'src/chat/schemas/session.schema';
import { Station } from 'src/station/schemas/station.schema';
import { StationService } from 'src/station/station.service';
import { User } from 'src/user/schemas/user.schema';

@Processor('evaluation')
export class EvaluationProcessor extends WorkerHost {
  constructor(private readonly stationService: StationService) {
    super();
  }

  async process(
    job: Job<{ session: ExamSession; user: User; station: Station }>,
  ): Promise<void> {
    const { session, user, station } = job.data;
    await this.stationService.prepareEvaluationResultsInBackground(
      session,
      user.userId,
      user.name,
      station,
    );
  } 
}
