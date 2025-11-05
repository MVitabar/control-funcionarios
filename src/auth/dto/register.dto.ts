import { IsString, IsNotEmpty, MinLength, IsEmail, Validate } from 'class-validator';

// Custom validator to check if password and confirmPassword match
const MatchPassword = (property: string) => {
  return (object: any, propertyName: string) => {
    // Register a custom validation decorator
    object[`_${propertyName}`] = property;
    object[`_${propertyName}Validator`] = function(value: any) {
      return this[this[`_${propertyName}`]] === value;
    };
    
    // Add validation error message
    object.constructor['_validationMetadatas'] = object.constructor['_validationMetadatas'] || [];
    object.constructor['_validationMetadatas'].push({
      propertyName,
      target: object.constructor,
      constraints: [() => {
        return {
          message: 'Las contraseñas no coinciden',
          validator: (value: any) => value === object[property]
        };
      }],
      type: 'customValidation'
    });
  };
};

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  username: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @Validate(MatchPassword, ['password'])
  confirmPassword: string;
}
