import { IsArray, IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { Findings } from '../schemas/patient.schema';

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
  @IsString()
  pastMedicalHistory: string;

  @IsNotEmpty()
  @IsString()
  medicationHistory: string;

  @IsNotEmpty()
  @IsString()
  allergiesHistory: string;

  @IsNotEmpty()
  @IsString()
  familyHistory: string;

  @IsNotEmpty()
  @IsString()
  travelHistory: string;

  @IsNotEmpty()
  @IsString()
  occupationalHistory: string;

  @IsNotEmpty()
  @IsString()
  socialHistory: string;

  @IsNotEmpty()
  @IsString()
  smokingHistory: string;

  @IsNotEmpty()
  @IsString()
  alcoholHistory: string;

  @IsNotEmpty()
  @IsString()
  surgicalHistory: string;

  @IsNotEmpty()
  @IsString()
  drivingHistory: string;

  @IsNotEmpty()
  @IsString()
  sexualHistory: string;

  @IsNotEmpty()
  @IsString()
  recreationalDrugHistory: string;

  @IsNotEmpty()
  @IsString()
  stressorsInLife: string;

  @IsNotEmpty()
  @IsString()
  ideasConcernsExpectations: string;

  @IsNotEmpty()
  @IsString()
  exampleConversations: string;

  @IsNotEmpty()
  @IsString()
  associatedStation: string;

  additionalInstructions: string;

  @IsNotEmpty()
  @IsString()
  voiceId11Labs: string;

  @IsArray()
  findings: Array<Findings>;

  created_at: string;

  updated_at: string;

  metadata: any;
}
