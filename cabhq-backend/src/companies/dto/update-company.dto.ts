export class UpdateCompanyDto {
  name?: string;
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
}