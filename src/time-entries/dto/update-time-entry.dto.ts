import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { CreateTimeEntryDto } from './create-time-entry.dto';

export class UpdateTimeEntryDto extends PartialType(CreateTimeEntryDto) {
  @IsDateString()
  @IsOptional()
  entryTime?: string;

  @IsDateString()
  @IsOptional()
  exitTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber({}, { message: 'dailyRate debe ser un número' })
  @IsOptional()
  dailyRate?: number;

  @IsNumber({}, { message: 'extraHours debe ser un número' })
  @IsOptional()
  extraHours?: number;

  @IsNumber({}, { message: 'extraHoursRate debe ser un número' })
  @IsOptional()
  extraHoursRate?: number;

  @IsNumber({}, { message: 'total debe ser un número' })
  @IsOptional()
  total?: number;

  @IsString()
  @IsOptional()
  extraHoursFormatted?: string;
}
