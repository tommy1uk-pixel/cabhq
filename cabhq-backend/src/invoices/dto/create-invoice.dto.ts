export class CreateInvoiceDto {
  accountName!: string;
  issueDate!: string;
  dueDate!: string;
  tripCount!: number;
  subtotal!: number;
  vat!: number;
  notes?: string | null;
}