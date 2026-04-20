export class CreateCompanyUserDto {
  email!: string;
  password!: string;
  role!: 'ADMIN' | 'OPERATOR' | 'DRIVER';
}