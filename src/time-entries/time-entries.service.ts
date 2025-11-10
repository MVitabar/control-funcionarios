import { 
  BadRequestException, 
  Injectable, 
  NotFoundException,
  Logger 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { TimeEntry, TimeEntryDocument, TimeEntryStatus } from './schemas/time-entry.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { convertIdsToStrings, toObjectId } from '../common/utils/mongo.utils';
import * as moment from 'moment';

// Base interface for time entry with all possible fields
type BaseTimeEntry = {
  _id: Types.ObjectId;
  employee: Types.ObjectId | PopulatedEmployee;
  date: Date;
  entryTime: Date;
  exitTime?: Date;
  status: TimeEntryStatus;
  dailyRate?: number;
  extraHours?: number;
  extraHoursRate?: number;
  total?: number;
  totalHours?: number | string;
  regularHours?: number | string;
  notes?: string;
  approvedBy?: Types.ObjectId | PopulatedUser;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  rejectedBy?: Types.ObjectId | PopulatedUser;
  createdAt: Date;
  updatedAt: Date;
};

type PopulatedEmployee = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
};

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

// This is what we send to the client
type TimeEntryResponse = {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email?: string;
  };
  date: string;
  entryTime: string;
  exitTime?: string;
  status: TimeEntryStatus;
  dailyRate?: number;
  extraHours?: number;
  extraHoursRate?: number;
  total?: number;
  totalHours?: number | string;
  regularHours?: number | string;
  notes?: string;
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  rejectedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectModel(TimeEntry.name) private timeEntryModel: Model<TimeEntryDocument>,
  ) {}

  private readonly logger = new Logger(TimeEntriesService.name);

  async create(
    createTimeEntryDto: CreateTimeEntryDto, 
    userId?: string
  ): Promise<TimeEntryResponse> {
    type PopulatedEntry = Omit<TimeEntry, 'employee' | 'approvedBy'> & {
      employee: { _id: Types.ObjectId; name: string; email?: string };
      approvedBy?: { _id: Types.ObjectId; name: string; email: string };
    };
    try {
      // Parse and validate dates
      const entryDate = new Date(createTimeEntryDto.date);
      const entryTime = new Date(createTimeEntryDto.entryTime);
      const exitTime = createTimeEntryDto.exitTime ? new Date(createTimeEntryDto.exitTime) : null;
      
      if (isNaN(entryDate.getTime())) {
        throw new BadRequestException('Fecha de entrada inválida');
      }
      
      if (isNaN(entryTime.getTime())) {
        throw new BadRequestException('Hora de entrada inválida');
      }
      
      if (exitTime && isNaN(exitTime.getTime())) {
        throw new BadRequestException('Hora de salida inválida');
      }
      
      // Convert employee ID to ObjectId if it's a string
      const employeeId = typeof createTimeEntryDto.employee === 'string' 
        ? toObjectId(createTimeEntryDto.employee)
        : createTimeEntryDto.employee;

      // Check if an entry already exists for this employee on the given date
      const existingEntry = await this.timeEntryModel.findOne({
        employee: employeeId,
        date: {
          $gte: moment(entryDate).startOf('day').toDate(),
          $lte: moment(entryDate).endOf('day').toDate(),
        },
      }).exec();

      if (existingEntry) {
        throw new BadRequestException('Ya existe un registro para este empleado en la fecha especificada');
      }

      // Calculate hours worked if exit time is provided
      let totalHours = null;
      let regularHours = null;
      
      if (exitTime) {
        const entryMoment = moment(entryTime);
        const exitMoment = moment(exitTime);
        regularHours = parseFloat(exitMoment.diff(entryMoment, 'hours', true).toFixed(2));
        const extraHours = createTimeEntryDto.extraHours ? parseFloat(createTimeEntryDto.extraHours.toString()) : 0;
        totalHours = (regularHours + extraHours).toFixed(2);
      }

      // Prepare data for creation
      const entryData = {
        ...createTimeEntryDto,
        employee: employeeId,
        date: entryDate,
        entryTime: entryTime,
        exitTime: exitTime,
        totalHours,
        regularHours,
        status: createTimeEntryDto.status || TimeEntryStatus.PENDING,
        approvedBy: userId ? new Types.ObjectId(userId) : undefined,
        dailyRate: createTimeEntryDto.dailyRate ? Number(createTimeEntryDto.dailyRate) : undefined,
        extraHours: createTimeEntryDto.extraHours ? Number(createTimeEntryDto.extraHours) : undefined,
        extraHoursRate: createTimeEntryDto.extraHoursRate ? Number(createTimeEntryDto.extraHoursRate) : undefined,
        total: createTimeEntryDto.total ? Number(createTimeEntryDto.total) : undefined,
      };

      const createdEntry = new this.timeEntryModel(entryData);
      const savedEntry = await createdEntry.save();
      
      // Populate employee data and convert to response
      type PopulatedEntry = Omit<BaseTimeEntry, 'employee' | 'approvedBy' | 'rejectedBy'> & {
        employee: PopulatedEmployee;
        approvedBy?: PopulatedUser;
        rejectedBy?: PopulatedUser;
      };

      const populatedEntry = (await this.timeEntryModel
        .findById(savedEntry._id)
        .populate('employee', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .lean()
        .exec()) as unknown as PopulatedEntry | null;

      if (!populatedEntry) {
        throw new NotFoundException('No se pudo recuperar el registro de tiempo recién creado');
      }

      return this.mapToTimeEntryResponse(populatedEntry);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private mapToTimeEntryResponse(
    entry: Omit<BaseTimeEntry, 'employee' | 'approvedBy' | 'rejectedBy'> & {
      employee: PopulatedEmployee;
      approvedBy?: PopulatedUser;
      rejectedBy?: PopulatedUser;
    }
  ): TimeEntryResponse {
    const toIsoString = (date?: Date | string | null): string | undefined => {
      if (!date) return undefined;
      return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    };

    return {
      _id: entry._id?.toString() ?? '',
      employee: {
        _id: entry.employee?._id?.toString() ?? '',
        name: entry.employee?.name ?? '',
        email: entry.employee?.email
      },
      date: toIsoString(entry.date) ?? '',
      entryTime: toIsoString(entry.entryTime) ?? '',
      exitTime: toIsoString(entry.exitTime),
      status: entry.status,
      dailyRate: entry.dailyRate,
      extraHours: entry.extraHours,
      extraHoursRate: entry.extraHoursRate,
      total: entry.total,
      totalHours: entry.totalHours,
      regularHours: entry.regularHours,
      notes: entry.notes,
      approvedBy: entry.approvedBy ? {
        _id: entry.approvedBy._id.toString(),
        name: entry.approvedBy.name,
        email: entry.approvedBy.email
      } : undefined,
      approvedAt: toIsoString(entry.approvedAt),
      rejectedAt: toIsoString(entry.rejectedAt),
      rejectedReason: entry.rejectedReason,
      rejectedBy: entry.rejectedBy ? {
        _id: entry.rejectedBy._id.toString(),
        name: entry.rejectedBy.name,
        email: entry.rejectedBy.email
      } : undefined,
      createdAt: toIsoString(entry.createdAt) ?? '',
      updatedAt: toIsoString(entry.updatedAt) ?? ''
    };
  }

  async findAllByEmployee(employeeId: string | Types.ObjectId): Promise<TimeEntryResponse[]> {
    try {
      // Ensure employeeId is a valid ObjectId
      const employeeObjectId = toObjectId(employeeId);

      type PopulatedEntry = Omit<BaseTimeEntry, 'employee' | 'approvedBy' | 'rejectedBy'> & {
        employee: PopulatedEmployee;
        approvedBy?: PopulatedUser;
        rejectedBy?: PopulatedUser;
      };

      const entries = (await this.timeEntryModel
        .find({ employee: employeeObjectId })
        .populate('employee', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .sort({ date: -1, entryTime: 1 })
        .lean()
        .exec()) as unknown as PopulatedEntry[];

      return entries.map(entry => this.mapToTimeEntryResponse(entry));
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('ID de empleado no válido');
      }
      throw error;
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    employeeId?: string | Types.ObjectId,
  ): Promise<TimeEntryResponse[]> {
    try {
      // Validate dates
      const start = moment(startDate).startOf('day');
      const end = moment(endDate).endOf('day');
      
      if (!start.isValid() || !end.isValid()) {
        throw new BadRequestException('Fechas inválidas');
      }
      
      if (start.isAfter(end)) {
        throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
      }

      type PopulatedEntry = Omit<BaseTimeEntry, 'employee' | 'approvedBy' | 'rejectedBy'> & {
        employee: PopulatedEmployee;
        approvedBy?: PopulatedUser;
        rejectedBy?: PopulatedUser;
      };

      const query: any = {
        date: {
          $gte: start.toDate(),
          $lte: end.toDate(),
        },
      };

      if (employeeId) {
        // Ensure employeeId is a valid ObjectId
        query.employee = toObjectId(employeeId);
      }

      const entries = (await this.timeEntryModel
        .find(query)
        .populate('employee', 'name email')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .sort({ date: -1, entryTime: 1 })
        .lean()
        .exec()) as unknown as PopulatedEntry[];

      return entries.map(entry => this.mapToTimeEntryResponse(entry));
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('ID de empleado no válido');
      }
      throw error;
    }
  }

  async updateExitTime(
    id: string | Types.ObjectId,
    exitTime: Date,
    userId: string,
  ): Promise<TimeEntry> {
    const session = await this.timeEntryModel.startSession();
    session.startTransaction();
    
    try {
      // 1. Primero obtenemos el registro para calcular las horas
      const entry = await this.timeEntryModel.findById(id).session(session).exec();
      
      if (!entry) {
        throw new NotFoundException(`No se encontró el registro con ID ${id}`);
      }

      if (entry.exitTime) {
        throw new BadRequestException('Ya se ha registrado una hora de salida para este registro');
      }

      // 2. Calculamos las horas trabajadas
      const entryMoment = moment(entry.entryTime);
      const exitMoment = moment(exitTime);
      const totalHours = parseFloat(exitMoment.diff(entryMoment, 'hours', true).toFixed(2));

      // 3. Actualizamos el registro
      const updatedEntry = await this.timeEntryModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              exitTime,
              totalHours,
              approvedBy: new Types.ObjectId(userId),
            },
          },
          { new: true, lean: true, session }
        )
        .exec();

      if (!updatedEntry) {
        throw new NotFoundException(`No se pudo actualizar el registro con ID ${id}`);
      }

      await session.commitTransaction();
      return updatedEntry;
    } catch (error) {
      await session.abortTransaction();
      
      if (error.name === 'CastError') {
        throw new BadRequestException('ID de registro no válido');
      } else if (error.message?.includes('duplicate key error')) {
        throw new BadRequestException('Ya existe un registro para este empleado en la fecha especificada');
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateStatus(
    id: string | Types.ObjectId,
    status: TimeEntryStatus,
    userId: string,
    notes?: string,
  ): Promise<TimeEntry> {
    try {
      const entry = await this.timeEntryModel.findByIdAndUpdate(
        id,
        {
          status,
          ...(notes !== undefined && { notes }),
          approvedBy: userId,
          updatedAt: new Date(),
        },
        { new: true, lean: true },
      ).exec();

      if (!entry) {
        throw new NotFoundException(`No se encontró el registro con ID ${id}`);
      }

      return entry;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('ID de registro no válido');
      }
      throw error;
    }
  }


  async update(
    id: string | Types.ObjectId,
    updateTimeEntryDto: any,
    userId: string,
  ): Promise<TimeEntry> {
    try {
      const updateData: any = { ...updateTimeEntryDto };
      
      // Convertir fechas a objetos Date si están presentes
      if (updateData.entryTime) {
        updateData.entryTime = new Date(updateData.entryTime);
      }
      if (updateData.exitTime) {
        updateData.exitTime = new Date(updateData.exitTime);
      }
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }

      // Si se actualiza la hora de entrada, salida o horas extras, recalcular totalHours y regularHours
      if (updateData.entryTime || updateData.exitTime || updateData.extraHours !== undefined) {
        const existingEntry = await this.timeEntryModel.findById(id).exec();
        if (!existingEntry) {
          throw new NotFoundException(`No se encontró el registro con ID ${id}`);
        }

        const entryTime = updateData.entryTime || existingEntry.entryTime;
        const exitTime = updateData.exitTime || existingEntry.exitTime;
        const extraHours = updateData.extraHours !== undefined ? 
          parseFloat(updateData.extraHours.toString()) : 
          (existingEntry.extraHours ? parseFloat(existingEntry.extraHours.toString()) : 0);

        if (entryTime && exitTime) {
          const entryMoment = moment(entryTime);
          const exitMoment = moment(exitTime);
          const regularHours = parseFloat(exitMoment.diff(entryMoment, 'hours', true).toFixed(2));
          updateData.regularHours = regularHours;
          updateData.totalHours = parseFloat((regularHours + extraHours).toFixed(2));
        } else {
          updateData.regularHours = null;
          updateData.totalHours = null;
        }
      }

      // Actualizar el registro
      const updatedEntry = await this.timeEntryModel
        .findByIdAndUpdate(
          id,
          {
            ...updateData,
            approvedBy: new Types.ObjectId(userId),
            updatedAt: new Date(),
          },
          { new: true, lean: true }
        )
        .populate('employee', 'name email')
        .populate('approvedBy', 'name email')
        .exec();

      if (!updatedEntry) {
        throw new NotFoundException(`No se encontró el registro con ID ${id}`);
      }

      return updatedEntry;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('ID de registro no válido');
      } else if (error.code === 11000) {
        throw new BadRequestException('Ya existe un registro para este empleado en la fecha especificada');
      }
      throw error;
    }
  }

  async remove(id: string | Types.ObjectId): Promise<void> {
    try {
      const result = await this.timeEntryModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`No se encontró el registro con ID ${id}`);
      }
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('ID de registro no válido');
      }
      throw error;
    }
  }
}
