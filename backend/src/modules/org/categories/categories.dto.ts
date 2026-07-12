import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsArray() customFields?: Array<{
    key: string;
    label: string;
    type: string;
  }>;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() customFields?: Array<{
    key: string;
    label: string;
    type: string;
  }>;
  @IsOptional() @IsString() status?: string;
}
