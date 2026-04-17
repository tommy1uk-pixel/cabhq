import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DriverAuthService } from './driver-auth.service';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';

type DriverRequest = {
  user: {
    sub: string;
    companyId: string;
  };
};

@Controller(['driver', 'driver-auth'])
export class DriverAuthController {
  constructor(private readonly driverAuthService: DriverAuthService) {}

  @Post('login')
  async login(
    @Body()
    body: {
      phone: string;
      pin: string;
    },
  ) {
    return this.driverAuthService.login(body.phone, body.pin);
  }

  @Get('me')
  @UseGuards(DriverJwtAuthGuard)
  async me(@Req() req: DriverRequest) {
    return this.driverAuthService.me(req.user.sub, req.user.companyId);
  }
}