import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/rbac";
import { getUnreadCount } from "@/server/queries/notifications";

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  const limit = await rateLimit(`notif:user:${viewer.id}`, { limit: 120, window: 60 });
  if (!limit.success) {
    return NextResponse.json({ count: 0 });
  }

  const count = await getUnreadCount(viewer.id);
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } }
  );
}
