import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    this.logger.log(`Obteniendo perfil del usuario ID: ${req.user.userId}`);
    
    try {
      const user = await this.usersService.findById(req.user.userId);
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${req.user.userId}`);
        throw new Error('Usuario no encontrado');
      }

      // No devolver la contraseña
      const { password, ...result } = user.toJSON();
      return result;
    } catch (error) {
      this.logger.error(`Error al obtener perfil: ${error.message}`, error.stack);
      throw error;
    }
  }
}
