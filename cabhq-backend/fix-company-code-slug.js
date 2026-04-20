require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeCode(value) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

  for (const company of companies) {
    const needsCode = !company.code || !company.code.trim();
    const needsSlug = !company.slug || !company.slug.trim();

    if (!needsCode && !needsSlug) {
      continue;
    }

    const baseSlug = makeSlug(company.name || 'company');
    const baseCode = makeCode(company.name || 'company');

    const slug = `${baseSlug}-${company.id.slice(0, 6)}`;
    const code = `${baseCode}-${company.id.slice(0, 6).toUpperCase()}`;

    await prisma.company.update({
      where: { id: company.id },
      data: {
        ...(needsSlug ? { slug } : {}),
        ...(needsCode ? { code } : {}),
      },
    });

    console.log(`Updated ${company.name}:`);
    console.log(`  code = ${needsCode ? code : company.code}`);
    console.log(`  slug = ${needsSlug ? slug : company.slug}`);
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });