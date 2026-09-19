import { Module } from '@nestjs/common';
import { CourierController } from './courier.controller';
import { CourierService } from './courier.service';
import { ExportCourierService } from './export-courier.service';

@Module({
  controllers: [CourierController],
  providers: [CourierService, ExportCourierService],
  exports: [CourierService, ExportCourierService],
})
export class CourierModule {}
