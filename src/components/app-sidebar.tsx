import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Activity,
  Settings,
  Inbox,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Applications", url: "/applications", icon: Briefcase },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Timeline", url: "/timeline", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Inbox className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Inboxly</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.url
                  : pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/70">
          <p className="font-medium text-sidebar-foreground">Inboxly</p>
          <p className="mt-0.5 truncate">Personal tracker · AI-powered</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
