import { SignOptions } from 'jsonwebtoken';

export interface JwtModuleOptions {
  secret: string;
  signOptions: SignOptions;
}
