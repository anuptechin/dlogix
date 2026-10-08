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
import { getReqCtx } from '../../common/request-context';
import { CourierService } from './courier.service';
import { ExportCourierService } from './export-courier.service';
import { SaveContractDto } from './dto/save-contract.dto';
import { CalculateDto } from './dto/calculate.dto';
import { UpdateRateCardDto } from './dto/rate-card.dto';
import { ExportCalcDto } from './dto/export-calc.dto';
import { EmailQuoteDto } from './dto/email-quote.dto';

type CalcResult = Awaited<ReturnType<ExportCourierService['calculate']>>;
const ZERO = { inr: 0, usd: 0, gbp: 0, eur: 0 };

// End-users may see only the customer quote (ex-GST) — strip internal cost,
// margin and the GST/grand-total so it can't be read from the API response.
function redactForEndUser(res: CalcResult): CalcResult {
  return {
    ...res,
    cost: { ...ZERO },
    grandTotal: { ...ZERO },
    breakdown: {
      ...res.breakdown,
      base: 0,
      ratePerKg: 0,
      surchargePerKg: 0,
      fuelPerKg: 0,
      subtotalPerKg: 0,
      costToUs: 0,
      marginX: 0,
      sellingInr: res.breakdown.sellingInr,
      gstAmount: 0,
      grandTotalInr: 0,
    },
  };
}

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
  async exportCalculate(@Body() dto: ExportCalcDto) {
    const res = await this.exportCourier.calculate(dto);
    return getReqCtx()?.role === UserRole.END_USER ? redactForEndUser(res) : res;
  }

  @Post('email-quote')
  emailQuote(@Body() dto: EmailQuoteDto) {
    return this.exportCourier.emailQuote(dto);
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
