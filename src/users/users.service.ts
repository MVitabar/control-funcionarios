import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findOne(username: string): Promise<User | undefined> {
    this.logger.debug(`Buscando usuario: ${username}`);
    try {
      const user = await this.userModel.findOne({ username }).exec();
      if (!user) {
        this.logger.debug(`Usuario no encontrado: ${username}`);
      }
      return user || undefined;
    } catch (error) {
      this.logger.error(`Error al buscar usuario ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.debug(`Buscando usuario por email: ${email}`);
    try {
      const user = await this.userModel.findOne({ email }).select('+password').exec();
      if (!user) {
        this.logger.debug(`Usuario con email ${email} no encontrado`);
      }
      return user || undefined;
    } catch (error) {
      this.logger.error(`Error al buscar por email ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { name, username, email, password } = createUserDto;
    this.logger.debug(`Creando nuevo usuario: ${username} (${email})`);
    
    try {
      // Verificar si el nombre de usuario ya existe
      const existingUser = await this.userModel.findOne({ username }).exec();
      if (existingUser) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
      
      // Verificar si el correo ya está registrado
      const existingEmail = await this.userModel.findOne({ email }).exec();
      if (existingEmail) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new this.userModel({
        name,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
      });
      
      const savedUser = await newUser.save();
      this.logger.log(`Usuario creado exitosamente: ${username} (ID: ${savedUser._id})`);
      
      // No devolver la contraseña
      savedUser.password = undefined;
      return savedUser;
    } catch (error) {
      this.logger.error(`Error al crear usuario ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<User | undefined> {
    this.logger.debug(`Buscando usuario por ID: ${id}`);
    try {
      const user = await this.userModel.findById(id).select('-password').exec();
      if (!user) {
        this.logger.warn(`Usuario no encontrado con ID: ${id}`);
        return undefined;
      }
      return user;
    } catch (error) {
      this.logger.error(`Error al buscar usuario por ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.debug(`Validando credenciales para: ${username}`);
    try {
      const user = await this.findOne(username);
      
      if (!user) {
        this.logger.warn(`Intento de inicio de sesión para usuario inexistente: ${username}`);
        return null;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (isPasswordValid) {
        this.logger.debug(`Credenciales válidas para el usuario: ${username}`);
        const { password: _, ...result } = user.toJSON();
        return result;
      }
      
      this.logger.warn(`Contraseña incorrecta para el usuario: ${username}`);
      return null
    } catch (error) {
      this.logger.error(`Error al validar usuario ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
