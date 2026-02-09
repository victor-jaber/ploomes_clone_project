import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getToken, getUser, setAuth, clearAuth, AuthUser } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { HerminioChat } from "@/components/herminio-chat";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import PipelinePage from "@/pages/pipeline";
import ClientsPage from "@/pages/clients";
import OpportunitiesPage from "@/pages/opportunities";
import ActivitiesPage from "@/pages/activities";
import ProductsPage from "@/pages/products";
import ProposalsPage from "@/pages/proposals";
import UsersPage from "@/pages/users";
import CalendarPage from "@/pages/calendar";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/pipeline" component={PipelinePage} />
      <Route path="/clientes" component={ClientsPage} />
      <Route path="/oportunidades" component={OpportunitiesPage} />
      <Route path="/atividades" component={ActivitiesPage} />
      <Route path="/produtos" component={ProductsPage} />
      <Route path="/propostas" component={ProposalsPage} />
      <Route path="/usuarios" component={UsersPage} />
      <Route path="/calendario" component={CalendarPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

interface AuthenticatedLayoutProps {
  user: AuthUser;
  onLogout: () => void;
}

function AuthenticatedLayout({ user, onLogout }: AuthenticatedLayoutProps) {
  useWebSocket();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user} onLogout={onLogout} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    
    if (token && storedUser) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Invalid token");
        })
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          clearAuth();
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (userData: AuthUser, token: string) => {
    setAuth(userData, token);
    setUser(userData);
    queryClient.clear();
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    queryClient.clear();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md px-4">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              H
            </div>
            <span className="font-semibold text-xl">Hermes</span>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <AuthenticatedLayout user={user} onLogout={handleLogout} />
      <HerminioChat />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="hermes-theme">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
