import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PortalService } from './portal.service';
import { SaveQuotationDto } from './dto/save-quotation.dto';
import { Public } from '../../common/auth.guard';

// Public, token-authenticated vendor portal — NO login, NO app RBAC.
// The token is the only credential; endpoints expose nothing about other vendors.
@Controller('portal')
@Public()
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get(':token')
  summary(@Param('token') token: string) {
    return this.portal.getSummary(token);
  }

  @Put(':token/quotation')
  save(@Param('token') token: string, @Body() dto: SaveQuotationDto) {
    return this.portal.save(token, dto);
  }

  @Post(':token/submit')
  submit(@Param('token') token: string) {
    return this.portal.submit(token);
  }
}
