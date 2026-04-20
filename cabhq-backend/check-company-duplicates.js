require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log('Companies:');
  console.table(companies);

  const codeCounts = new Map();
  const slugCounts = new Map();

  for (const company of companies) {
    const codeKey = company.code ?? '__NULL__';
    const slugKey = company.slug ?? '__NULL__';

    codeCounts.set(codeKey, (codeCounts.get(codeKey) || 0) + 1);
    slugCounts.set(slugKey, (slugCounts.get(slugKey) || 0) + 1);
  }

  const duplicateCodes = [...codeCounts.entries()].filter(([, count]) => count > 1);
  const duplicateSlugs = [...slugCounts.entries()].filter(([, count]) => count > 1);

  console.log('\nDuplicate codes:');
  console.table(duplicateCodes.map(([value, count]) => ({ value, count })));

  console.log('\nDuplicate slugs:');
  console.table(duplicateSlugs.map(([value, count]) => ({ value, count })));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });