import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class CreateAssetDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() acquisitionDate?: string;
  @IsOptional() @IsNumber() acquisitionCost?: number;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsBoolean() isBookable?: boolean;
}

export class TransitionAssetDto {
  @IsString() @IsNotEmpty() toStatus!: string;
  @IsOptional() @IsString() reason?: string;
}
