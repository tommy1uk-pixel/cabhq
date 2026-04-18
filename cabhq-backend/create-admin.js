require('dotenv').config();

const { PrismaClient, Role } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@cabhq.com';
  const password = 'Admin123!';

  let company = await prisma.company.findFirst();

  if (!company) {
    company = await prisma.company.create({
      data: { name: 'CABHQ' },
    });
    console.log('Created company:', company.name);
  } else {
    console.log('Using existing company:', company.name);
  }

  const hashed = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hashed);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        role: Role.ADMIN,
        companyId: company.id,
      },
    });
    console.log('Updated existing admin user:', email);
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: Role.ADMIN,
        companyId: company.id,
      },
    });
    console.log('Created admin user:', email);
  }

  const saved = await prisma.user.findUnique({
    where: { email },
  });

  console.log('Saved user exists:', !!saved);
  console.log('Saved email:', saved?.email);
  console.log('Saved hash:', saved?.password);

  const compareResult = await bcrypt.compare(password, saved.password);
  console.log('Local bcrypt compare result:', compareResult);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });