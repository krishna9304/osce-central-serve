export interface ApiResponseType {
  message?: string;
  error?: string;
  statusCode?: number;
  data?: any;
}
export class ApiResponse {
  message?: string;
  error?: string;
  statusCode?: number;
  data?: any;

  constructor(
    message?: string,
    error?: string,
    statusCode?: number,
    data?: any,
  ) {
    this.error = error;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
  }

  getResponse(): ApiResponseType {
    return {
      error: this.error,
      message: this.message,
      statusCode: this.statusCode,
      data: this.data,
    };
  }
}
