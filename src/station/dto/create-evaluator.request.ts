import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateEvaluatorRequest {
  evaluatorId: string;

  @IsNotEmpty()
  @IsString()
  associatedStation: string;

  @IsNotEmpty()
  @IsArray({ message: 'clinicalChecklist must be an array of strings' })
  clinicalChecklist: Array<string>;

  created_at: string;

  updated_at: string;

  metadata: any;
}
