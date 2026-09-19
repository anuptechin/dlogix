import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourierCarrier, UserRole } from '@prisma/client';
import { Roles, RolesGuard } from '../../common/roles.guard';
import { CourierService } from './courier.service';
import { ExportCourierService } from './export-courier.service';
import { SaveContractDto } from './dto/save-contract.dto';
import { CalculateDto } from './dto/calculate.dto';
import { UpdateRateCardDto } from './dto/rate-card.dto';
import { ExportCalcDto } from './dto/export-calc.dto';

// NOTE: RBAC to be added with auth (P0-3):
//   contract writes → LOGISTICS/ADMIN; calculate/list → LOGISTICS + DOCUMENTATION.
@Controller('courier')
export class CourierController {
  constructor(
    private readonly courier: CourierService,
    private readonly exportCourier: ExportCourierService,
  ) {}

  // ─── Export rate cards (DHL / FedEx) — Admin & Manager only ──
  @Get('rate-cards')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  rateCards() {
    return this.exportCourier.listCards();
  }

  @Post('rate-cards/import')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  importRateCards(@UploadedFile() file: { buffer: Buffer }) {
    return this.exportCourier.importWorkbook(file.buffer);
  }

  @Patch('rate-cards/:carrier')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  updateRateCard(
    @Param('carrier') carrier: CourierCarrier,
    @Body() dto: UpdateRateCardDto,
  ) {
    return this.exportCourier.updateConfig(carrier, dto);
  }

  @Get('rate-cards/:carrier/countries')
  rateCardCountries(@Param('carrier') carrier: CourierCarrier) {
    return this.exportCourier.countries(carrier);
  }

  @Post('export-calculate')
  exportCalculate(@Body() dto: ExportCalcDto) {
    return this.exportCourier.calculate(dto);
  }

  @Get('contracts')
  list(@Query('active') active?: string) {
    return this.courier.list({ activeOnly: active === 'true' });
  }

  @Get('contracts/:id')
  get(@Param('id') id: string) {
    return this.courier.findOne(id);
  }

  @Get('contracts/:id/zones')
  zones(@Param('id') id: string) {
    return this.courier.zones(id);
  }

  @Post('contracts')
  create(@Body() dto: SaveContractDto) {
    return this.courier.create(dto);
  }

  @Patch('contracts/:id')
  update(@Param('id') id: string, @Body() dto: SaveContractDto) {
    return this.courier.update(id, dto);
  }

  @Delete('contracts/:id')
  remove(@Param('id') id: string) {
    return this.courier.remove(id);
  }

  @Post('calculate')
  calculate(@Body() dto: CalculateDto) {
    return this.courier.calculate(dto);
  }
}
