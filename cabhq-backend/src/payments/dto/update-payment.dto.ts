export class UpdatePaymentDto {
  accountName?: string;
  invoiceNumber?: string | null;
  method?: string;
  status?: string;
  amount?: number;
  paymentDate?: string;
  allocatedAmount?: number;
  notes?: string | null;
}