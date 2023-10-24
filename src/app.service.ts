import { Injectable } from '@nestjs/common';
import { ApiResponseType, ApiResponse } from './constants/apiResponse';

@Injectable()
export class AppService {
  getServerHealth(): ApiResponseType {
    const response = new ApiResponse(
      'Server running | ' + new Date().toISOString(),
      null,
      200,
    );
    return response.getResponse();
  }
}
