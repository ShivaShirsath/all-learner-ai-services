import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import * as mongoose from 'mongoose';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiExcludeEndpoint(true)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/ping')
  checkHealth(): { status: boolean; message: string } {
    return {
      status: true,
      message: 'Learner ai service App is working',
    };
  }

  @Get('/health')
  deepHealth() {
    const dbType = process.env.DATABASE || 'mongodb';
    const mongoOk =
      dbType === 'mongodb'
        ? mongoose.connections.some((c) => c.readyState === 1)
        : null;
    const allOk = mongoOk !== false;
    return {
      status: allOk ? 'ok' : 'degraded',
      services: {
        ...(mongoOk !== null && { mongodb: mongoOk }),
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
