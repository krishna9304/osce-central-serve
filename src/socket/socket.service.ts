import { Injectable, Scope } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable({ scope: Scope.DEFAULT })
export class SocketService {
  constructor(private readonly socketGateway: SocketGateway) {}

  async updateReportGenerationProgress(
    userId: string,
    percentage: string,
    score: number = null,
  ): Promise<void> {
    this.socketGateway.sendEvaluationReportGenerationProgress(
      userId,
      percentage,
      score,
    );
  }

  async throwError(userId: string, error: string): Promise<void> {
    this.socketGateway.sendError(userId, error);
  }
}
