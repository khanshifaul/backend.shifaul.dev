import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { Request } from 'express';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Post('collect')
  async collectEvent(
    @Body() data: {
      event: string;
      url: string;
      referrer?: string;
      metadata?: any;
    },
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ip = data.metadata?.ip || req.headers['x-forwarded-for'] || req.ip;

    return this.analyticsService.trackEvent({
      ...data,
      userAgent,
      metadata: {
        ...data.metadata,
        ip,
      },
    });
  }
}
