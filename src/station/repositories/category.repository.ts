import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { StationCategory } from '../schemas/category.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class StationCategoryRepository extends AbstractRepository<StationCategory> {
  protected readonly logger = new Logger(StationCategoryRepository.name);

  constructor(
    @InjectModel(StationCategory.name)
    stationCategoryModel: Model<StationCategory>,
    @InjectConnection() connection: Connection,
  ) {
    super(stationCategoryModel, connection);
  }
}
