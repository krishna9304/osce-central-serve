import { Injectable, Scope } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable({ scope: Scope.DEFAULT })
export class SocketService {
  constructor(private readonly socketGateway: SocketGateway) {}

  async updateReportGenerationProgress(
    userId: string,
    sessionId: string,
    percentage: string,
    score: number = null,
  ): Promise<void> {
    this.socketGateway.sendEvaluationReportGenerationProgress(
      userId,
      percentage,
      score,
      sessionId,
    );
  }

  async emitMessage(
    payload: {
      content: string;
      sessionId: string;
    },
    userId: string,
    isInitialMessage: boolean = false,
  ): Promise<void> {
    this.socketGateway.handleChatCompletion(
      null,
      payload,
      userId,
      isInitialMessage,
    );
  }

  async throwError(userId: string, error: string): Promise<void> {
    this.socketGateway.sendError(userId, error);
  }
}
