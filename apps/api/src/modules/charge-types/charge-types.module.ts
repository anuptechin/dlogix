import { Module } from '@nestjs/common';
import { ChargeTypesController } from './charge-types.controller';

@Module({ controllers: [ChargeTypesController] })
export class ChargeTypesModule {}
