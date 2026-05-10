import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

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
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.analyticsService.trackEvent({
      ...data,
      userAgent,
    });
  }
}
