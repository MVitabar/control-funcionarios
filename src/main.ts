import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  
  // Configuración de CORS
  const allowedOrigins = [
    'http://localhost:8081',  // Tu frontend local
    'http://localhost:19006', // Posible otro puerto de desarrollo
    'exp://192.168.0.7:8081',
    'exp://192.168.0.7:19006',
    'http://192.168.0.7:8081',
    'http://192.168.0.7:19006',
    '0.0.0.0:8081'
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin 'origin' (como herramientas como Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `Origen '${origin}' no permitido por CORS`;
        logger.warn(msg);
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization', 'Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  // Manejo de solicitudes OPTIONS
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).json({});
    }
    next();
  });

  // Habilita el uso de class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // Puerto configurado para el servidor
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 Servidor corriendo en: http://localhost:${port}`);
  logger.log(`✅ CORS habilitado para orígenes: ${allowedOrigins.join(', ')}`);
}

bootstrap();
