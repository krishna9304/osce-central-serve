import { Module, forwardRef } from '@nestjs/common';
import { StationController } from './station.controller';
import { StationService } from './station.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Station, StationSchema } from './schemas/station.schema';
import { AuthModule } from 'src/auth/auth.module';
import { StationsRepository } from './repositories/station.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Station.name, schema: StationSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [StationController],
  providers: [StationService, StationsRepository],
})
export class StationModule {}
