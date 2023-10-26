import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/user.repository';
import { User } from './schemas/user.schema';
import { CreateUserRequest } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(request: CreateUserRequest): Promise<User> {
    await this.validateCreateUserRequest(request);
    const user = await this.usersRepository.create(request);

    delete user.metadata;

    return user;
  }

  async validate(phone: string, otp: string): Promise<User> {
    const user = await this.usersRepository.findOne({ phone });
    const otpIsValid = user.metadata.otp == otp;

    if (!otpIsValid) {
      throw new UnauthorizedException('Incorrect otp. Try again!');
    }

    await this.usersRepository.findOneAndUpdate({ phone }, { metadata: null });
    delete user.metadata;
    return user;
  }

  async updateMetadata(phone: string, metadata: any): Promise<void> {
    const user = await this.usersRepository.findOne({ phone });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const prevMetadata = user.metadata;
    await this.usersRepository.findOneAndUpdate(
      { phone },
      { metadata: { ...prevMetadata, ...metadata } },
    );
  }

  async getUser(filterQuery: Partial<User>): Promise<User> {
    const user: User = await this.usersRepository.findOne(filterQuery);

    delete user.metadata;
    return user;
  }

  async validateCreateUserRequest(request: Partial<CreateUserRequest>) {
    let exists: any;
    try {
      exists = await this.usersRepository.exists({
        $or: [{ email: request.email }, { phone: request.phone }],
      });
    } catch (err) {}

    if (exists) {
      throw new UnprocessableEntityException(
        'User with similar details already exists.',
      );
    }
  }
}
