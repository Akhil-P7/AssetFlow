import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateAllocationDto {
  @IsUUID() assetId!: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsDateString() expectedReturnDate?: string;
}

export class ReturnAssetDto {
  @IsString() @IsNotEmpty() conditionNote!: string;
}

export class CreateTransferDto {
  @IsUUID() allocationId!: string;
  @IsOptional() @IsUUID() toEmployeeId?: string;
  @IsOptional() @IsUUID() toDepartmentId?: string;
}

export class RejectTransferDto {
  @IsString() @IsNotEmpty() reason!: string;
}
