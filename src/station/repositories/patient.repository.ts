import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Patient } from '../schemas/patient.schema';
import { AbstractRepository } from 'src/database/abstract.repository';

@Injectable()
export class PatientRepository extends AbstractRepository<Patient> {
  protected readonly logger = new Logger(PatientRepository.name);

  constructor(
    @InjectModel(Patient.name) patientModel: Model<Patient>,
    @InjectConnection() connection: Connection,
  ) {
    super(patientModel, connection);
  }
}
