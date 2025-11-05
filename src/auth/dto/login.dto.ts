import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  // Método para validar que al menos uno de los campos esté presente
  validateLogin() {
    if (!this.username && !this.email) {
      throw new Error('Se requiere nombre de usuario o correo electrónico');
    }
  }
}
