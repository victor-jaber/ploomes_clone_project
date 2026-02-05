import { Client } from "@microsoft/microsoft-graph-client";
import logger from "./logger";

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Token de autenticação Replit não encontrado');
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=outlook`,
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook não conectado');
  }
  
  return accessToken;
}

export async function getOutlookClient(): Promise<Client> {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface CalendarEvent {
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
}

export async function getCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  try {
    const client = await getOutlookClient();
    
    let response;
    
    if (startDate && endDate) {
      response = await client.api('/me/calendarView')
        .query({
          startDateTime: startDate,
          endDateTime: endDate,
        })
        .header('Prefer', 'outlook.timezone="America/Sao_Paulo"')
        .select('id,subject,start,end,location,attendees,body,isOnlineMeeting,onlineMeeting,onlineMeetingUrl')
        .orderby('start/dateTime')
        .top(50)
        .get();
    } else {
      response = await client.api('/me/calendar/events')
        .header('Prefer', 'outlook.timezone="America/Sao_Paulo"')
        .select('id,subject,start,end,location,attendees,body,isOnlineMeeting,onlineMeeting,onlineMeetingUrl')
        .orderby('start/dateTime')
        .top(50)
        .get();
    }
    
    logger.info(`Eventos do calendário obtidos: ${response.value?.length || 0}`, { prefix: "Outlook" });
    
    return response.value || [];
  } catch (error: any) {
    logger.error("Erro ao buscar eventos do calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  try {
    const client = await getOutlookClient();
    
    const newEvent = await client.api('/me/calendar/events').post(event);
    logger.success(`Evento criado: ${event.subject}`, { prefix: "Outlook" });
    
    return newEvent;
  } catch (error: any) {
    logger.error("Erro ao criar evento no calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function updateCalendarEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  try {
    const client = await getOutlookClient();
    
    const updatedEvent = await client.api(`/me/calendar/events/${eventId}`).patch(event);
    logger.success(`Evento atualizado: ${eventId}`, { prefix: "Outlook" });
    
    return updatedEvent;
  } catch (error: any) {
    logger.error("Erro ao atualizar evento no calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    const client = await getOutlookClient();
    
    await client.api(`/me/calendar/events/${eventId}`).delete();
    logger.success(`Evento excluído: ${eventId}`, { prefix: "Outlook" });
  } catch (error: any) {
    logger.error("Erro ao excluir evento do calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function checkOutlookConnection(): Promise<boolean> {
  try {
    const client = await getOutlookClient();
    await client.api('/me').get();
    return true;
  } catch {
    return false;
  }
}
