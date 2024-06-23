import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChecklistItem } from '../schemas/evaluator.schema';
import { OpenAIModel } from '../schemas/patient.schema';

export class CreateEvaluatorRequest {
  evaluatorId: string;

  @IsNotEmpty()
  @IsString()
  associatedStation: string;

  @IsNotEmpty()
  @IsArray({ message: 'clinicalChecklist must be an array of ChecklistItems' })
  clinicalChecklist: Array<ChecklistItem>;

  @IsEnum(OpenAIModel)
  openAiModel: string;

  created_at: number;

  updated_at: number;

  metadata: any;
}
