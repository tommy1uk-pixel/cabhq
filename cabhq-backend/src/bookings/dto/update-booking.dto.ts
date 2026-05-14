export class UpdateBookingDto {
  pickup?: string;
  dropoff?: string;
  pickupTime?: string;

  customerName?: string | null;
  customerPhone?: string | null;

  passengerCount?: number | null;
  notes?: string | null;

  isThirdPartyBooking?: boolean;

  bookerName?: string | null;
  bookerPhone?: string | null;
  bookerEmail?: string | null;

  passengerName?: string | null;
  passengerPhone?: string | null;
  passengerNotes?: string | null;
}