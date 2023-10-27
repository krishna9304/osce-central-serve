import {
  Body,
  Controller,
  Post,
  Put,
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

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async createUser(
    @Body() request: CreateUserRequest,
    @CurrentUser() initilaUserData: User,
  ): Promise<ApiResponseType> {
    const user = await this.userService.createUser(request, initilaUserData);
    const res = new ApiResponse(
      'User registered successfully',
      null,
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
    const updatedUser = await this.userService.updateProfile(
      file,
      request,
      user,
    );
    const res = new ApiResponse(
      'User details updated successfully',
      null,
      200,
      updatedUser,
    );
    return res.getResponse();
  }
}
