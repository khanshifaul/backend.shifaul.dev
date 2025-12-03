import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from '../../utils/logger/logger.service';
import {
  AdminUserGrowthQueryDto,
  UserGrowthGrouping,
  UserGrowthTimeRange,
  UserStatusFilter,
} from '../dto/admin-user-growth-query.dto';
import {
  AdminUserGrowthResponseDto,
  UserGrowthDataPoint,
  UserGrowthSummary,
} from '../dto/admin-user-growth-response.dto';

@Injectable()
export class AdminUserGrowthService {
  private readonly logger = new Logger(AdminUserGrowthService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly loggerService: LoggerService,
  ) {}

  async getUserGrowthAnalytics(
    query: AdminUserGrowthQueryDto,
  ): Promise<AdminUserGrowthResponseDto> {
    try {
      const { startDate, endDate } = this.calculateDateRange(query);
      const userStatusFilter = query.userStatus || [];

      // Get user registration data grouped by date
      const userGrowthData = await this.getUserGrowthData(
        startDate,
        endDate,
        userStatusFilter,
      );

      // Calculate growth metrics
      const dataPoints = this.calculateGrowthMetrics(
        userGrowthData,
        query.groupBy || UserGrowthGrouping.DAY,
      );

      // Calculate summary statistics
      const summary = this.calculateSummary(dataPoints);

      const response: AdminUserGrowthResponseDto = {
        timeRange: query.timeRange || UserGrowthTimeRange.THIS_MONTH,
        groupBy: query.groupBy || UserGrowthGrouping.DAY,
        timezone: query.timezone || 'UTC',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        data: dataPoints,
        summary,
        totalPoints: dataPoints.length,
        filters: {
          userStatus: userStatusFilter,
        },
      };

      this.logger.log(
        `Generated user growth analytics: ${dataPoints.length} data points`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        'Failed to generate user growth analytics:',
        error.message,
      );
      throw error;
    }
  }

  private calculateDateRange(query: AdminUserGrowthQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const timezone = query.timezone || 'UTC';

    switch (query.timeRange) {
      case UserGrowthTimeRange.YESTERDAY:
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return {
          startDate: new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
          ),
          endDate: new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
            23,
            59,
            59,
            999,
          ),
        };

      case UserGrowthTimeRange.TODAY:
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
          ),
        };

      case UserGrowthTimeRange.THIS_WEEK:
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          startDate: new Date(
            startOfWeek.getFullYear(),
            startOfWeek.getMonth(),
            startOfWeek.getDate(),
          ),
          endDate: new Date(
            endOfWeek.getFullYear(),
            endOfWeek.getMonth(),
            endOfWeek.getDate(),
            23,
            59,
            59,
            999,
          ),
        };

      case UserGrowthTimeRange.LAST_WEEK:
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return {
          startDate: new Date(
            lastWeekStart.getFullYear(),
            lastWeekStart.getMonth(),
            lastWeekStart.getDate(),
          ),
          endDate: new Date(
            lastWeekEnd.getFullYear(),
            lastWeekEnd.getMonth(),
            lastWeekEnd.getDate(),
            23,
            59,
            59,
            999,
          ),
        };

      case UserGrowthTimeRange.THIS_MONTH:
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        };

      case UserGrowthTimeRange.LAST_MONTH:
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: lastMonth,
          endDate: new Date(
            lastMonthEnd.getFullYear(),
            lastMonthEnd.getMonth(),
            lastMonthEnd.getDate(),
            23,
            59,
            59,
            999,
          ),
        };

      case UserGrowthTimeRange.THIS_YEAR:
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        };

      case UserGrowthTimeRange.LAST_YEAR:
        return {
          startDate: new Date(now.getFullYear() - 1, 0, 1),
          endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
        };

      case UserGrowthTimeRange.CUSTOM:
        if (!query.startDate || !query.endDate) {
          throw new Error(
            'startDate and endDate are required when timeRange is CUSTOM',
          );
        }
        return {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        };

      default:
        // Default to this month
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        };
    }
  }

  private async getUserGrowthData(
    startDate: Date,
    endDate: Date,
    userStatusFilter: UserStatusFilter[],
  ): Promise<Array<{ date: string; count: number }>> {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userStatusFilter.length > 0) {
      where.status = { in: userStatusFilter };
    }

    // Get daily user counts
    const dailyData = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Convert to date-based aggregation
    const dateMap = new Map<string, number>();

    dailyData.forEach((item) => {
      const date = item.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      dateMap.set(date, (dateMap.get(date) || 0) + item._count.id);
    });

    // Fill in missing dates with 0
    const result: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(startDate);
    const endDateStr = endDate.toISOString().split('T')[0];

    while (currentDate.toISOString().split('T')[0] <= endDateStr) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  private calculateGrowthMetrics(
    userGrowthData: Array<{ date: string; count: number }>,
    groupBy: UserGrowthGrouping,
  ): UserGrowthDataPoint[] {
    const groupedData = this.groupDataByPeriod(userGrowthData, groupBy);

    let cumulativeUsers = 0;
    let previousPeriodUsers = 0;

    const dataPoints: UserGrowthDataPoint[] = [];

    for (let i = 0; i < groupedData.length; i++) {
      const periodData = groupedData[i];
      const newUsers = periodData.count;
      cumulativeUsers += newUsers;

      const growthPercentage =
        previousPeriodUsers > 0
          ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100
          : 0;

      // Calculate cumulative growth from the start
      const initialUsers = dataPoints.length > 0 ? dataPoints[0].totalUsers : 0;
      const cumulativeGrowth =
        initialUsers > 0
          ? ((cumulativeUsers - initialUsers) / initialUsers) * 100
          : 0;

      dataPoints.push({
        period: periodData.period,
        totalUsers: cumulativeUsers,
        newUsers,
        growthPercentage: parseFloat(growthPercentage.toFixed(2)),
        cumulativeGrowth: parseFloat(cumulativeGrowth.toFixed(2)),
      });

      previousPeriodUsers = newUsers;
    }

    return dataPoints;
  }

  private groupDataByPeriod(
    dailyData: Array<{ date: string; count: number }>,
    groupBy: UserGrowthGrouping,
  ): Array<{ period: string; count: number }> {
    const periodMap = new Map<string, number>();

    dailyData.forEach((day) => {
      let periodKey: string;

      switch (groupBy) {
        case UserGrowthGrouping.WEEK:
          const weekDate = new Date(day.date);
          const weekStart = new Date(weekDate);
          weekStart.setDate(weekDate.getDate() - weekDate.getDay()); // Start of week
          periodKey = weekStart.toISOString().split('T')[0];
          break;

        case UserGrowthGrouping.MONTH:
          const monthDate = new Date(day.date);
          periodKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
          break;

        default: // DAY
          periodKey = day.date;
          break;
      }

      periodMap.set(periodKey, (periodMap.get(periodKey) || 0) + day.count);
    });

    // Sort periods
    const sortedPeriods = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));

    return sortedPeriods;
  }

  private calculateSummary(
    dataPoints: UserGrowthDataPoint[],
  ): UserGrowthSummary {
    if (dataPoints.length === 0) {
      return {
        initialUsers: 0,
        finalUsers: 0,
        totalNewUsers: 0,
        averageGrowthRate: 0,
        peakGrowthRate: 0,
        overallGrowthPercentage: 0,
      };
    }

    const initialUsers =
      dataPoints[0]?.totalUsers - dataPoints[0]?.newUsers || 0;
    const finalUsers = dataPoints[dataPoints.length - 1]?.totalUsers || 0;
    const totalNewUsers = dataPoints.reduce(
      (sum, point) => sum + point.newUsers,
      0,
    );

    const growthRates = dataPoints
      .slice(1) // Skip first period as it has no previous comparison
      .map((point) => point.growthPercentage);

    const averageGrowthRate =
      growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;

    const peakGrowthRate =
      growthRates.length > 0 ? Math.max(...growthRates) : 0;

    const overallGrowthPercentage =
      initialUsers > 0 ? ((finalUsers - initialUsers) / initialUsers) * 100 : 0;

    return {
      initialUsers,
      finalUsers,
      totalNewUsers,
      averageGrowthRate: parseFloat(averageGrowthRate.toFixed(2)),
      peakGrowthRate: parseFloat(peakGrowthRate.toFixed(2)),
      overallGrowthPercentage: parseFloat(overallGrowthPercentage.toFixed(2)),
    };
  }
}
