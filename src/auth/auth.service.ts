import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(identifier: string, pass: string, isEmail: boolean = false): Promise<any> {
    this.logger.debug(`Validando usuario: ${identifier} (${isEmail ? 'email' : 'username'})`);
    
    try {
      let user;
      if (isEmail) {
        user = await this.usersService.findByEmail(identifier);
      } else {
        user = await this.usersService.findOne(identifier);
      }
      
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${identifier}`);
        return null;
      }

      const isPasswordValid = await bcrypt.compare(pass, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Contraseña inválida para el usuario: ${identifier}`);
        return null;
      }

      this.logger.debug(`Usuario validado correctamente: ${identifier}`);
      const { password, ...result } = user.toJSON();
      return result;
    } catch (error) {
      this.logger.error(`Error al validar usuario ${identifier}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: any) {
    // Validar que se proporcione al menos username o email
    // loginDto.validateLogin();
    
    const { username, email, password } = loginDto;
    const identifier = username || email;
    const isEmail = !!email;
    
    this.logger.debug(`Iniciando sesión para: ${identifier} (${isEmail ? 'email' : 'username'})`);
    
    // Validar usuario
    const user = await this.validateUser(identifier, password, isEmail);
    if (!user) {
      this.logger.warn(`Credenciales inválidas para: ${identifier}`);
      throw new Error('Credenciales inválidas');
    }
    
    // Generar token
    this.logger.debug(`Generando token para el usuario: ${user.username}`);
    const payload = { 
      username: user.username, 
      sub: user._id 
    };
    const token = this.jwtService.sign(payload);
      
    this.logger.log(`Sesión iniciada para el usuario: ${user.username} (ID: ${user._id})`);
      
    return {
      access_token: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
    };
  }

  async register(createUserDto: any): Promise<User> {
    const { username, email } = createUserDto;
    this.logger.debug(`Registrando nuevo usuario: ${username} (${email})`);
    
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.usersService.findOne(username);
      if (existingUser) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }

      // Verificar si el correo ya está registrado
      const existingEmail = await this.usersService.findByEmail(email);
      if (existingEmail) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }

      // Crear el usuario usando el DTO
      const user = await this.usersService.create(createUserDto);
      
      this.logger.log(`Usuario registrado exitosamente: ${username} (ID: ${user._id})`);
      return user;
    } catch (error) {
      this.logger.error(`Error al registrar usuario ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
