import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { Employee, EmployeeDocument } from './schemas/employee.schema';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const createdEmployee = new this.employeeModel({
      ...createEmployeeDto,
      isActive: createEmployeeDto.isActive ?? true,
    });
    return createdEmployee.save();
  }

  async findAll(activeOnly = true): Promise<Employee[]> {
    const query = activeOnly ? { isActive: true } : {};
    return this.employeeModel.find(query).sort({ name: 1 }).exec();
  }

  async findOne(id: string | Types.ObjectId): Promise<Employee> {
    try {
      const employee = await this.employeeModel.findById(id).lean().exec();
      if (!employee) {
        throw new NotFoundException(`No se encontró el empleado con ID ${id}`);
      }
      return employee;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException('ID de empleado no válido');
      }
      throw error;
    }
  }

  async update(
    id: string | Types.ObjectId,
    updateEmployeeDto: Partial<CreateEmployeeDto>,
  ): Promise<Employee> {
    try {
      const existingEmployee = await this.employeeModel
        .findByIdAndUpdate(id, updateEmployeeDto, { new: true, lean: true })
        .exec();
      
      if (!existingEmployee) {
        throw new NotFoundException(`No se encontró el empleado con ID ${id}`);
      }
      
      return existingEmployee;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException('ID de empleado no válido');
      }
      throw error;
    }
  }

  async remove(id: string | Types.ObjectId): Promise<void> {
    try {
      const result = await this.employeeModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`No se encontró el empleado con ID ${id}`);
      }
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException('ID de empleado no válido');
      }
      throw error;
    }
  }
}
