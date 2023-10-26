import { IsEmail, IsMobilePhone, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  dateOfbirth: string;

  @IsNotEmpty()
  currentYearOfStudy: string;

  phone: string;

  status: string;

  email_verified: boolean;

  phone_verified: boolean;

  created_at: string;

  updated_at: string;

  metadata: any;
}
