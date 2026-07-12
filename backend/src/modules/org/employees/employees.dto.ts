import { IsString, IsNotEmpty, IsIn } from 'class-validator';

/** Only ADMIN can call this — enforced by guard + this DTO */
export class PromoteEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['DEPARTMENT_HEAD', 'ASSET_MANAGER'])
  newRole!: string;
}
