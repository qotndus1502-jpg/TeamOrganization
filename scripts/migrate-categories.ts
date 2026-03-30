import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 기존 category 데이터 삭제 (스키마 변경으로 재생성 필요)
  await prisma.category.deleteMany();
  console.log("Cleared old categories");

  const teams = await prisma.team.findMany({
    where: { category: { not: null } },
    include: { location: true },
  });

  const cats = new Map<string, { name: string; company: string; locationId: number }>();
  teams.forEach((t) => {
    const key = `${t.category}|${t.locationId}`;
    if (!cats.has(key)) {
      cats.set(key, { name: t.category!, company: t.location.company, locationId: t.locationId });
    }
  });

  for (const c of cats.values()) {
    await prisma.category.create({ data: c });
    console.log("Created:", c.name, "-", c.company, "- locationId:", c.locationId);
  }
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
