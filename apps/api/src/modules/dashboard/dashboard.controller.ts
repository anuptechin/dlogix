import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

// NOTE: RBAC (MANAGEMENT + LOGISTICS read) to be added with auth (P0-3).
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary() {
    return this.dashboard.summary();
  }
}
