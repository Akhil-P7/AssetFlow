import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsUUID() parentDepartmentId?: string;
  @IsOptional() @IsUUID() departmentHeadId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() parentDepartmentId?: string;
  @IsOptional() @IsUUID() departmentHeadId?: string;
}

export class UpdateStatusDto {
  @IsString() @IsNotEmpty() status!: string;
}
