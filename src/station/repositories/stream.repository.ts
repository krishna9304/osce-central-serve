import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Stream } from '../schemas/stream.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class StreamRepository extends AbstractRepository<Stream> {
  protected readonly logger = new Logger(StreamRepository.name);

  constructor(
    @InjectModel(Stream.name) streamModel: Model<Stream>,
    @InjectConnection() connection: Connection,
  ) {
    super(streamModel, connection);
  }
}
