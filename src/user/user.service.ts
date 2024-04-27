import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/user.repository';
import { User } from './schemas/user.schema';
import { CreateUserRequest } from './dto/create-user.dto';
import { AzureBlobUtil } from 'src/utils/azureblob.util';
import { StripeService } from 'src/stripe/stripe.service';
import { ExamSessionsRepository } from 'src/chat/repositories/examSession.repository';
import { ChatsRepository } from 'src/chat/repositories/chat.repository';
import { EvaluationRepository } from 'src/station/repositories/evaluation.repository';
import { UsagesRepository } from 'src/stripe/repositories/usage.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly azureBlobUtil: AzureBlobUtil,
    private readonly stripeService: StripeService,
    private readonly examSessionsRepository: ExamSessionsRepository,
    private readonly chatsRepository: ChatsRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly usagesRepository: UsagesRepository,
  ) {}

  async createUser(
    request: Partial<User>,
    initilaUserData: Partial<User> = null,
  ): Promise<User> {
    await this.validateCreateUserRequest(request);
    let user: User;
    if (initilaUserData) {
      const customer = await this.stripeService.createCustomer({
        email: request.email,
        name: request.name,
        phone: initilaUserData.phone,
        userId: initilaUserData.userId,
      });

      user = await this.usersRepository.findOneAndUpdate(
        { phone: initilaUserData.phone },
        {
          ...request,
          status: 'active',
          stripeCustomerId: customer.id,
          updated_at: Date.now(),
        },
      );
      await this.stripeService.createUsageDocAndStartFreeTrial(user);
    } else user = await this.usersRepository.create(request as User);

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
        updated_at: Date.now(),
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
        updated_at: Date.now(),
        metadata: { ...prevMetadata, ...metadata },
      },
    );
  }

  async getUser(filterQuery: Partial<User>): Promise<User | null> {
    const userExists = await this.usersRepository.exists(filterQuery);
    if (!userExists) {
      return null;
    }
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
    } else if (request.profile_picture) {
      await this.azureBlobUtil.getTemporaryPublicUrl(request.profile_picture);
    }

    const updatedUser = await this.usersRepository.findOneAndUpdate(
      { _id: user._id },
      {
        ...request,
        updated_at: Date.now(),
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

  validateUpdateProfileRequest(request: Partial<User>, user: User): string[] {
    if (user.role === 'admin') return [];
    const restrictedFields = [
      'phone',
      'phone_verified',
      'email_verified',
      'stripeCustomerId',
      'metadata',
      'status',
      'created_at',
      'updated_at',
      'userId',
      'role',
    ];

    let errors = [];
    for (let field of restrictedFields) {
      if (request[field]) {
        errors.push(field);
        delete request[field];
      }
    }

    return errors;
  }

  async createUserByAdmin(file, request: CreateUserRequest): Promise<User> {
    await this.validateCreateUserRequest(request);
    if (file)
      request.profile_picture = await this.azureBlobUtil.uploadImage(file);
    else if (request.profile_picture) {
      await this.azureBlobUtil.getTemporaryPublicUrl(request.profile_picture);
    }
    const userCreated = await this.usersRepository.create(request);
    const customer = await this.stripeService.createCustomer({
      email: request.email,
      name: request.name,
      phone: request.phone,
      userId: userCreated.userId,
    });

    const updatedUser = await this.usersRepository.findOneAndUpdate(
      { userId: userCreated.userId },
      {
        stripeCustomerId: customer.id,
        updated_at: Date.now(),
      },
    );

    await this.stripeService.createUsageDocAndStartFreeTrial(updatedUser);

    delete updatedUser.metadata;
    return updatedUser;
  }

  async getUsers(
    userIds: string | null,
    page: number,
    limit: number,
  ): Promise<User[]> {
    let users = [];
    if (!userIds) users = await this.usersRepository.find({}, { page, limit });
    else {
      const userIdsList = userIds.split(',');
      users = await this.usersRepository.find(
        { userId: { $in: userIdsList } },
        { page, limit },
      );
    }

    for (let user of users) {
      if (user.profile_picture) {
        user.profile_picture = await this.azureBlobUtil.getTemporaryPublicUrl(
          user.profile_picture,
        );
      }
      delete user.metadata;
    }

    return users;
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const userExists = await this.usersRepository.exists({ userId });
      if (!userExists) {
        throw new Error('User not found');
      }
      const sessions = await this.examSessionsRepository.find({
        associatedUsers: userId,
      });
      const sessionIds = sessions.map((session) => session.sessionId);
      await this.chatsRepository.delete({
        sessionId: { $in: sessionIds },
      });
      await this.examSessionsRepository.delete({
        sessionId: { $in: sessionIds },
      });
      await this.evaluationRepository.delete({
        associatedSession: { $in: sessionIds },
      });
      await this.usagesRepository.deleteOne({ userId });
      await this.usersRepository.deleteOne({ userId });
    } catch (err) {
      throw new NotFoundException(`NotFoundException: ${err.message}`);
    }
  }
}
