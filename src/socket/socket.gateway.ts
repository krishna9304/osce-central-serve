import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class SocketGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, Socket>();
  private readonly logger = new Logger(SocketGateway.name);

  handleDisconnect(client: Socket): void {
    this.removeSocketFromMap(client);
  }

  @SubscribeMessage('REG_SOC')
  handleSocRegister(client: Socket, payload: { user: string }): void {
    const user = payload.user;
    const existingSocket = this.userSocketMap.get(user);

    if (existingSocket && existingSocket !== client) {
      existingSocket.disconnect();
    }

    this.userSocketMap.set(user, client);

    this.printConnections();
  }

  private removeSocketFromMap(socket: Socket): void {
    const user = [...this.userSocketMap.entries()].find(
      ([_, socketItem]) => socketItem === socket,
    )?.[0];
    if (user) {
      this.userSocketMap.delete(user);
    }
  }

  private printConnections() {
    const connectedSocketsInfo: string[] = [];

    this.userSocketMap.forEach((_, user) => {
      connectedSocketsInfo.push(`User: ${user}`);
    });

    if (connectedSocketsInfo.length > 0) {
      const connectedSocketsCount = connectedSocketsInfo.length;
      const connectedSocketsMessage = connectedSocketsInfo.join('\n');
      this.logger.log(
        `Connected Sockets (${connectedSocketsCount}):\n${connectedSocketsMessage}`,
      );
    } else {
      this.logger.log('No connected sockets.');
    }
  }
}
