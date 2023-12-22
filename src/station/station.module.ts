import { Module, forwardRef } from '@nestjs/common';
import { StationController } from './station.controller';
import { StationService } from './station.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Station, StationSchema } from './schemas/station.schema';
import { AuthModule } from 'src/auth/auth.module';
import { StationsRepository } from './repositories/station.repository';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UsersRepository } from 'src/user/repositories/user.repository';
import { UtilModule } from 'src/utils/util.module';
import { StreamRepository } from './repositories/stream.repository';
import { StationCategoryRepository } from './repositories/category.repository';
import { PatientRepository } from './repositories/patient.repository';
import { EvaluatorRepository } from './repositories/evaluator.repository';
import { Stream, StreamSchema } from './schemas/stream.schema';
import {
  StationCategory,
  StationCategorySchema,
} from './schemas/category.schema';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { Evaluator, EvaluatorSchema } from './schemas/evaluator.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Station.name, schema: StationSchema }]),
    MongooseModule.forFeature([{ name: Stream.name, schema: StreamSchema }]),
    MongooseModule.forFeature([
      { name: StationCategory.name, schema: StationCategorySchema },
    ]),
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    MongooseModule.forFeature([
      { name: Evaluator.name, schema: EvaluatorSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    UtilModule,
  ],
  controllers: [StationController],
  providers: [
    StationService,
    StationsRepository,
    UsersRepository,
    StreamRepository,
    StationCategoryRepository,
    PatientRepository,
    EvaluatorRepository,
  ],
})
export class StationModule {}
