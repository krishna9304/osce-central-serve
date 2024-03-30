import {
  Body,
  Controller,
  Post,
  Put,
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

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async createUserByAdmin(
    @Body() request: CreateUserRequest,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponseType> {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('You are not allowed to create user');
    }
    if (!request.phone || !isPhoneNumber(request.phone)) {
      throw new UnprocessableEntityException(
        'Please provide a valid phone number',
      );
    }
    const userCreated = await this.userService.createUserByAdmin(file, request);
    const res = new ApiResponse(
      'User created successfully',
      null,
      200,
      userCreated,
    );
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
}
