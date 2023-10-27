import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { UsersRepository } from './repositories/user.repository';
import { UtilModule } from 'src/utils/util.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    UtilModule,
  ],
  controllers: [UserController],
  providers: [UserService, UsersRepository],
  exports: [UserService],
})
export class UserModule {}
