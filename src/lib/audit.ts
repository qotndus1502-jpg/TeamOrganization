// [보안] 감사 로그 유틸리티
import { prisma } from "./prisma";

export async function auditLog(params: {
  action: string;
  userId: number;
  targetType: string;
  targetId: number;
  detail?: string;
}) {
  try {
    // AuditLog 테이블이 아직 생성되지 않은 경우 안전하게 무시
    await (prisma as Record<string, unknown>).auditLog?.create?.({
      data: {
        action: params.action,
        userId: params.userId,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail || null,
      },
    });
  } catch {
    // 테이블 미존재 등 에러 시 무시 (서비스 중단 방지)
  }
}
