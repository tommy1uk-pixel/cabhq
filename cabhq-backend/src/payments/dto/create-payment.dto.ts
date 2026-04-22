import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsString()
  accountName!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsString()
  method!: string;

  @IsString()
  status!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}