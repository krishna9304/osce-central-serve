import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Station } from '../schemas/station.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class StationsRepository extends AbstractRepository<Station> {
  protected readonly logger = new Logger(StationsRepository.name);

  constructor(
    @InjectModel(Station.name) stationModel: Model<Station>,
    @InjectConnection() connection: Connection,
  ) {
    super(stationModel, connection);
  }
}
