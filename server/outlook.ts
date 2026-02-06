import { Client } from "@microsoft/microsoft-graph-client";
import logger from "./logger";
import { db } from "./db";
import { tokensOAuthUsuario } from "@shared/schema";
import { eq } from "drizzle-orm";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI;

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const SCOPES = [
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
  "OnlineMeetings.ReadWrite"
].join(" ");

export function getOAuthConfig() {
  return {
    clientId: MICROSOFT_CLIENT_ID,
    redirectUri: MICROSOFT_REDIRECT_URI,
    configured: !!(MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET && MICROSOFT_REDIRECT_URI)
  };
}

export function getAuthorizationUrl(state: string): string {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_REDIRECT_URI) {
    throw new Error("Microsoft OAuth não configurado");
  }
  
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: SCOPES,
    state: state,
    prompt: "consent"
  });
  
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_REDIRECT_URI) {
    throw new Error("Microsoft OAuth não configurado");
  }
  
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code: code,
    redirect_uri: MICROSOFT_REDIRECT_URI,
    grant_type: "authorization_code",
    scope: SCOPES
  });
  
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.text();
    logger.error("Erro ao trocar código por token: " + error);
    throw new Error("Falha na autenticação com Microsoft");
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth não configurado");
  }
  
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: SCOPES
  });
  
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.text();
    logger.error("Erro ao renovar token: " + error);
    throw new Error("Falha ao renovar token Microsoft");
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in
  };
}

export async function saveUserTokens(userId: string, tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  
  const existing = await db.select()
    .from(tokensOAuthUsuario)
    .where(eq(tokensOAuthUsuario.usuarioId, userId))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(tokensOAuthUsuario)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiraEm: expiresAt,
        atualizadoEm: new Date()
      })
      .where(eq(tokensOAuthUsuario.usuarioId, userId));
  } else {
    await db.insert(tokensOAuthUsuario).values({
      usuarioId: userId,
      provedor: "microsoft",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiraEm: expiresAt,
      escopo: SCOPES
    });
  }
  
  logger.success("Tokens Microsoft salvos para usuário", { prefix: "OAuth" });
}

export async function getUserTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
} | null> {
  const tokens = await db.select()
    .from(tokensOAuthUsuario)
    .where(eq(tokensOAuthUsuario.usuarioId, userId))
    .limit(1);
  
  if (tokens.length === 0) {
    return null;
  }
  
  return {
    accessToken: tokens[0].accessToken,
    refreshToken: tokens[0].refreshToken,
    expiresAt: tokens[0].expiraEm
  };
}

export async function deleteUserTokens(userId: string): Promise<void> {
  await db.delete(tokensOAuthUsuario)
    .where(eq(tokensOAuthUsuario.usuarioId, userId));
  
  logger.info("Tokens Microsoft removidos para usuário", { prefix: "OAuth" });
}

async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getUserTokens(userId);
  
  if (!tokens) {
    throw new Error("Calendário não conectado");
  }
  
  const now = new Date();
  const expiresAt = tokens.expiresAt;
  
  if (expiresAt && expiresAt > now) {
    return tokens.accessToken;
  }
  
  if (!tokens.refreshToken) {
    throw new Error("Token expirado, reconecte o calendário");
  }
  
  try {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    await saveUserTokens(userId, newTokens);
    return newTokens.accessToken;
  } catch (error) {
    await deleteUserTokens(userId);
    throw new Error("Sessão expirada, reconecte o calendário");
  }
}

export async function getOutlookClientForUser(userId: string): Promise<Client> {
  const accessToken = await getValidAccessToken(userId);

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
  onlineMeetingProvider?: string;
}

export async function getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  try {
    const client = await getOutlookClientForUser(userId);
    
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

export async function createCalendarEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
  try {
    const client = await getOutlookClientForUser(userId);
    
    let eventToCreate = { ...event };
    
    if (event.isOnlineMeeting) {
      try {
        const onlineMeeting = await client.api('/me/onlineMeetings').post({
          subject: event.subject,
          startDateTime: event.start.dateTime,
          endDateTime: event.end.dateTime,
        });
        
        if (onlineMeeting?.joinUrl) {
          logger.success(`Reunião online criada: ${onlineMeeting.joinUrl}`, { prefix: "Outlook" });
          
          const meetingInfo = `\n\n─────────────────────────────\n📹 Reunião Online\n🔗 ${onlineMeeting.joinUrl}\n─────────────────────────────`;
          
          eventToCreate = {
            ...event,
            body: {
              contentType: "HTML",
              content: (event.body?.content || "") + meetingInfo,
            },
            location: {
              displayName: "Reunião do Teams",
            },
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness",
          };
        }
      } catch (meetingError: any) {
        logger.warn(`Não foi possível criar reunião online (pode ser conta pessoal): ${meetingError.message}`, { prefix: "Outlook" });
      }
    }
    
    const newEvent = await client.api('/me/calendar/events').post(eventToCreate);
    logger.success(`Evento criado: ${event.subject}`, { prefix: "Outlook" });
    
    return newEvent;
  } catch (error: any) {
    logger.error("Erro ao criar evento no calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function updateCalendarEvent(userId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  try {
    const client = await getOutlookClientForUser(userId);
    
    const updatedEvent = await client.api(`/me/calendar/events/${eventId}`).patch(event);
    logger.success(`Evento atualizado: ${eventId}`, { prefix: "Outlook" });
    
    return updatedEvent;
  } catch (error: any) {
    logger.error("Erro ao atualizar evento no calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  try {
    const client = await getOutlookClientForUser(userId);
    
    await client.api(`/me/calendar/events/${eventId}`).delete();
    logger.success(`Evento excluído: ${eventId}`, { prefix: "Outlook" });
  } catch (error: any) {
    logger.error("Erro ao excluir evento do calendário", error, { prefix: "Outlook" });
    throw error;
  }
}

export async function checkOutlookConnection(userId: string): Promise<boolean> {
  try {
    const client = await getOutlookClientForUser(userId);
    await client.api('/me').get();
    return true;
  } catch {
    return false;
  }
}
