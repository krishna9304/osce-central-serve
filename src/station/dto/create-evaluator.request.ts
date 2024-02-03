import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ChecklistItem } from '../schemas/evaluator.schema';

export class CreateEvaluatorRequest {
  evaluatorId: string;

  @IsNotEmpty()
  @IsString()
  associatedStation: string;

  @IsNotEmpty()
  @IsArray({ message: 'clinicalChecklist must be an array of ChecklistItems' })
  clinicalChecklist: Array<ChecklistItem>;

  created_at: string;

  updated_at: string;

  metadata: any;
}
