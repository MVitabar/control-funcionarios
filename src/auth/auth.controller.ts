import { 
  Body, 
  Controller, 
  Post, 
  UseGuards, 
  Request, 
  Get, 
  Logger, 
  UsePipes, 
  ValidationPipe, 
  BadRequestException 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('login')
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() loginDto: LoginDto) {
    try {
      // Validar que se proporcione al menos email o username
      if (!loginDto.email && !loginDto.username) {
        throw new BadRequestException('Se requiere email o nombre de usuario');
      }

      const identifier = loginDto.email || loginDto.username;
      this.logger.log(`Intento de login para: ${identifier}`);
      
      const result = await this.authService.login(loginDto);
      this.logger.log(`Login exitoso para: ${result.user.username} (ID: ${result.user.id})`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error en el login: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ transform: true }))
  async register(@Body() createUserDto: CreateUserDto) {
    const { username, email } = createUserDto;
    this.logger.log(`Solicitud de registro para el usuario: ${username} (${email})`);
    
    try {
      const user = await this.authService.register(createUserDto);
      this.logger.log(`Usuario registrado exitosamente: ${username} (ID: ${user._id})`);
      
      // No devolver la contraseña
      const { password, ...result } = user.toJSON();
      return {
        ...result,
        message: 'Usuario registrado exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error al registrar usuario ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    this.logger.log(`Solicitud de perfil para el usuario ID: ${req.user?.userId || 'desconocido'}`);
    return req.user;
  }
}
