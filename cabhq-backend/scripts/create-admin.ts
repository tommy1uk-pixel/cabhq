import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in .env');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const companyName = 'CabHQ Ltd';
  const email = 'admin@cabhq.co.uk';
  const password = 'Password123!';

  let company = await prisma.company.findFirst({
    where: { name: companyName },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: Role.ADMIN,
        companyId: company.id,
      },
    });

    console.log('Admin user updated');
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        companyId: company.id,
      },
    });

    console.log('Admin user created');
  }

  console.log('Login details:');
  console.log('Email:', email);
  console.log('Password:', password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });