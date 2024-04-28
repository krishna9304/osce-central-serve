import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserRequest } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from './schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResponse, ApiResponseType } from 'src/constants/apiResponse';
import { isPhoneNumber } from 'class-validator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUsers(
    @CurrentUser() user: User,
    @Query() query: any,
  ): Promise<ApiResponseType> {
    const userIds = query.userIds || null;
    if (!query.page || query.page < 1) query.page = 1;
    if (!query.limit || query.limit < 1) query.limit = 10;

    if (user.role !== 'admin') {
      throw new UnauthorizedException(
        'You are not allowed to view other user details.',
      );
    }
    const users = await this.userService.getUsers(
      userIds,
      parseInt(query.page),
      parseInt(query.limit),
    );
    const res = new ApiResponse(
      'User details fetched successfully.',
      null,
      200,
      users,
    );
    return res.getResponse();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async createUserByAdmin(
    @Body() request: CreateUserRequest,
    @CurrentUser() currentUser: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponseType> {
    if (currentUser.role !== 'admin') {
      throw new UnauthorizedException('You are not allowed to create user');
    }
    if (!request.phone || !isPhoneNumber(request.phone)) {
      throw new UnprocessableEntityException(
        'Please provide a valid phone number',
      );
    }
    const user = await this.userService.createUserByAdmin(file, request);
    const res = new ApiResponse('User created successfully', null, 200, user);
    return res.getResponse();
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async createUser(
    @Body() request: CreateUserRequest,
    @CurrentUser() initialUserData: User,
  ): Promise<ApiResponseType> {
    const errFields = this.userService.validateUpdateProfileRequest(
      request,
      initialUserData,
    );
    let errorMsg = null;
    if (errFields.length) {
      errorMsg = `You are not allowed to add these fields - ${errFields.join(
        ', ',
      )}`;
      errFields.forEach((field) => {
        delete request[field];
      });
    }
    const user = await this.userService.createUser(request, initialUserData);
    const res = new ApiResponse(
      'User registered successfully',
      errorMsg,
      200,
      user,
    );
    return res.getResponse();
  }

  @Put('update-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async updateProfile(
    @UploadedFile() file: Express.Multer.File,
    @Body() request: Partial<User>,
    @CurrentUser() user: User,
  ): Promise<ApiResponseType> {
    const errFields = this.userService.validateUpdateProfileRequest(
      request,
      user,
    );
    let errorMsg = null;
    if (errFields.length) {
      errorMsg = `You are not allowed to update ${errFields.join(', ')}`;
      errFields.forEach((field) => {
        delete request[field];
      });
    } else if (user.role === 'admin' && request.userId !== user.userId) {
      user = await this.userService.getUser({ userId: request.userId });
    }

    const updatedUser = await this.userService.updateProfile(
      file,
      request,
      user,
    );
    const res = new ApiResponse(
      'User details updated successfully',
      errorMsg,
      200,
      updatedUser,
    );
    return res.getResponse();
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteUser(
    @CurrentUser() user: User,
    @Query('userId') userId: string,
  ): Promise<ApiResponseType> {
    if (userId) {
      if (user.userId !== userId && user.role !== 'admin')
        throw new UnauthorizedException('You are not allowed to delete user');
    } else userId = user.userId;

    await this.userService.deleteUser(userId);
    const res = new ApiResponse('User deleted successfully', null, 200, null);
    return res.getResponse();
  }
}
