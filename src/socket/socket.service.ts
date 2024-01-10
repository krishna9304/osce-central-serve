import { Injectable, Scope } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable({ scope: Scope.DEFAULT })
export class SocketService {
  constructor(private readonly socketGateway: SocketGateway) {}

  async updateReportGenerationProgress(
    userId: string,
    percentage: string,
    pdfUrl: string = null,
  ): Promise<void> {
    this.socketGateway.sendEvaluationReportGenerationProgress(
      userId,
      percentage,
      pdfUrl,
    );
  }

  async throwError(userId: string, error: string): Promise<void> {
    this.socketGateway.sendError(userId, error);
  }
}
