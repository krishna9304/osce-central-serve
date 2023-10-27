import { Module } from '@nestjs/common';
import { AzureBlobUtil } from './azureblob.util';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        AZURE_BLOB_CONNECTION_STRING: Joi.string().required(),
        AZURE_BLOB_CONTAINER_NAME: Joi.string().required(),
      }),
      envFilePath: '.env',
    }),
  ],
  providers: [AzureBlobUtil],
  exports: [AzureBlobUtil],
})
export class UtilModule {}
