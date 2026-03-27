import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.employee.deleteMany();
  await prisma.team.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  // 관리자 계정
  await prisma.user.create({
    data: {
      email: "admin@nk.com",
      password: await bcrypt.hash("admin", 10),
      name: "관리자",
      role: "ADMIN",
    },
  });

  // ── 3사 통합관리 ──
  const unifiedHq = await prisma.location.create({
    data: { company: "3사 통합관리", name: "본사", type: "HQ" },
  });
  await prisma.team.create({ data: { name: "재무관리팀", locationId: unifiedHq.id } });
  await prisma.team.create({ data: { name: "법무팀", locationId: unifiedHq.id } });
  await prisma.team.create({ data: { name: "감사팀", locationId: unifiedHq.id } });
  await prisma.team.create({ data: { name: "경영기획1팀", locationId: unifiedHq.id } });
  await prisma.team.create({ data: { name: "경영기획2팀", locationId: unifiedHq.id } });
  await prisma.team.create({ data: { name: "외주조달팀", locationId: unifiedHq.id } });

  // ── 남광토건 ──
  const nkHq = await prisma.location.create({
    data: { company: "남광토건", name: "본사", type: "HQ" },
  });
  await prisma.team.create({ data: { name: "건축공사팀", locationId: nkHq.id } });
  await prisma.team.create({ data: { name: "토목공사팀", locationId: nkHq.id } });
  await prisma.team.create({ data: { name: "AX팀", locationId: nkHq.id } });

  // ── 극동건설 ──
  const kdHq = await prisma.location.create({
    data: { company: "극동건설", name: "본사", type: "HQ" },
  });
  await prisma.team.create({ data: { name: "건축공사팀", locationId: kdHq.id } });
  await prisma.team.create({ data: { name: "토목공사팀", locationId: kdHq.id } });

  // ── 금광기업 ──
  const kkHq = await prisma.location.create({
    data: { company: "금광기업", name: "본사", type: "HQ" },
  });
  await prisma.team.create({ data: { name: "건축공사팀", locationId: kkHq.id } });
  await prisma.team.create({ data: { name: "토목공사팀", locationId: kkHq.id } });

  console.log("시드 데이터가 성공적으로 생성되었습니다.");
  console.log("관리자: admin@nk.com / admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
