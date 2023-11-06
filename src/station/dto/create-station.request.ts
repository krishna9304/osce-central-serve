import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateStationRequest {
  @IsNotEmpty()
  @IsString()
  stationName: string;

  @IsNotEmpty()
  @IsString()
  stationCategory: string;

  @IsNotEmpty()
  @IsString()
  candidateInstructions: string;

  @IsNotEmpty()
  @IsString()
  characterName: string;

  characterImage: string;

  @IsNotEmpty()
  @IsString()
  sex: string;

  @IsNotEmpty()
  @IsNumber()
  age: number;

  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string;

  @IsNotEmpty()
  @IsString()
  persona: string;

  @IsNotEmpty()
  @IsString()
  systemPrompt: string;

  exampleConversations: string;

  deployedModelId: string;

  status: string;

  created_at: string;

  updated_at: string;

  metadata: any;
}
