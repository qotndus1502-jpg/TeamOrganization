import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prisma = new PrismaClient();
const BUCKET = "insa-uploads";
const PHOTOS_DIR = path.join(__dirname, "../public/uploads/photos");

async function main() {
  // 1. 로컬 사진 파일들을 Supabase Storage에 업로드
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => f !== ".gitkeep");
  console.log(`Found ${files.length} photo files to upload`);

  for (const file of files) {
    const filePath = path.join(PHOTOS_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    const storagePath = `photos/${file}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`Failed to upload ${file}:`, error.message);
    } else {
      console.log(`Uploaded: ${file}`);
    }
  }

  // 2. DB에서 로컬 경로(/uploads/photos/...)를 가진 Employee를 찾아 signed URL로 업데이트
  const employees = await prisma.employee.findMany({
    where: { photoUrl: { startsWith: "/uploads/photos/" } },
  });

  console.log(`\nFound ${employees.length} employees with local photo URLs`);

  for (const emp of employees) {
    const filename = emp.photoUrl!.replace("/uploads/photos/", "");
    const storagePath = `photos/${filename}`;

    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1년

    if (urlData?.signedUrl) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { photoUrl: urlData.signedUrl },
      });
      console.log(`Updated ${emp.name}: ${urlData.signedUrl.substring(0, 80)}...`);
    } else {
      console.error(`Failed to get signed URL for ${emp.name} (${storagePath})`);
    }
  }

  console.log("\nDone!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
