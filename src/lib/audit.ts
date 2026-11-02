import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Record an audit trail entry for privileged actions. Never throws. */
export async function audit(params: {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed", error);
  }
}
