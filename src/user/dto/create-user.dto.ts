import { IsDateString, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserRequest {
  userId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  profile_picture: string;

  @IsNotEmpty()
  @IsString()
  gender: string;

  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string;

  @IsNotEmpty()
  currentYearOfStudy: number;

  phone: string;

  status: string;

  role: string;

  email_verified: boolean;

  phone_verified: boolean;

  created_at: string;

  updated_at: string;

  metadata: any;
}
