import { PartialType } from '@nestjs/mapped-types';
import { CreateEnquiryDto } from './create-enquiry.dto';

// All fields optional — edits are only permitted while the enquiry is in DRAFT.
export class UpdateEnquiryDto extends PartialType(CreateEnquiryDto) {}
