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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Station.name, schema: StationSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    UtilModule,
  ],
  controllers: [StationController],
  providers: [StationService, StationsRepository, UsersRepository],
})
export class StationModule {}
