import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1d';
        // Asegurarse de que expiresIn sea un string que jsonwebtoken pueda interpretar
        const expiresInValue = /^\d+$/.test(expiresIn) 
          ? parseInt(expiresIn, 10) 
          : expiresIn as any; // Usamos 'as any' para evitar problemas de tipo
          
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiresInValue },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
