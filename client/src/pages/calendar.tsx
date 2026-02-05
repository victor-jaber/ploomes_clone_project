import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Video,
  Users,
  Trash2,
  Edit,
  X,
  MoreVertical,
  Unplug,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id?: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body?: { contentType: string; content: string };
  location?: { displayName: string };
  attendees?: Array<{ emailAddress: { address: string; name?: string }; type: string }>;
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl: string };
  onlineMeetingUrl?: string;
  onlineMeetingProvider?: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const dates: Date[] = [];
  const startPadding = firstDay.getDay();
  
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - i - 1);
    dates.push(d);
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(new Date(year, month, i));
  }
  
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    dates.push(new Date(year, month + 1, i));
  }
  
  return dates;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function getEventColor(index: number): string {
  const colors = [
    "bg-violet-500/90 hover:bg-violet-500 border-violet-600",
    "bg-blue-500/90 hover:bg-blue-500 border-blue-600",
    "bg-emerald-500/90 hover:bg-emerald-500 border-emerald-600",
    "bg-amber-500/90 hover:bg-amber-500 border-amber-600",
    "bg-rose-500/90 hover:bg-rose-500 border-rose-600",
    "bg-cyan-500/90 hover:bg-cyan-500 border-cyan-600",
    "bg-fuchsia-500/90 hover:bg-fuchsia-500 border-fuchsia-600",
  ];
  return colors[index % colors.length];
}

type ViewMode = "week" | "month" | "day";

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({
    subject: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    description: "",
    isOnlineMeeting: false,
  });
  const [editForm, setEditForm] = useState({
    subject: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    description: "",
  });

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthDates = useMemo(() => getMonthDates(currentDate), [currentDate]);
  
  const startOfRange = viewMode === "month" 
    ? monthDates[0].toISOString()
    : weekDates[0].toISOString();
  const endOfRange = viewMode === "month"
    ? new Date(monthDates[monthDates.length - 1].getTime() + 24 * 60 * 60 * 1000).toISOString()
    : new Date(weekDates[6].getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: oauthConfig } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/calendar/config"],
  });

  const { data: connectionStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });

  const authorizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/calendar/authorize");
      return response.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar autenticação com Microsoft",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/calendar/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Calendário desconectado" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao desconectar calendário",
        variant: "destructive",
      });
    },
  });

  const handleConnectCalendar = () => {
    if (!oauthConfig?.configured) {
      toast({
        title: "OAuth não configurado",
        description: "Configure MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET e MICROSOFT_REDIRECT_URI nas variáveis de ambiente.",
        variant: "destructive",
      });
      return;
    }
    authorizeMutation.mutate();
  };

  const handleDisconnectCalendar = () => {
    disconnectMutation.mutate();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      toast({ title: "Calendário conectado com sucesso!" });
      refetchStatus();
      window.history.replaceState({}, "", "/calendario");
    } else if (params.get("error")) {
      const errorMessages: Record<string, string> = {
        auth_denied: "Autorização negada pelo usuário",
        auth_failed: "Falha na autenticação",
        missing_params: "Parâmetros ausentes",
        invalid_state: "Estado inválido",
      };
      toast({
        title: "Erro na conexão",
        description: errorMessages[params.get("error")!] || "Erro desconhecido",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/calendario");
    }
  }, []);

  const { data: events = [], isLoading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", startOfRange, endOfRange],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/calendar/events?startDate=${startOfRange}&endDate=${endOfRange}`
      );
      return response.json();
    },
    enabled: connectionStatus?.connected === true,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: CalendarEvent) => {
      const response = await apiRequest("POST", "/api/calendar/events", eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setShowNewEvent(false);
      resetNewEvent();
      toast({ title: "Evento criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar evento", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setSelectedEvent(null);
      toast({ title: "Evento excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir evento", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: string; eventData: Partial<CalendarEvent> }) => {
      const response = await apiRequest("PATCH", `/api/calendar/events/${eventId}`, eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setEditingEvent(null);
      setSelectedEvent(null);
      toast({ title: "Evento atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar evento", variant: "destructive" });
    },
  });

  const openEditMode = (event: CalendarEvent) => {
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);
    
    setEditForm({
      subject: event.subject,
      startDate: startDate.toISOString().split("T")[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate.toISOString().split("T")[0],
      endTime: endDate.toTimeString().slice(0, 5),
      location: event.location?.displayName || "",
      description: event.body?.content?.replace(/<[^>]*>/g, "") || "",
    });
    setEditingEvent(event);
    setSelectedEvent(null);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent?.id || !editForm.subject || !editForm.startDate || !editForm.startTime) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const startDateTime = `${editForm.startDate}T${editForm.startTime}:00`;
    const endDate = editForm.endDate || editForm.startDate;
    const endTime = editForm.endTime || 
      `${String(Number(editForm.startTime.split(":")[0]) + 1).padStart(2, "0")}:${editForm.startTime.split(":")[1]}`;
    const endDateTime = `${endDate}T${endTime}:00`;

    const eventData: Partial<CalendarEvent> = {
      subject: editForm.subject,
      start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      location: editForm.location ? { displayName: editForm.location } : undefined,
      body: editForm.description ? { contentType: "text", content: editForm.description } : undefined,
    };

    updateEventMutation.mutate({ eventId: editingEvent.id, eventData });
  };

  const resetNewEvent = () => {
    setNewEvent({
      subject: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      location: "",
      description: "",
      isOnlineMeeting: false,
    });
  };

  const handleCreateEvent = () => {
    if (!newEvent.subject || !newEvent.startDate || !newEvent.startTime) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const startDateTime = `${newEvent.startDate}T${newEvent.startTime}:00`;
    const endDate = newEvent.endDate || newEvent.startDate;
    const endTime = newEvent.endTime || 
      `${String(Number(newEvent.startTime.split(":")[0]) + 1).padStart(2, "0")}:${newEvent.startTime.split(":")[1]}`;
    const endDateTime = `${endDate}T${endTime}:00`;

    const eventData: CalendarEvent = {
      subject: newEvent.subject,
      start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      ...(newEvent.location && { location: { displayName: newEvent.location } }),
      ...(newEvent.description && { body: { contentType: "text", content: newEvent.description } }),
      ...(newEvent.isOnlineMeeting && { 
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      }),
    };

    createEventMutation.mutate(eventData);
  };

  const openNewEventWithDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    setNewEvent(prev => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr,
    }));
    setShowNewEvent(true);
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return isSameDay(eventDate, date);
    });
  };

  const getEventsForHour = (date: Date, hour: number): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return isSameDay(eventDate, date) && eventDate.getHours() === hour;
    });
  };

  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    } else if (viewMode === "week") {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} de ${start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
      }
      return `${start.getDate()} de ${start.toLocaleDateString("pt-BR", { month: "short" })} - ${end.getDate()} de ${end.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`;
    }
    return formatFullDate(currentDate);
  };

  if (isLoadingStatus) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-violet-500/5">
        <div className="p-4 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (connectionStatus?.connected === false) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-violet-500/5 via-background to-fuchsia-500/5 p-4">
        <div className="max-w-2xl w-full space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/20">
                  <CalendarIcon className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Video className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Conecte seu Calendário
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sincronize seus compromissos do Microsoft Calendar diretamente no Hermes CRM
              </p>
            </div>
          </div>

          <Card className="bg-background/80 backdrop-blur-sm border-violet-500/20 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center space-y-2 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto">
                    <CalendarIcon className="h-5 w-5 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-sm">Eventos Sincronizados</h3>
                  <p className="text-xs text-muted-foreground">
                    Veja todos os seus compromissos do Outlook em um só lugar
                  </p>
                </div>
                <div className="text-center space-y-2 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center mx-auto">
                    <Video className="h-5 w-5 text-fuchsia-500" />
                  </div>
                  <h3 className="font-semibold text-sm">Reuniões do Teams</h3>
                  <p className="text-xs text-muted-foreground">
                    Acesse suas reuniões online com um clique direto do CRM
                  </p>
                </div>
                <div className="text-center space-y-2 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center mx-auto">
                    <Users className="h-5 w-5 text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-sm">Agende Reuniões</h3>
                  <p className="text-xs text-muted-foreground">
                    Crie eventos que sincronizam automaticamente com seu calendário
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 23 23" className="h-7 w-7">
                      <path fill="#f25022" d="M0 0h11v11H0z" />
                      <path fill="#00a4ef" d="M0 12h11v11H0z" />
                      <path fill="#7fba00" d="M12 0h11v11H12z" />
                      <path fill="#ffb900" d="M12 12h11v11H12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Microsoft 365</h3>
                    <p className="text-xs text-muted-foreground">Outlook, Hotmail, Office 365</p>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-right">
                  <p className="text-xs text-muted-foreground mb-2">
                    Clique no botão abaixo para conectar sua conta Microsoft
                  </p>
                  <Button 
                    size="sm"
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/20"
                    onClick={handleConnectCalendar}
                    data-testid="button-connect-microsoft"
                  >
                    <svg viewBox="0 0 23 23" className="h-4 w-4 mr-2">
                      <path fill="currentColor" d="M0 0h11v11H0zM0 12h11v11H0zM12 0h11v11H12zM12 12h11v11H12z" />
                    </svg>
                    Conectar Conta Microsoft
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Seus dados são protegidos e usados apenas para sincronização de calendário
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-violet-500/5">
      <div className="p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold capitalize">{getHeaderTitle()}</h1>
              <p className="text-sm text-muted-foreground">
                {events.length} evento{events.length !== 1 ? "s" : ""} neste período
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center border rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === "day" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                data-testid="button-view-day"
              >
                Dia
              </Button>
              <Button
                variant={viewMode === "week" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                data-testid="button-view-week"
              >
                Semana
              </Button>
              <Button
                variant={viewMode === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                data-testid="button-view-month"
              >
                Mês
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} data-testid="button-prev">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} data-testid="button-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-calendar-menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDisconnectCalendar}
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect-calendar"
                >
                  <Unplug className="h-4 w-4 mr-2" />
                  {disconnectMutation.isPending ? "Desconectando..." : "Desconectar Calendário"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600" data-testid="button-new-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
                  <DialogDescription>Adicione um evento ao seu calendário Microsoft</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="event-subject">Título *</Label>
                    <Input
                      id="event-subject"
                      placeholder="Nome do evento"
                      value={newEvent.subject}
                      onChange={(e) => setNewEvent({ ...newEvent, subject: e.target.value })}
                      data-testid="input-event-subject"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="event-start-date">Data início *</Label>
                      <Input
                        id="event-start-date"
                        type="date"
                        value={newEvent.startDate}
                        onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                        data-testid="input-event-start-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-start-time">Hora início *</Label>
                      <Input
                        id="event-start-time"
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        data-testid="input-event-start-time"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="event-end-date">Data fim</Label>
                      <Input
                        id="event-end-date"
                        type="date"
                        value={newEvent.endDate}
                        onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                        data-testid="input-event-end-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-end-time">Hora fim</Label>
                      <Input
                        id="event-end-time"
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        data-testid="input-event-end-time"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="event-location">Local</Label>
                    <Input
                      id="event-location"
                      placeholder="Endereço ou sala"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      data-testid="input-event-location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-description">Descrição</Label>
                    <Textarea
                      id="event-description"
                      placeholder="Detalhes do evento..."
                      rows={3}
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      data-testid="input-event-description"
                    />
                  </div>
                  <div 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                      newEvent.isOnlineMeeting 
                        ? "bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-500/30" 
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                    onClick={() => setNewEvent({ ...newEvent, isOnlineMeeting: !newEvent.isOnlineMeeting })}
                    data-testid="toggle-online-meeting"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                        newEvent.isOnlineMeeting ? "bg-violet-500 text-white" : "bg-muted"
                      )}>
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Reunião do Teams</p>
                        <p className="text-sm text-muted-foreground">
                          {newEvent.isOnlineMeeting ? "Link será gerado automaticamente" : "Adicionar link de videoconferência"}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "h-6 w-11 rounded-full transition-colors relative",
                      newEvent.isOnlineMeeting ? "bg-violet-500" : "bg-muted-foreground/30"
                    )}>
                      <div className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                        newEvent.isOnlineMeeting ? "left-6" : "left-1"
                      )} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowNewEvent(false)} data-testid="button-cancel-event">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      disabled={createEventMutation.isPending}
                      className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                      data-testid="button-save-event"
                    >
                      {createEventMutation.isPending ? "Criando..." : "Criar Evento"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {viewMode === "month" && (
          <MonthView
            monthDates={monthDates}
            currentDate={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
            onDateClick={openNewEventWithDate}
            isLoading={isLoading}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            weekDates={weekDates}
            events={events}
            onEventClick={setSelectedEvent}
            onDateClick={openNewEventWithDate}
            isLoading={isLoading}
          />
        )}
        {viewMode === "day" && (
          <DayView
            date={currentDate}
            events={getEventsForDate(currentDate)}
            onEventClick={setSelectedEvent}
            onAddClick={() => openNewEventWithDate(currentDate)}
            isLoading={isLoading}
          />
        )}
      </div>

      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="sm:max-w-md p-0 flex flex-col [&>button]:hidden">
          {selectedEvent && (
            <>
              <div className="relative h-32 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute bottom-4 left-4 right-12">
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-2">
                    {selectedEvent.isOnlineMeeting ? "Reunião Online" : "Evento"}
                  </Badge>
                  <h2 className="text-xl font-bold text-white line-clamp-2">
                    {selectedEvent.subject}
                  </h2>
                </div>
                <button
                  type="button"
                  className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-white bg-white/20 hover:bg-white/30 transition-colors"
                  onClick={() => setSelectedEvent(null)}
                  data-testid="button-close-event"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ScrollArea className="flex-1 w-full">
                <div className="p-6 space-y-6 overflow-hidden">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                    <CalendarIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">
                      {new Date(selectedEvent.start.dateTime).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(selectedEvent.start.dateTime)} - {formatTime(selectedEvent.end.dateTime)}</span>
                    </div>
                  </div>
                </div>

                {selectedEvent.isOnlineMeeting && (selectedEvent.onlineMeeting?.joinUrl || selectedEvent.onlineMeetingUrl) && (
                  <a
                    href={selectedEvent.onlineMeeting?.joinUrl || selectedEvent.onlineMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-colors group"
                    data-testid="link-join-meeting"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                      <Video className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-violet-600 dark:text-violet-400">Entrar na Reunião</p>
                      <p className="text-sm text-muted-foreground">Microsoft Teams</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-violet-500" />
                  </a>
                )}

                {selectedEvent.location?.displayName && (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Local</p>
                      <p className="font-medium">{selectedEvent.location.displayName}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Participantes ({selectedEvent.attendees.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedEvent.attendees.map((attendee, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                            {(attendee.emailAddress.name || attendee.emailAddress.address).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {attendee.emailAddress.name || attendee.emailAddress.address}
                            </p>
                            {attendee.emailAddress.name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {attendee.emailAddress.address}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.body?.content && selectedEvent.body.content.replace(/<[^>]*>/g, "").trim() && (
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                      <div className="p-4 rounded-xl bg-muted/30 border overflow-hidden max-w-full">
                        <p className="text-sm whitespace-pre-wrap break-all overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {selectedEvent.body.content.replace(/<[^>]*>/g, "").trim()}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openEditMode(selectedEvent)}
                        data-testid="button-edit-event"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => selectedEvent.id && deleteEventMutation.mutate(selectedEvent.id)}
                        disabled={deleteEventMutation.isPending}
                        data-testid="button-delete-event"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteEventMutation.isPending ? "Excluindo..." : "Excluir"}
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Altere as informações do evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-subject">Título *</Label>
              <Input
                id="edit-subject"
                placeholder="Nome do evento"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                data-testid="input-edit-subject"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date">Data início *</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  data-testid="input-edit-start-date"
                />
              </div>
              <div>
                <Label htmlFor="edit-start-time">Hora início *</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                  data-testid="input-edit-start-time"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-end-date">Data fim</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  data-testid="input-edit-end-date"
                />
              </div>
              <div>
                <Label htmlFor="edit-end-time">Hora fim</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  data-testid="input-edit-end-time"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-location">Local</Label>
              <Input
                id="edit-location"
                placeholder="Endereço ou sala"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                data-testid="input-edit-location"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Detalhes do evento..."
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                data-testid="input-edit-description"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingEvent(null)} data-testid="button-cancel-edit">
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateEvent}
                disabled={updateEventMutation.isPending}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                data-testid="button-save-edit"
              >
                {updateEventMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthView({
  monthDates,
  currentDate,
  events,
  onEventClick,
  onDateClick,
  isLoading,
}: {
  monthDates: Date[];
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  isLoading: boolean;
}) {
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return isSameDay(eventDate, date);
    });
  };

  return (
    <Card className="h-full overflow-hidden bg-background/80 backdrop-blur-sm border-violet-500/10">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "1fr" }}>
        {monthDates.map((date, i) => {
          const dateEvents = getEventsForDate(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const today = isToday(date);

          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] p-2 border-r border-b last:border-r-0 cursor-pointer transition-colors hover:bg-muted/50",
                !isCurrentMonth && "bg-muted/20",
                today && "bg-violet-500/5"
              )}
              onClick={() => onDateClick(date)}
              data-testid={`calendar-day-${date.toISOString().split("T")[0]}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    today && "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {date.getDate()}
                </span>
                {dateEvents.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {dateEvents.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {dateEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={event.id || eventIndex}
                    className={cn(
                      "text-xs px-2 py-1 rounded text-white truncate cursor-pointer border-l-2",
                      getEventColor(eventIndex)
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    data-testid={`event-${event.id}`}
                  >
                    {formatTime(event.start.dateTime)} {event.subject}
                  </div>
                ))}
                {dateEvents.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-2">
                    +{dateEvents.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({
  weekDates,
  events,
  onEventClick,
  onDateClick,
  isLoading,
}: {
  weekDates: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  isLoading: boolean;
}) {
  const getEventsForDateAndHour = (date: Date, hour: number): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return isSameDay(eventDate, date) && eventDate.getHours() === hour;
    });
  };

  return (
    <Card className="h-full overflow-hidden bg-background/80 backdrop-blur-sm border-violet-500/10 flex flex-col">
      <div className="grid grid-cols-8 border-b bg-muted/30 sticky top-0 z-10">
        <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r w-16" />
        {weekDates.map((date, i) => {
          const today = isToday(date);
          return (
            <div
              key={i}
              className={cn(
                "p-3 text-center border-r last:border-r-0",
                today && "bg-violet-500/5"
              )}
            >
              <p className="text-xs text-muted-foreground uppercase">{WEEKDAYS[i]}</p>
              <p
                className={cn(
                  "text-lg font-semibold mt-1 w-9 h-9 flex items-center justify-center rounded-full mx-auto",
                  today && "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                )}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-8">
          <div className="border-r w-16">
            {HOURS.map((hour) => (
              <div key={hour} className="h-16 border-b px-2 py-1 text-right">
                <span className="text-xs text-muted-foreground">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
          {weekDates.map((date, dayIndex) => {
            const today = isToday(date);
            return (
              <div key={dayIndex} className={cn("border-r last:border-r-0", today && "bg-violet-500/5")}>
                {HOURS.map((hour) => {
                  const hourEvents = getEventsForDateAndHour(date, hour);
                  return (
                    <div
                      key={hour}
                      className="h-16 border-b relative hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        const dateWithTime = new Date(date);
                        dateWithTime.setHours(hour);
                        onDateClick(dateWithTime);
                      }}
                    >
                      {hourEvents.map((event, eventIndex) => (
                        <div
                          key={event.id || eventIndex}
                          className={cn(
                            "absolute inset-x-1 top-1 bottom-1 px-2 py-1 rounded text-white text-xs overflow-hidden cursor-pointer border-l-2",
                            getEventColor(eventIndex)
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <p className="font-medium truncate">{event.subject}</p>
                          <p className="text-white/80 text-[10px]">{formatTime(event.start.dateTime)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}

function DayView({
  date,
  events,
  onEventClick,
  onAddClick,
  isLoading,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddClick: () => void;
  isLoading: boolean;
}) {
  const getEventsForHour = (hour: number): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return eventDate.getHours() === hour;
    });
  };

  return (
    <Card className="h-full overflow-hidden bg-background/80 backdrop-blur-sm border-violet-500/10 flex flex-col">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{WEEKDAYS_FULL[date.getDay()]}</p>
          <p className="text-sm text-muted-foreground">
            {date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button onClick={onAddClick} size="sm" variant="outline" data-testid="button-add-day-event">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {HOURS.map((hour) => {
            const hourEvents = getEventsForHour(hour);
            return (
              <div key={hour} className="flex min-h-[80px]">
                <div className="w-20 p-3 text-right border-r bg-muted/20">
                  <span className="text-sm font-medium text-muted-foreground">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  {hourEvents.map((event, i) => (
                    <div
                      key={event.id || i}
                      className={cn(
                        "p-3 rounded-lg text-white cursor-pointer transition-all hover:scale-[1.02] border-l-4",
                        getEventColor(i)
                      )}
                      onClick={() => onEventClick(event)}
                      data-testid={`day-event-${event.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{event.subject}</p>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">
                          {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                        </Badge>
                      </div>
                      {event.location?.displayName && (
                        <p className="text-sm text-white/80 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location.displayName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
