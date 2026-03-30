import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const prisma = new PrismaClient();
const BUCKET = "insa-uploads";

async function main() {
  // 1. Storage의 모든 사진 파일
  const { data: files, error } = await supabase.storage.from(BUCKET).list("photos");
  if (error || !files) {
    console.error("Failed to list files:", error);
    return;
  }
  console.log("=== Storage photos ===");
  files.forEach(f => console.log(f.name));
  console.log(`Total: ${files.length}\n`);

  // 2. DB에서 사용 중인 photoUrl에서 파일명 추출
  const employees = await prisma.employee.findMany({
    where: { photoUrl: { not: null } },
    select: { name: true, photoUrl: true },
  });

  const usedFileNames = new Set<string>();
  employees.forEach(e => {
    const url = e.photoUrl!;
    // URL에서 파일명 추출: photos/xxxxx.jpg
    const match = url.match(/photos\/([^?]+)/);
    if (match) {
      usedFileNames.add(match[1]);
      console.log(`Used by ${e.name}: ${match[1]}`);
    }
  });

  // 3. 사용되지 않는 파일 찾기
  const unusedFiles = files.filter(f => !usedFileNames.has(f.name) && f.name !== ".emptyFolderPlaceholder");
  console.log(`\n=== Unused photos: ${unusedFiles.length} ===`);
  unusedFiles.forEach(f => console.log(f.name));

  if (unusedFiles.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  // 4. 삭제
  const pathsToDelete = unusedFiles.map(f => `photos/${f.name}`);
  const { error: delError } = await supabase.storage.from(BUCKET).remove(pathsToDelete);
  if (delError) {
    console.error("Delete error:", delError);
  } else {
    console.log(`\nDeleted ${pathsToDelete.length} unused photos.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
