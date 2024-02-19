import { IsArray, IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { ContextualParam, Findings } from '../schemas/patient.schema';

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

  @IsNotEmpty()
  @IsString()
  ideasConcernsExpectations: string;

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

  @IsString()
  patientSpecificAdditionalInstructions: string;

  created_at: string;

  updated_at: string;

  metadata: any;
}
