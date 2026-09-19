import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EnquiryStatus, ShipmentDirection, ShipmentMode } from '@prisma/client';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { AddVendorsDto } from './dto/add-vendors.dto';
import { AwardDto } from './dto/award.dto';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? resolve(process.cwd(), 'uploads');
const documentStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) =>
    cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

// NOTE: RBAC guards (LOGISTICS) to be added with auth (P0-3).
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  list(
    @Query('status') status?: EnquiryStatus,
    @Query('mode') mode?: ShipmentMode,
    @Query('direction') direction?: ShipmentDirection,
  ) {
    return this.enquiries.findAll({ status, mode, direction });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.enquiries.findOne(id);
  }

  @Get(':id/comparison')
  comparison(@Param('id') id: string) {
    return this.enquiries.getComparison(id);
  }

  @Post()
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiries.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnquiryDto) {
    return this.enquiries.update(id, dto);
  }

  @Post(':id/vendors')
  addVendors(@Param('id') id: string, @Body() dto: AddVendorsDto) {
    return this.enquiries.addVendors(id, dto.vendorIds);
  }

  @Delete(':id/vendors/:enquiryVendorId')
  removeVendor(
    @Param('id') id: string,
    @Param('enquiryVendorId') enquiryVendorId: string,
  ) {
    return this.enquiries.removeVendor(id, enquiryVendorId);
  }

  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.enquiries.send(id);
  }

  @Post(':id/award')
  award(@Param('id') id: string, @Body() dto: AwardDto) {
    return this.enquiries.award(id, dto.quotationId, dto.reason);
  }

  // ─── Smart Decision Panel ──────────────────────────────────
  @Get(':id/insights')
  insights(@Param('id') id: string) {
    return this.enquiries.getInsights(id);
  }

  // ─── Documents ─────────────────────────────────────────────
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: documentStorage,
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; path: string; mimetype?: string; size?: number },
    @Body('docType') docType?: string,
  ) {
    return this.enquiries.addDocument(id, file, docType);
  }

  @Get(':id/documents/:docId/download')
  async downloadDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res({ passthrough: true }) res: { set: (h: Record<string, string>) => void },
  ) {
    const doc = await this.enquiries.getDocument(id, docId);
    res.set({
      'Content-Type': doc.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
    });
    return new StreamableFile(createReadStream(doc.filePath));
  }

  @Delete(':id/documents/:docId')
  removeDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.enquiries.removeDocument(id, docId);
  }
}
