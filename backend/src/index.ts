import app from './app';
import { AlertService } from './services/alert.service';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Connected to database');

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server running');
      AlertService.init();
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
