import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './common/auth.guard';
import { AuditContextMiddleware } from './common/audit-context.middleware';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { EmailModule } from './modules/email/email.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ChargeTypesModule } from './modules/charge-types/charge-types.module';
import { MastersModule } from './modules/masters/masters.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { PortalModule } from './modules/portal/portal.module';
import { CourierModule } from './modules/courier/courier.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Dev runs from apps/api, so load the repo-root .env.
      // In Docker/prod, env vars come from the container (file absent is fine).
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    EmailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    LocationsModule,
    ChargeTypesModule,
    MastersModule,
    EnquiriesModule,
    PortalModule,
    CourierModule,
    DashboardModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}
