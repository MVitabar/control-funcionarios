import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  user?: string; // Referencia al usuario del sistema si lo tiene
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
