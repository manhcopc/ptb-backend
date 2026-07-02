import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      message: 'Photobooth Backend is running successfully!',
      timestamp: new Date().toISOString(),
    };
  }
}
