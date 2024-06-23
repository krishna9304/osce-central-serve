import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsString,
} from 'class-validator';
import {
  ContextualParam,
  Findings,
  OpenAIModel,
} from '../schemas/patient.schema';

export class CreatePatientRequest {
  patientId: string;

  @IsNotEmpty()
  @IsString()
  patientName: string;

  avatar: string;

  @IsNotEmpty()
  @IsString()
  sex: string;

  @IsNotEmpty()
  @IsNumberString()
  age: string;

  @IsNotEmpty()
  @IsString()
  dateOfBirth: string;

  @IsNotEmpty()
  @IsString()
  persona: string;

  @IsNotEmpty()
  @IsString()
  presentingComplaint: string;

  @IsNotEmpty()
  @IsString()
  historyOfPresentingComplaint: string;

  @IsNotEmpty()
  @IsArray()
  additionalContextualParameters: Array<ContextualParam>;

  ideasConcernsExpectations: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(OpenAIModel)
  openAiModel: string;

  @IsNotEmpty()
  @IsString()
  exampleConversations: string;

  @IsNotEmpty()
  @IsString()
  associatedStation: string;

  @IsArray()
  findings: Array<Findings>;

  @IsNotEmpty()
  @IsString()
  voiceId11Labs: string;

  patientSpecificAdditionalInstructions: string;

  created_at: number;

  updated_at: number;

  metadata: any;
}
