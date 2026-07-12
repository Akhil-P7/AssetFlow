import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsUUID() resourceId!: string;
  @IsDateString() startTime!: string;
  @IsDateString() endTime!: string;
  @IsOptional() @IsUUID() bookedForDepartmentId?: string;
}

export class CancelBookingDto {
  @IsOptional() @IsString() reason?: string;
}

export class RescheduleBookingDto {
  @IsDateString() startTime!: string;
  @IsDateString() endTime!: string;
}