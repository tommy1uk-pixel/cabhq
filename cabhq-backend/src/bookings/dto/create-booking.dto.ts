import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  pickup?: string;

  @IsOptional()
  @IsString()
  dropoff?: string;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsOptional()
  @IsString()
  dropoffAddress?: string;

  @IsOptional()
  @IsNumber()
  pickupLat?: number | null;

  @IsOptional()
  @IsNumber()
  pickupLng?: number | null;

  @IsOptional()
  @IsNumber()
  dropoffLat?: number | null;

  @IsOptional()
  @IsNumber()
  dropoffLng?: number | null;

  @IsOptional()
  @IsNumber()
  pickupLatitude?: number | null;

  @IsOptional()
  @IsNumber()
  pickupLongitude?: number | null;

  @IsOptional()
  @IsNumber()
  dropoffLatitude?: number | null;

  @IsOptional()
  @IsNumber()
  dropoffLongitude?: number | null;

  @IsOptional()
  @IsString()
  pickupTime?: string;

  @IsOptional()
  @IsString()
  pickupAt?: string;

  @IsOptional()
  @IsString()
  pricingMode?: string | null;

  @IsOptional()
  @IsNumber()
  quotedPrice?: number | null;

  @IsOptional()
  @IsNumber()
  calculatedFare?: number | null;

  @IsOptional()
  @IsNumber()
  distanceMiles?: number | null;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  autoDispatch?: boolean;

  @IsOptional()
  @IsString()
  customerName?: string | null;

  @IsOptional()
  @IsString()
  customerPhone?: string | null;

  @IsOptional()
  @IsString()
  accountId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  passengerCount?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isThirdPartyBooking?: boolean;

  @IsOptional()
  @IsString()
  bookerName?: string | null;

  @IsOptional()
  @IsString()
  bookerPhone?: string | null;

  @IsOptional()
  @IsString()
  bookerEmail?: string | null;

  @IsOptional()
  @IsString()
  passengerName?: string | null;

  @IsOptional()
  @IsString()
  passengerPhone?: string | null;

  @IsOptional()
  @IsString()
  passengerNotes?: string | null;

  @IsOptional()
  @IsBoolean()
  isAirportBooking?: boolean;

  @IsOptional()
  @IsString()
  airportCode?: string | null;

  @IsOptional()
  @IsString()
  airportName?: string | null;

  @IsOptional()
  @IsString()
  airportTerminal?: string | null;

  @IsOptional()
  @IsString()
  flightNumber?: string | null;

  @IsOptional()
  @IsString()
  flightDirection?: string | null;

  @IsOptional()
  @IsString()
  flightDateTime?: string | null;

  @IsOptional()
  @IsString()
  airline?: string | null;

  @IsOptional()
  @IsBoolean()
  meetAndGreet?: boolean;

  @IsOptional()
  @IsString()
  airportNotes?: string | null;
}