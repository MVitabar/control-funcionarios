import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata, Optional } from '@nestjs/common';
import { Types } from 'mongoose';

export interface MongoIdPipeOptions {
  optional?: boolean;
}

@Injectable()
export class MongoIdPipe implements PipeTransform {
  constructor(@Optional() private options?: MongoIdPipeOptions) {}

  transform(value: any, metadata: ArgumentMetadata) {
    // Si el valor es undefined o null y es opcional, retornar undefined
    if ((value === undefined || value === null) && this.options?.optional) {
      return undefined;
    }

    // Si el valor es una cadena vacía y es opcional, retornar undefined
    if (value === '' && this.options?.optional) {
      return undefined;
    }

    try {
      // Si es un objeto con $oid (como viene de MongoDB)
      if (value && typeof value === 'object' && value.$oid) {
        return new Types.ObjectId(value.$oid);
      }
      // Si ya es un string que parece ObjectId
      if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return new Types.ObjectId(value);
      }
      
      // Si es opcional y no hay valor, retornar undefined
      if (this.options?.optional && (value === undefined || value === null || value === '')) {
        return undefined;
      }
      
      throw new Error('ID no válido');
    } catch (error) {
      throw new BadRequestException('ID no válido');
    }
  }
}
