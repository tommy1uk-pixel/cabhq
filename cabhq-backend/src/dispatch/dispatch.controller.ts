import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutoDispatchService } from './auto-dispatch.service';

@Controller('dispatch')
@UseGuards(JwtAuthGuard)
export class DispatchController {
  constructor(private readonly autoDispatchService: AutoDispatchService) {}

  @Post('bookings/:id/start')
  async start(@Param('id') bookingId: string, @Body() body: { companyId: string }) {
    return this.autoDispatchService.startForBooking(bookingId, body.companyId);
  }

  @Post('bookings/:id/cancel-offer')
  async cancelOffer(@Param('id') bookingId: string) {
    await this.autoDispatchService.cancelActiveOffer(bookingId);
    return { success: true };
  }
}