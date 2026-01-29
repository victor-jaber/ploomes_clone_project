import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Target,
  Kanban,
  CalendarCheck,
  Package,
  FileText,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthUser } from "@/lib/auth";
import { HermesLogo } from "@/components/hermes-logo";

interface AppSidebarProps {
  user: AuthUser;
  onLogout: () => void;
}

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Oportunidades", url: "/oportunidades", icon: Target },
  { title: "Atividades", url: "/atividades", icon: CalendarCheck },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Propostas", url: "/propostas", icon: FileText },
];

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const [location] = useLocation();

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HermesLogo size={28} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-sidebar-foreground">Hermes</span>
            <span className="text-xs text-muted-foreground">CRM</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
