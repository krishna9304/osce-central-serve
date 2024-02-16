import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/user.repository';
import { User } from './schemas/user.schema';
import { CreateUserRequest } from './dto/create-user.dto';
import { AzureBlobUtil } from 'src/utils/azureblob.util';

@Injectable()
export class UserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
  ) {}

  async createUser(
    request: any,
    initilaUserData: Partial<User> = null,
  ): Promise<User> {
    await this.validateCreateUserRequest(request);
    let user: User;
    if (initilaUserData) {
      user = await this.usersRepository.findOneAndUpdate(
        { phone: initilaUserData.phone },
        { ...request, status: 'active', updated_at: new Date().toISOString() },
      );
    } else user = await this.usersRepository.create(request);

    if (user.profile_picture) {
      user.profile_picture = await this.azureBlobUtil.getTemporaryPublicUrl(
        user.profile_picture,
      );
    }
    delete user.metadata;

    return user;
  }

  async validate(phone: string, otp: string): Promise<User> {
    const user = await this.usersRepository.findOne({ phone });
    if (!user.metadata || !user.metadata.otp) {
      throw new ForbiddenException('Illegal request.');
    }
    const otpIsValid = user.metadata.otp == otp;

    if (!otpIsValid) {
      throw new UnauthorizedException('Incorrect otp. Try again!');
    }

    await this.usersRepository.findOneAndUpdate(
      { phone },
      {
        phone_verified: true,
        updated_at: new Date().toISOString(),
        metadata: { ...user.metadata, otp: null },
      },
    );

    if (user.profile_picture) {
      user.profile_picture = await this.azureBlobUtil.getTemporaryPublicUrl(
        user.profile_picture,
      );
    }
    delete user.metadata;
    return user;
  }

  async updateMetadata(phone: string, metadata: any): Promise<void> {
    const userExists = await this.usersRepository.exists({ phone });
    if (!userExists) {
      await this.createUser({ phone });
    }
    const user = await this.usersRepository.findOne({ phone });
    const prevMetadata = user.metadata;
    await this.usersRepository.findOneAndUpdate(
      { phone },
      {
        updated_at: new Date().toISOString(),
        metadata: { ...prevMetadata, ...metadata },
      },
    );
  }

  async getUser(filterQuery: Partial<User>): Promise<User> {
    const user: User = await this.usersRepository.findOne(filterQuery);

    if (user.profile_picture) {
      user.profile_picture = await this.azureBlobUtil.getTemporaryPublicUrl(
        user.profile_picture,
      );
    }
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

  async updateProfile(
    file: Express.Multer.File,
    request: Partial<User>,
    user: User,
  ): Promise<User> {
    if (file) {
      request.profile_picture = await this.azureBlobUtil.uploadImage(file);
    }
    const updatedUser = await this.usersRepository.findOneAndUpdate(
      { _id: user._id },
      {
        ...request,
        updated_at: new Date().toISOString(),
      },
    );

    if (updatedUser.profile_picture) {
      updatedUser.profile_picture =
        await this.azureBlobUtil.getTemporaryPublicUrl(
          updatedUser.profile_picture,
        );
    }

    delete updatedUser.metadata;
    return updatedUser;
  }
}
