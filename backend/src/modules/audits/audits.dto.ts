import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsIn,
} from 'class-validator';

export class CreateAuditCycleDto {
  @IsOptional() @IsUUID() scopeDepartmentId?: string;
  @IsOptional() @IsString() scopeLocation?: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsArray() @IsUUID('4', { each: true }) auditorIds!: string[];
}

export class UpdateAuditResultDto {
  @IsIn(['VERIFIED', 'MISSING', 'DAMAGED']) result!: string;
  @IsOptional() @IsString() notes?: string;
}
