import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/user/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';
import { AzureBlobUtil } from './azureblob.util';
import { ApiResponse } from 'src/constants/apiResponse';
import { Response } from 'express';

@Controller('util')
export class UtilController {
  constructor(private readonly azureBlobUtil: AzureBlobUtil) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Res() response: Response,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException(
        'Unauthorized. Only admin can upload files.',
      );
    }
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const uploadName = await this.azureBlobUtil.uploadUsingBuffer(
      file.buffer,
      file.originalname,
    );
    const res = new ApiResponse('File uploaded.', null, 201, {
      fileName: uploadName,
    });
    response.status(res.statusCode).json(res.getResponse());
  }

  @Get('public-url/:filename')
  @UseGuards(JwtAuthGuard)
  async getPublicUrl(
    @CurrentUser() user: User,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    if (user.role !== 'admin') {
      throw new UnauthorizedException(
        'Unauthorized. Only admin can fetch public URLs.',
      );
    }
    const url = await this.azureBlobUtil.getTemporaryPublicUrl(filename);
    let res: ApiResponse;
    if (url) {
      res = new ApiResponse('Public URL fetched.', null, 200, {
        temporaryUrl: url,
      });
      response.status(res.statusCode).json(res.getResponse());
    } else {
      res = new ApiResponse('Requested blob do not exist.', null, 404, null);
      response.status(res.statusCode).json(res.getResponse());
    }
  }
}
