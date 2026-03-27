const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. AX팀에서 배수연(qotndus1502), 권경우, 김혜린 외 삭제
  const axTeam = await p.team.findFirst({ where: { name: "AX팀" } });
  if (axTeam) {
    const keepEmps = await p.employee.findMany({
      where: {
        teamId: axTeam.id,
        OR: [
          { email: "qotndus1502@namkwang.com" },
          { name: "권경우" },
          { name: "김혜린" },
        ],
      },
      select: { id: true, name: true },
    });
    const keepIds = keepEmps.map(e => e.id);
    console.log("AX팀 유지:", keepEmps.map(e => e.name));

    const deleted = await p.employee.deleteMany({
      where: { teamId: axTeam.id, id: { notIn: keepIds } },
    });
    console.log(`AX팀에서 ${deleted.count}명 삭제`);
  }

  // 2. 건축견적팀 찾기 (없으면 생성)
  let estimateTeam = await p.team.findFirst({ where: { name: "건축견적팀" } });
  if (!estimateTeam) {
    const hqLoc = await p.location.findFirst({ where: { company: "남광토건", type: "HQ" } });
    if (hqLoc) {
      estimateTeam = await p.team.create({
        data: { name: "건축견적팀", locationId: hqLoc.id, category: "건축사업본부" },
      });
      console.log("건축견적팀 생성");
    }
  }

  if (estimateTeam) {
    // 기존 견적팀 직원 삭제
    await p.employee.deleteMany({ where: { teamId: estimateTeam.id } });

    // 팀장 1명 + 팀원 9명 = 10명
    const members = [
      { name: "박정호", email: "park.jh@namkwang.com", position: "부장", role: "팀장", phone: "010-3456-7890", phoneWork: "02-3011-3020" },
      { name: "최민수", email: "choi.ms@namkwang.com", position: "과장", role: "팀원", phone: "010-4567-8901", phoneWork: "02-3011-3021" },
      { name: "이정민", email: "lee.jm@namkwang.com", position: "과장", role: "팀원", phone: "010-5678-9012", phoneWork: "02-3011-3022" },
      { name: "김태윤", email: "kim.ty@namkwang.com", position: "대리", role: "팀원", phone: "010-6789-0123", phoneWork: "02-3011-3023" },
      { name: "장서윤", email: "jang.sy@namkwang.com", position: "대리", role: "팀원", phone: "010-7890-1234", phoneWork: "02-3011-3024" },
      { name: "한도현", email: "han.dh@namkwang.com", position: "대리", role: "팀원", phone: "010-8901-2345", phoneWork: "02-3011-3025" },
      { name: "윤소희", email: "yoon.sh@namkwang.com", position: "주임", role: "팀원", phone: "010-9012-3456", phoneWork: "02-3011-3026" },
      { name: "정우진", email: "jung.wj@namkwang.com", position: "주임", role: "팀원", phone: "010-1234-5670", phoneWork: "02-3011-3027" },
      { name: "오하늘", email: "oh.hn@namkwang.com", position: "사원", role: "팀원", phone: "010-2345-6781", phoneWork: "02-3011-3028" },
      { name: "신예린", email: "shin.yr@namkwang.com", position: "사원", role: "팀원", phone: "010-3456-7892", phoneWork: "02-3011-3029" },
    ];

    for (const m of members) {
      await p.employee.create({
        data: {
          ...m,
          teamId: estimateTeam.id,
          joinDate: "2025-03-01",
          status: "ACTIVE",
        },
      });
    }
    console.log(`건축견적팀에 ${members.length}명 추가 완료`);
  }

  console.log("완료!");
  await p.$disconnect();
}

main();
