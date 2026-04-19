export class CreateCompanyDto {
  name!: string;
  code?: string;
  slug?: string;
  status?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  currency?: string;
  driverLimit?: number;
  vehicleLimit?: number;
  dispatcherSeatLimit?: number;

  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}