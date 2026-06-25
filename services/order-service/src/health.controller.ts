import { Controller, Get } from '@nestjs/common';

// Endpoint cho Kubernetes liveness/readiness probe
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'order-service',
      timestamp: new Date().toISOString(),
    };
  }
}
