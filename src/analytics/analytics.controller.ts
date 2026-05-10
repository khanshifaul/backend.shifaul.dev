import { Controller, Post, Body, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import express from 'express';

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
    @Req() req: express.Request,
  ) {
    const userAgent = req.headers['user-agent'];

    return this.analyticsService.trackEvent({
      ...data,
      userAgent,
    });
  }
}
