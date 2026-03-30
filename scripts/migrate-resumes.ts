import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prisma = new PrismaClient();
const BUCKET = "insa-uploads";
const UPLOADS_DIR = path.join(__dirname, "../public/uploads");

async function main() {
  // 로컬 경로를 가진 Employee 찾기
  const employees = await prisma.employee.findMany({
    where: { resumePath: { startsWith: "/uploads/" } },
  });

  console.log(`Found ${employees.length} employees with local resume paths`);

  for (const emp of employees) {
    const localFile = emp.resumePath!.replace("/uploads/", "");
    const filePath = path.join(UPLOADS_DIR, localFile);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const storagePath = `resumes/${randomUUID()}.pdf`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });

    if (error) {
      console.error(`Failed to upload ${localFile}:`, error.message);
      continue;
    }

    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (urlData?.signedUrl) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { resumePath: urlData.signedUrl },
      });
      console.log(`Updated ${emp.name}: ${urlData.signedUrl.substring(0, 80)}...`);
    }
  }

  console.log("\nDone!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
