import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { Employee } from '../../employees/schemas/employee.schema';

export type TimeEntryDocument = TimeEntry & Document;

export enum TimeEntryStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class TimeEntry {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Employee', required: true })
  employee: Employee | string;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ required: true, type: Date })
  entryTime: Date;

  @Prop({ type: Date })
  exitTime?: Date;

  @Prop({ type: Number })
  totalHours?: number;

  @Prop()
  notes?: string;

  @Prop({ 
    type: String, 
    enum: Object.values(TimeEntryStatus),
    default: TimeEntryStatus.PENDING 
  })
  status: TimeEntryStatus;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approvedBy?: string;

  @Prop({ type: Number })
  dailyRate?: number;

  @Prop({ type: Number })
  extraHours?: number;

  @Prop({ type: Number })
  extraHoursRate?: number;

  @Prop({ type: Number })
  total?: number;

  @Prop({ type: String })
  extraHoursFormatted?: string;
}

export const TimeEntrySchema = SchemaFactory.createForClass(TimeEntry);

// Índice para búsquedas frecuentes
TimeEntrySchema.index({ employee: 1, date: 1 }, { unique: true });
