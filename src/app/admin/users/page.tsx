import Link from "next/link";
import { getViewer } from "@/lib/rbac";
import { listUsers } from "@/server/queries/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BanToggle, RoleSelect } from "@/components/admin-controls";
import { timeAgo } from "@/lib/utils";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) ?? "";
  const viewer = await getViewer();
  const isAdmin = viewer?.role === "ADMIN";

  const users = await listUsers({ q: q || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Manajemen user</h1>
          <p className="text-sm text-muted-foreground">{users.length} user ditampilkan</p>
        </div>
        <form action="/admin/users" className="flex gap-2">
          <Input name="q" placeholder="Cari nama / email / username" defaultValue={q} className="w-56" />
          <button className="rounded-md border px-3 text-sm hover:bg-accent" type="submit">
            Cari
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${user.username}`} className="text-sm font-medium hover:text-primary">
                      {user.name ?? user.username}
                    </Link>
                    <Badge variant="default" className="text-[10px]">
                      {user.role}
                    </Badge>
                    {user.banned && <Badge variant="destructiveSoft">Banned</Badge>}
                    {!user.emailVerified && <Badge variant="secondary" className="text-[10px]">Email belum</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{user.username} · {user.email} · bergabung {timeAgo(user.createdAt)}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {user._count.posts} post · {user._count.comments} komentar
                </div>

                <RoleSelect
                  userId={user.id}
                  role={user.role}
                  disabled={!isAdmin || user.id === viewer?.id}
                />

                <BanToggle userId={user.id} banned={user.banned} canTarget={user.id !== viewer?.id && (isAdmin || user.role !== "ADMIN")} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
