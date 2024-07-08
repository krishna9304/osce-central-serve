// bullmq.module.ts
import { Logger, Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EvaluationProcessor } from './processors/evaluation.processor';
import * as Joi from 'joi';
import { StationModule } from 'src/station/station.module';
import { Redis } from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
      }),
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'evaluation',
    }),
    forwardRef(() => StationModule),
  ],
  providers: [EvaluationProcessor],
  exports: [BullModule],
})
export class BullProcessorModule {
  private readonly logger = new Logger(BullProcessorModule.name);

  constructor(private readonly configService: ConfigService) {
    this.checkRedisConnection();
  }

  private async checkRedisConnection() {
    const redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
    });

    try {
      await redisClient.ping();
      this.logger.log('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    } finally {
      redisClient.disconnect();
    }
  }
}
