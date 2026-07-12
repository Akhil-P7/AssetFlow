import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID() assetId!: string;
  @IsString() @IsNotEmpty() issueDescription!: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) priority?: string;
  @IsOptional() @IsString() photoUrl?: string;
}

export class RejectMaintenanceDto {
  @IsString() @IsNotEmpty() reason!: string;
}

export class AssignTechnicianDto {
  @IsString() @IsNotEmpty() technicianName!: string;
}
