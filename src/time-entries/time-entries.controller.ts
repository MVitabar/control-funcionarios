import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TimeEntryStatus } from './schemas/time-entry.schema';
import { DateInterceptor } from '../common/interceptors/date.interceptor';

@ApiTags('time-entries')
@Controller('time-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(DateInterceptor)
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar horas trabajadas' })
  @ApiResponse({ status: 201, description: 'Registro de horas creado correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o registro duplicado.' })
  create(
    @Body() createTimeEntryDto: CreateTimeEntryDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.timeEntriesService.create(createTimeEntryDto, userId);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener registros de horas por empleado' })
  @ApiResponse({ status: 200, description: 'Lista de registros obtenida correctamente.' })
  @ApiResponse({ status: 400, description: 'ID de empleado no válido.' })
  findByEmployee(
    @Param('employeeId', new MongoIdPipe()) employeeId: string,
  ) {
    return this.timeEntriesService.findAllByEmployee(employeeId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener registros de horas por rango de fechas' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2025-11-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2025-11-30' })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de registros obtenida correctamente.' })
  @ApiResponse({ status: 400, description: 'Parámetros de fecha inválidos.' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId', new MongoIdPipe({ optional: true })) employeeId?: string,
  ) {
    // Validar formato de fechas
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      throw new BadRequestException('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    // Convertir a fechas de inicio y fin del día
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validar que la fecha de inicio sea menor o igual a la fecha de fin
    if (start > end) {
      throw new BadRequestException('La fecha de inicio debe ser menor o igual a la fecha de fin');
    }

    return this.timeEntriesService.findByDateRange(start, end, employeeId);
  }

  private isValidDate(dateString: string): boolean {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false;
    const d = new Date(dateString);
    return !isNaN(d.getTime());
  }

  @Post(':id/exit')
  @ApiOperation({ summary: 'Registrar hora de salida' })
  @ApiResponse({ status: 200, description: 'Hora de salida registrada correctamente.' })
  @ApiResponse({ status: 400, description: 'ID o hora de salida inválida.' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado.' })
  registerExit(
    @Param('id', new MongoIdPipe()) id: string,
    @Body('exitTime') exitTime: Date,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.timeEntriesService.updateExitTime(id, new Date(exitTime), userId);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de un registro' })
  @ApiResponse({ status: 200, description: 'Estado actualizado correctamente.' })
  @ApiResponse({ status: 400, description: 'ID o estado no válido.' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado.' })
  updateStatus(
    @Param('id', new MongoIdPipe()) id: string,
    @Body('status') status: TimeEntryStatus,
    @Body('notes') notes: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.timeEntriesService.updateStatus(id, status, userId, notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un registro de horas' })
  @ApiResponse({ status: 200, description: 'Registro eliminado correctamente.' })
  @ApiResponse({ status: 400, description: 'ID no válido.' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado.' })
  remove(@Param('id', new MongoIdPipe()) id: string) {
    return this.timeEntriesService.remove(id);
  }
}
