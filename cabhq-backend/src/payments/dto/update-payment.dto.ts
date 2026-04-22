import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  accountId?: string | null;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string | null;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}