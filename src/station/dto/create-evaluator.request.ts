import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEvaluatorRequest {
  evaluatorId: string;

  @IsNotEmpty()
  @IsString()
  evaluatorPrompt: string;

  @IsNotEmpty()
  @IsString()
  evaluatorFormatInstructions: string;

  @IsNotEmpty()
  @IsString()
  exampleEvaluationReport: string;

  @IsNotEmpty()
  @IsString()
  associatedStation: string;

  created_at: string;

  updated_at: string;

  metadata: any;
}
