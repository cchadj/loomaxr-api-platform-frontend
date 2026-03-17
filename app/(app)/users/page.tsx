"use client";

import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useWorkflows } from "@/hooks/use-workflows";
import { useAssets } from "@/hooks/use-assets";
import { AssetCard } from "@/components/assets/asset-card";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Images } from "lucide-react";
import Link from "next/link";
import type { User, Asset } from "@/types/api";

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700 border-red-200",
  MODERATOR: "bg-orange-50 text-orange-700 border-orange-200",
  WORKFLOW_CREATOR: "bg-blue-50 text-blue-700 border-blue-200",
  JOB_CREATOR: "bg-green-50 text-green-700 border-green-200",
  VIEWER: "bg-gray-50 text-gray-600 border-gray-200",
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <Badge className={`text-xs px-1.5 py-0 border ${cls}`} variant="outline">
      {role.toLowerCase().replace("_", " ")}
    </Badge>
  );
}

function UserWorkflowsTab({ userId }: { userId: string }) {
  const { data: workflows, isLoading } = useWorkflows();
  const userWorkflows = (workflows ?? []).filter((w) => w.author_id === userId);

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (!userWorkflows.length) return <p className="text-sm text-muted-foreground">No workflows yet.</p>;

  return (
    <div className="space-y-2">
      {userWorkflows.map((w) => (
        <Link
          key={w.id}
          href={`/workflows/${w.id}`}
          className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
        >
          <div>
            <p className="text-sm font-medium">{w.name}</p>
            <code className="text-xs text-muted-foreground">{w.key}</code>
          </div>
          <RelativeTime value={w.created_at} />
        </Link>
      ))}
    </div>
  );
}

function UserAssetsTab({ userId }: { userId: string }) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { data: assets, isLoading } = useAssets({ mine: false, user_id: userId });

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}</div>;
  if (!assets?.length) return <EmptyState icon={Images} title="No assets" description="This user has no visible assets." />;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)} />
        ))}
      </div>
      {selectedAsset && (
        <AssetDetailSheet
          asset={selectedAsset}
          open={Boolean(selectedAsset)}
          onOpenChange={(o) => !o && setSelectedAsset(null)}
        />
      )}
    </>
  );
}

function UserDetailSheet({ user, open, onOpenChange }: { user: User; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{user.username}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex flex-wrap gap-1">
          {user.roles.map((r) => <RoleBadge key={r} role={r} />)}
        </div>
        <div className="mt-4">
          <Tabs defaultValue="workflows">
            <TabsList>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
            </TabsList>
            <TabsContent value="workflows" className="mt-3">
              <UserWorkflowsTab userId={user.id} />
            </TabsContent>
            <TabsContent value="assets" className="mt-3">
              <UserAssetsTab userId={user.id} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  if (isLoading) return (
    <div className="p-6 space-y-2">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
    </div>
  );

  if (!users?.length) return (
    <div className="p-6">
      <EmptyState icon={Users} title="No users" description="No users found." />
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Users</h1>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Roles</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => setSelectedUser(u)}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.username}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => <RoleBadge key={r} role={r} />)}
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDetailSheet
          user={selectedUser}
          open={Boolean(selectedUser)}
          onOpenChange={(o) => !o && setSelectedUser(null)}
        />
      )}
    </div>
  );
}
