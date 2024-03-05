import { Module } from '@nestjs/common';
import { AzureBlobUtil } from './azureblob.util';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { OpenAiUtil } from './openai.util';
import { UtilController } from './util.controller';
import { ElevenLabsUtil } from './elevenlabs.util';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        AZURE_BLOB_CONNECTION_STRING: Joi.string().required(),
        AZURE_BLOB_CONTAINER_NAME: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().required(),
        ELEVEN_LABS_API_KEY: Joi.string().required(),
        GPT_MODEL: Joi.string().required(),
      }),
      envFilePath: '.env',
    }),
  ],
  controllers: [UtilController],
  providers: [AzureBlobUtil, OpenAiUtil, ElevenLabsUtil],
  exports: [AzureBlobUtil, OpenAiUtil, ElevenLabsUtil],
})
export class UtilModule {}
