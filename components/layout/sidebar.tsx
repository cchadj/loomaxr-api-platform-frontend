"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  BriefcaseBusiness,
  Images,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: [] },
  { href: "/workflows", label: "Workflows", icon: Workflow, roles: [] },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, roles: [] },
  { href: "/assets", label: "Assets", icon: Images, roles: [] },
  { href: "/users", label: "Users", icon: Users, roles: [] },
];

const adminItems = [
  { href: "/admin/models", label: "Model Requirements", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  const showAdmin = hasRole("MODERATOR") || hasRole("ADMIN");

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">ComfyUI Platform</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {showAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === href
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors border-0 bg-transparent cursor-pointer">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs">
                {user?.username?.slice(0, 2).toUpperCase() ?? "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user?.username ?? "Unknown"}</p>
              <p className="truncate text-xs text-muted-foreground leading-tight">
                {user?.roles?.[0] ?? "no role"}
                {(user?.roles?.length ?? 0) > 1 && ` +${(user?.roles?.length ?? 1) - 1}`}
              </p>
            </div>
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user?.username}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {user?.roles?.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs px-1.5 py-0">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-3 top-3 z-40 md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-56 border-r bg-background transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r bg-background flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
