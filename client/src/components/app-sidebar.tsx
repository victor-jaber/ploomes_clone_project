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
import { HermesLogo } from "@/components/hermes-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthUser } from "@/lib/auth";

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
    <Sidebar className="gradient-sidebar border-r-0">
      <SidebarHeader className="p-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-xl" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <HermesLogo size={32} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-sidebar animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-2xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Hermes
            </span>
            <span className="text-xs text-purple-300/70 font-medium tracking-wider uppercase">
              CRM Premium
            </span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        relative h-11 rounded-xl transition-all duration-300 group
                        ${isActive 
                          ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                      data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                    >
                      <Link href={item.url}>
                        <div className={`
                          p-2 rounded-lg transition-all duration-300
                          ${isActive 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30' 
                            : 'bg-white/5 group-hover:bg-white/10'
                          }
                        `}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{item.title}</span>
                        {isActive && (
                          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 mt-auto">
        <div className="rounded-2xl bg-gradient-to-r from-purple-900/50 to-pink-900/30 p-4 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-purple-500/50 ring-offset-2 ring-offset-sidebar">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-white truncate">{user.name}</span>
              <span className="text-xs text-purple-300/70 truncate">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all duration-300"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
