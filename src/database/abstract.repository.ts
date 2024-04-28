import { Logger, NotFoundException } from '@nestjs/common';
import {
  FilterQuery,
  Model,
  Types,
  UpdateQuery,
  SaveOptions,
  Connection,
  InferId,
} from 'mongoose';
import { AbstractDocument } from './abstract.schema';

export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly model: Model<TDocument>,
    private readonly connection: Connection,
  ) {}

  async create(
    document: Omit<TDocument, '_id'>,
    options?: SaveOptions,
  ): Promise<TDocument> {
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });
    return (
      await createdDocument.save(options)
    ).toJSON() as unknown as TDocument;
  }

  async findOne(filterQuery: FilterQuery<TDocument>): Promise<TDocument> {
    const document: TDocument | any = await this.model.findOne(
      filterQuery,
      {},
      { lean: true },
    );

    if (!document) {
      this.logger.warn('Document not found with filterQuery', filterQuery);
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  async exists(
    filterQuery: FilterQuery<TDocument>,
  ): Promise<{ _id: InferId<TDocument> }> {
    const document = await this.model.exists(filterQuery);

    if (!document) {
      this.logger.warn('Document not found with filterQuery', filterQuery);
      return null;
    }

    return document;
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
    options: any = {},
  ) {
    const defaultOptions = {
      lean: true,
      new: true,
    };
    const mergedOptions = { ...defaultOptions, ...options };
    const document = await this.model.findOneAndUpdate(
      filterQuery,
      update,
      mergedOptions,
    );

    if (!document) {
      this.logger.warn(`Document not found with filterQuery:`, filterQuery);
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  async updateMany(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ) {
    return this.model.updateMany(filterQuery, update, { lean: true });
  }

  async upsert(
    filterQuery: FilterQuery<TDocument>,
    document: Partial<TDocument>,
  ) {
    return this.model.findOneAndUpdate(filterQuery, document, {
      lean: true,
      upsert: true,
      new: true,
    });
  }

  async find(
    filterQuery: FilterQuery<TDocument>,
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {
      page: 1,
      limit: 10,
      sort: { created_at: -1 },
    },
  ) {
    return this.model.find(
      filterQuery,
      {},
      {
        lean: true,
        skip: (options.page - 1) * options.limit,
        limit: options.limit,
        sort: options.sort,
      },
    );
  }

  async deleteOne(filterQuery: FilterQuery<TDocument>) {
    return this.model.deleteOne(filterQuery, { lean: true });
  }

  async delete(filterQuery: FilterQuery<TDocument>) {
    return this.model.deleteMany(filterQuery, { lean: true });
  }

  async startTransaction() {
    const session = await this.connection.startSession();
    session.startTransaction();
    return session;
  }
}
