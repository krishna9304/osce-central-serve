import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { AbstractRepository } from 'src/database/abstract.repository';
import { Chat } from '../schemas/chat.schema';

@Injectable()
export class ChatsRepository extends AbstractRepository<Chat> {
  protected readonly logger = new Logger(ChatsRepository.name);

  constructor(
    @InjectModel(Chat.name) chatModel: Model<Chat>,
    @InjectConnection() connection: Connection,
  ) {
    super(chatModel, connection);
  }
}
