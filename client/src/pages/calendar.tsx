import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CalendarEvent {
  id?: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body?: { contentType: string; content: string };
  location?: { displayName: string };
  attendees?: Array<{ emailAddress: { address: string; name?: string }; type: string }>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    subject: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    description: "",
  });

  const weekDates = getWeekDates(currentDate);
  const startOfWeek = weekDates[0].toISOString();
  const endOfWeek = new Date(weekDates[6].getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: connectionStatus, isLoading: isLoadingStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });

  const { data: events, isLoading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", startOfWeek, endOfWeek],
    queryFn: async () => {
      const response = await fetch(
        `/api/calendar/events?startDate=${startOfWeek}&endDate=${endOfWeek}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Falha ao carregar eventos");
      return response.json();
    },
    enabled: connectionStatus?.connected === true,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: CalendarEvent) => {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify(eventData),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao criar evento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setShowNewEvent(false);
      setNewEvent({
        subject: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        location: "",
        description: "",
      });
      toast({ title: "Evento criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar evento", variant: "destructive" });
    },
  });

  const handleCreateEvent = () => {
    if (!newEvent.subject || !newEvent.startDate || !newEvent.startTime) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const startDateTime = `${newEvent.startDate}T${newEvent.startTime}:00`;
    const endDateTime = newEvent.endDate && newEvent.endTime
      ? `${newEvent.endDate}T${newEvent.endTime}:00`
      : `${newEvent.startDate}T${newEvent.startTime.split(":").map((v, i) => i === 0 ? String(Number(v) + 1).padStart(2, "0") : v).join(":")}:00`;

    const eventData: CalendarEvent = {
      subject: newEvent.subject,
      start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      ...(newEvent.location && { location: { displayName: newEvent.location } }),
      ...(newEvent.description && { body: { contentType: "text", content: newEvent.description } }),
    };

    createEventMutation.mutate(eventData);
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    if (!events) return [];
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => {
      const eventDate = new Date(event.start.dateTime).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  if (isLoadingStatus) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionStatus?.connected === false) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
              <h2 className="text-xl font-semibold">Microsoft Calendar não conectado</h2>
              <p className="text-muted-foreground">
                Para usar o calendário integrado, você precisa conectar sua conta Microsoft.
                Acesse as configurações do projeto para conectar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-purple-500" />
            Calendário
          </h1>
          <p className="text-muted-foreground">
            Sincronizado com Microsoft Calendar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-calendar">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-event">
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="subject">Título *</Label>
                  <Input
                    id="subject"
                    value={newEvent.subject}
                    onChange={(e) => setNewEvent({ ...newEvent, subject: e.target.value })}
                    placeholder="Reunião com cliente"
                    data-testid="input-event-subject"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Data Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      data-testid="input-event-start-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Hora Início *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      data-testid="input-event-start-time"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endDate">Data Fim</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      data-testid="input-event-end-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Hora Fim</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      data-testid="input-event-end-time"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Local</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Escritório, Teams, Zoom..."
                    data-testid="input-event-location"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Detalhes do evento..."
                    rows={3}
                    data-testid="input-event-description"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewEvent(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateEvent}
                    disabled={createEventMutation.isPending}
                    data-testid="button-save-event"
                  >
                    {createEventMutation.isPending ? "Salvando..." : "Criar Evento"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek} data-testid="button-prev-week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek} data-testid="button-next-week">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-lg">
              {weekDates[0].toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[140px] border rounded-lg p-2 ${
                      isToday ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : ""
                    }`}
                  >
                    <div className="text-center mb-2">
                      <div className="text-xs text-muted-foreground uppercase">
                        {date.toLocaleDateString("pt-BR", { weekday: "short" })}
                      </div>
                      <div className={`text-lg font-semibold ${isToday ? "text-purple-600" : ""}`}>
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1.5 rounded bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 cursor-pointer transition-colors"
                          title={event.subject}
                        >
                          <div className="font-medium truncate">{event.subject}</div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(event.start.dateTime)}
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <Badge variant="outline" className="text-xs w-full justify-center">
                          +{dayEvents.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {events && events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="text-center min-w-[60px]">
                    <div className="text-xs text-muted-foreground uppercase">
                      {new Date(event.start.dateTime).toLocaleDateString("pt-BR", { weekday: "short" })}
                    </div>
                    <div className="text-2xl font-bold">
                      {new Date(event.start.dateTime).getDate()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.start.dateTime).toLocaleDateString("pt-BR", { month: "short" })}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{event.subject}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                      </span>
                      {event.location?.displayName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location.displayName}
                        </span>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event.attendees.length} participante{event.attendees.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
