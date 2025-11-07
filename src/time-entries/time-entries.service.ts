import { 
  BadRequestException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { TimeEntry, TimeEntryDocument, TimeEntryStatus } from './schemas/time-entry.schema';
import * as moment from 'moment';

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectModel(TimeEntry.name) private timeEntryModel: Model<TimeEntryDocument>,
  ) {}

  async create(createTimeEntryDto: CreateTimeEntryDto, userId?: string): Promise<TimeEntry> {
    // Convertir fechas a objetos Date
    const entryDate = new Date(createTimeEntryDto.date);
    const entryTime = new Date(createTimeEntryDto.entryTime);
    const exitTime = createTimeEntryDto.exitTime ? new Date(createTimeEntryDto.exitTime) : null;

    // Verificar si ya existe un registro para este empleado en la fecha
    const existingEntry = await this.timeEntryModel.findOne({
      employee: createTimeEntryDto.employee,
      date: {
        $gte: moment(entryDate).startOf('day').toDate(),
        $lte: moment(entryDate).endOf('day').toDate(),
      },
    }).exec();

    if (existingEntry) {
      throw new BadRequestException('Ya existe un registro para este empleado en la fecha especificada');
    }

    // Preparar datos para la creación
    const entryData = {
      ...createTimeEntryDto,
      date: entryDate,
      entryTime: entryTime,
      exitTime: exitTime,
      // Asegurar que los campos numéricos sean números
      dailyRate: createTimeEntryDto.dailyRate ? Number(createTimeEntryDto.dailyRate) : undefined,
      extraHours: createTimeEntryDto.extraHours ? Number(createTimeEntryDto.extraHours) : undefined,
      extraHoursRate: createTimeEntryDto.extraHoursRate ? Number(createTimeEntryDto.extraHoursRate) : undefined,
      total: createTimeEntryDto.total ? Number(createTimeEntryDto.total) : undefined,
    };

    // Calcular horas trabajadas si se proporciona la hora de salida
    let totalHours = null;
    if (createTimeEntryDto.exitTime) {
      const entryMoment = moment(createTimeEntryDto.entryTime);
      const exitMoment = moment(createTimeEntryDto.exitTime);
      const regularHours = parseFloat(exitMoment.diff(entryMoment, 'hours', true).toFixed(2));
      const extraHours = createTimeEntryDto.extraHours ? parseFloat(createTimeEntryDto.extraHours.toString()) : 0;
      totalHours = (regularHours + extraHours).toFixed(2);
    }

    const createdEntry = new this.timeEntryModel({
      ...entryData,
      totalHours,
      status: createTimeEntryDto.status || TimeEntryStatus.PENDING,
      approvedBy: userId ? new Types.ObjectId(userId) : undefined,
      // Asegurarse de que los campos numéricos sean números
      dailyRate: entryData.dailyRate ? Number(entryData.dailyRate) : undefined,
      extraHours: entryData.extraHours ? Number(entryData.extraHours) : undefined,
      extraHoursRate: entryData.extraHoursRate ? Number(entryData.extraHoursRate) : undefined,
      total: entryData.total ? Number(entryData.total) : undefined,
    });

    return createdEntry.save();
  }

  async findAllByEmployee(employeeId: string | Types.ObjectId): Promise<TimeEntry[]> {
    try {
      // Asegurarse de que employeeId sea un ObjectId válido
      const employeeObjectId = typeof employeeId === 'string' 
        ? new Types.ObjectId(employeeId)
        : employeeId;

      return await this.timeEntryModel
        .find({ employee: employeeObjectId })
        .populate('approvedBy', 'name email')
        .sort({ date: -1, entryTime: 1 })
        .lean()
        .exec()
        .then(entries => {
          // Asegurar que los campos numéricos sean números
          return entries.map(entry => ({
            ...entry,
            dailyRate: entry.dailyRate ? Number(entry.dailyRate) : undefined,
            extraHours: entry.extraHours ? Number(entry.extraHours) : undefined,
            extraHoursRate: entry.extraHoursRate ? Number(entry.extraHoursRate) : undefined,
            total: entry.total ? Number(entry.total) : undefined,
            totalHours: entry.totalHours ? Number(entry.totalHours) : undefined,
          }));
        });
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
  ): Promise<TimeEntry[]> {
    try {
      const query: any = {
        date: {
          $gte: moment(startDate).startOf('day').toDate(),
          $lte: moment(endDate).endOf('day').toDate(),
        },
      };

      if (employeeId) {
        // Asegurarse de que employeeId sea un ObjectId válido
        const employeeObjectId = typeof employeeId === 'string' 
          ? new Types.ObjectId(employeeId)
          : employeeId;
        query.employee = employeeObjectId;
      }

      return await this.timeEntryModel
        .find(query)
        .populate('employee', 'name email') // Incluir datos básicos del empleado
        .populate('approvedBy', 'name email') // Incluir datos de quién aprobó
        .sort({ date: -1, entryTime: 1 })
        .lean()
        .exec()
        .then(entries => {
          // Asegurar que los campos numéricos sean números
          return entries.map(entry => ({
            ...entry,
            dailyRate: entry.dailyRate ? Number(entry.dailyRate) : undefined,
            extraHours: entry.extraHours ? Number(entry.extraHours) : undefined,
            extraHoursRate: entry.extraHoursRate ? Number(entry.extraHoursRate) : undefined,
            total: entry.total ? Number(entry.total) : undefined,
            totalHours: entry.totalHours ? Number(entry.totalHours) : undefined,
          }));
        });
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

      // Si se actualiza la hora de entrada, salida o horas extras, recalcular totalHours
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
          updateData.totalHours = parseFloat((regularHours + extraHours).toFixed(2));
        } else {
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
