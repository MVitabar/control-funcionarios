import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo funcionario' })
  @ApiResponse({ status: 201, description: 'Funcionario creado correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de funcionarios' })
  @ApiResponse({ status: 200, description: 'Lista de funcionarios obtenida correctamente.' })
  findAll(@Query('activeOnly') activeOnly: string) {
    return this.employeesService.findAll(activeOnly !== 'false');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un funcionario por ID' })
  @ApiResponse({ status: 200, description: 'Funcionario encontrado.' })
  @ApiResponse({ status: 400, description: 'ID no válido.' })
  @ApiResponse({ status: 404, description: 'Funcionario no encontrado.' })
  findOne(@Param('id', new MongoIdPipe()) id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un funcionario' })
  @ApiResponse({ status: 200, description: 'Funcionario actualizado correctamente.' })
  @ApiResponse({ status: 400, description: 'ID no válido.' })
  @ApiResponse({ status: 404, description: 'Funcionario no encontrado.' })
  update(
    @Param('id', new MongoIdPipe()) id: string,
    @Body() updateEmployeeDto: Partial<CreateEmployeeDto>,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un funcionario' })
  @ApiResponse({ status: 200, description: 'Funcionario eliminado correctamente.' })
  @ApiResponse({ status: 400, description: 'ID no válido.' })
  @ApiResponse({ status: 404, description: 'Funcionario no encontrado.' })
  remove(@Param('id', new MongoIdPipe()) id: string) {
    return this.employeesService.remove(id);
  }
}
