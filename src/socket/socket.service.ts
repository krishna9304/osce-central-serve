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

  async emitMessage(
    payload: {
      content: string;
      sessionId: string;
    },
    userId,
  ): Promise<void> {
    this.socketGateway.handleChatCompletion(null, payload, userId);
  }

  async throwError(userId: string, error: string): Promise<void> {
    this.socketGateway.sendError(userId, error);
  }
}
