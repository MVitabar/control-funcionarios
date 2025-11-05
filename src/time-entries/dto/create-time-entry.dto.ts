import { IsDateString, IsMongoId, IsOptional, IsString, IsEnum, IsNumber, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';
import { TimeEntryStatus } from '../schemas/time-entry.schema';

export class CreateTimeEntryDto {
  @IsMongoId()
  employee: string;

  @IsDateString()
  date: string;

  @IsDateString()
  entryTime: string;

  @IsDateString()
  @IsOptional()
  exitTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(TimeEntryStatus)
  @IsOptional()
  status?: TimeEntryStatus = TimeEntryStatus.PENDING;

  @IsNumber({}, { message: 'dailyRate debe ser un número' })
  @Type(() => Number)
  @IsOptional()
  dailyRate?: number;

  @IsNumber({}, { message: 'extraHours debe ser un número' })
  @Type(() => Number)
  @IsOptional()
  extraHours?: number;

  @IsNumber({}, { message: 'extraHoursRate debe ser un número' })
  @Type(() => Number)
  @IsOptional()
  extraHoursRate?: number;

  @IsNumber({}, { message: 'total debe ser un número' })
  @Type(() => Number)
  @IsOptional()
  total?: number;

  @IsString()
  @IsOptional()
  extraHoursFormatted?: string;
}
