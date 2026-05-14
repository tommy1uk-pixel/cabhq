import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto.login.dto';
import { AuthGuard } from '@nestjs/passport';

type DriverLoginBody = {
  companyId: string;
  username: string;
  pin: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('driver-login')
  driverLogin(@Body() body: DriverLoginBody) {
    return this.auth.driverLogin(body.companyId, body.username, body.pin);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.sub, req.user.role);
  }
}