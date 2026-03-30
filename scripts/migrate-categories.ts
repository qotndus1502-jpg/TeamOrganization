import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { category: { not: null } },
    include: { location: true },
  });

  const cats = new Map<string, { name: string; company: string }>();
  teams.forEach((t) => {
    const key = `${t.category}|${t.location.company}`;
    if (!cats.has(key)) cats.set(key, { name: t.category!, company: t.location.company });
  });

  for (const c of cats.values()) {
    const existing = await prisma.category.findUnique({
      where: { name_company: { name: c.name, company: c.company } },
    });
    if (!existing) {
      await prisma.category.create({ data: { name: c.name, company: c.company } });
      console.log("Created:", c.name, "-", c.company);
    } else {
      console.log("Exists:", c.name, "-", c.company);
    }
  }
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
