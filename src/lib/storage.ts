import { CalendarEvent } from '../types';

const STORAGE_KEYS = {
  EVENTS: 'dual_tz_calendar_events_v2',
  AVATARS: 'dual_tz_user_avatars_v1',
};

export const DEFAULT_CONTEXT_KEY = 'America/New_York___Asia/Tokyo___Alex___Jordan';

export function getContextKey(tz1?: string, tz2?: string, user1?: string, user2?: string): string {
  const normTz1 = (tz1 || 'America/New_York').trim();
  const normTz2 = (tz2 || 'Asia/Tokyo').trim();
  const normU1 = (user1 || 'Alex').trim();
  const normU2 = (user2 || 'Jordan').trim();
  return `${normTz1}___${normTz2}___${normU1}___${normU2}`;
}

export function getStoredAvatars(contextKey: string = DEFAULT_CONTEXT_KEY): Record<'user1' | 'user2', string | undefined> {
  if (typeof window === 'undefined') return { user1: undefined, user2: undefined };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AVATARS);
    if (!raw) return { user1: undefined, user2: undefined };
    const parsed = JSON.parse(raw);
    const contextAvatars = parsed[contextKey];
    if (contextAvatars && typeof contextAvatars === 'object') {
      return {
        user1: contextAvatars.user1 || undefined,
        user2: contextAvatars.user2 || undefined,
      };
    }
    return { user1: undefined, user2: undefined };
  } catch (e) {
    console.error('Failed to parse user avatars:', e);
    return { user1: undefined, user2: undefined };
  }
}

export function saveStoredAvatar(
  contextKey: string = DEFAULT_CONTEXT_KEY,
  userId: 'user1' | 'user2',
  avatarUrl: string | undefined
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AVATARS);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed[contextKey]) {
      parsed[contextKey] = {};
    }
    parsed[contextKey][userId] = avatarUrl || '';
    localStorage.setItem(STORAGE_KEYS.AVATARS, JSON.stringify(parsed));
  } catch (e) {
    console.error('Failed to save user avatar:', e);
  }
}

function saveAvatarsLocally(avatars: Record<'user1' | 'user2', string | undefined>, contextKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AVATARS);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[contextKey] = avatars;
    localStorage.setItem(STORAGE_KEYS.AVATARS, JSON.stringify(parsed));
  } catch (e) {
    console.error('Failed to save avatars locally:', e);
  }
}

function getStoredEventsDictionary(): Record<string, CalendarEvent[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const dict: Record<string, CalendarEvent[]> = {
        [DEFAULT_CONTEXT_KEY]: parsed,
      };
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(dict));
      return dict;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, CalendarEvent[]>;
    }
    return {};
  } catch (e) {
    console.error('Failed to parse calendar events dictionary:', e);
    return {};
  }
}

export function saveEventsDictionary(dict: Record<string, CalendarEvent[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(dict));
  } catch (e) {
    console.error('Failed to save calendar events dictionary:', e);
  }
}

/**
 * Filter out events that have passed (where end time <= current time)
 */
export function pruneExpiredEvents(events: CalendarEvent[]): CalendarEvent[] {
  const nowMs = Date.now();
  return events.filter((ev) => {
    const startMs = new Date(ev.startTimeIso).getTime();
    const endMs = startMs + (ev.durationMinutes || 60) * 60 * 1000;
    return endMs > nowMs;
  });
}

export function getStoredEvents(contextKey: string = DEFAULT_CONTEXT_KEY): CalendarEvent[] {
  if (typeof window === 'undefined') return [];
  const dict = getStoredEventsDictionary();
  let events = dict[contextKey];

  if (!events) {
    if (contextKey === DEFAULT_CONTEXT_KEY) {
      events = generateInitialDemoEvents();
      dict[DEFAULT_CONTEXT_KEY] = events;
      saveEventsDictionary(dict);
    } else {
      return [];
    }
  }

  // Auto-remove events whose time has passed
  const activeEvents = pruneExpiredEvents(events);

  if (activeEvents.length !== events.length) {
    dict[contextKey] = activeEvents;
    saveEventsDictionary(dict);
  }

  return activeEvents;
}

/**
 * Server REST API fetch (supports Cloud SQL, Vercel Postgres, Neon, Supabase, or local persistent JSON store)
 */
export async function fetchServerCalendarData(contextKey: string = DEFAULT_CONTEXT_KEY): Promise<{ events: CalendarEvent[]; avatars: Record<'user1' | 'user2', string | undefined> } | null> {
  try {
    const res = await fetch(`/api/calendar?contextKey=${encodeURIComponent(contextKey)}&_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        if (Array.isArray(json.data.events)) {
          saveEvents(json.data.events, contextKey);
        }
        if (json.data.avatars) {
          saveAvatarsLocally(json.data.avatars, contextKey);
        }
        return {
          events: json.data.events || [],
          avatars: json.data.avatars || { user1: undefined, user2: undefined },
        };
      }
    }
  } catch (e) {
    console.info('Server API fetch notice:', e);
  }

  return null;
}

/**
 * Save data via Server REST API & local storage fallback
 */
export async function saveServerCalendarData(
  contextKey: string = DEFAULT_CONTEXT_KEY,
  events: CalendarEvent[],
  avatars?: Record<'user1' | 'user2', string | undefined>
): Promise<boolean> {
  // Save locally first
  saveEvents(events, contextKey);

  const finalAvatars = avatars || getStoredAvatars(contextKey);

  try {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextKey, events, avatars: finalAvatars }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Server API save notice:', e);
    return false;
  }
}

export function saveEvents(events: CalendarEvent[], contextKey: string = DEFAULT_CONTEXT_KEY): void {
  if (typeof window === 'undefined') return;
  const dict = getStoredEventsDictionary();
  dict[contextKey] = events;
  saveEventsDictionary(dict);
}

export function addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>, contextKey: string = DEFAULT_CONTEXT_KEY): CalendarEvent {
  const newEvent: CalendarEvent = {
    ...event,
    id: 'evt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  const current = getStoredEvents(contextKey);
  const updated = [...current, newEvent];
  saveEvents(updated, contextKey);
  saveServerCalendarData(contextKey, updated);
  return newEvent;
}

export function updateEvent(updatedEvent: CalendarEvent, contextKey: string = DEFAULT_CONTEXT_KEY): void {
  const current = getStoredEvents(contextKey);
  const updated = current.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev));
  saveEvents(updated, contextKey);
  saveServerCalendarData(contextKey, updated);
}

export function deleteEvent(eventId: string, contextKey: string = DEFAULT_CONTEXT_KEY): void {
  const current = getStoredEvents(contextKey);
  const updated = current.filter((ev) => ev.id !== eventId);
  saveEvents(updated, contextKey);
  saveServerCalendarData(contextKey, updated);
}

export function exportAllData(): string {
  if (typeof window === 'undefined') return '{}';
  const eventsDict = getStoredEventsDictionary();
  const rawAvatars = localStorage.getItem(STORAGE_KEYS.AVATARS);
  const avatars = rawAvatars ? JSON.parse(rawAvatars) : {};

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      events: eventsDict,
      avatars: avatars,
    },
    null,
    2
  );
}

export function importData(jsonString: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.parse(jsonString);
    if (data.events && typeof data.events === 'object') {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data.events));
    }
    if (data.avatars && typeof data.avatars === 'object') {
      localStorage.setItem(STORAGE_KEYS.AVATARS, JSON.stringify(data.avatars));
    }
    return true;
  } catch (e) {
    console.error('Failed to import JSON data:', e);
    return false;
  }
}

export function generateInitialDemoEvents(): CalendarEvent[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

  const getIsoAtHourOffset = (offsetHours: number) => {
    return new Date(base.getTime() + offsetHours * 3600 * 1000).toISOString();
  };

  return [
    {
      id: 'demo_1',
      title: 'Global Sync & Handover',
      description: 'Review project milestones, cross-timezone sprint review, and key blockers.',
      location: 'Conference Room A & Remote',
      startTimeIso: getIsoAtHourOffset(1),
      durationMinutes: 60,
      createdBy: 'user1',
      category: 'meeting',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo_2',
      title: 'Deep Focus & Architecture Design',
      description: 'Uninterrupted time for system refactoring and performance audit.',
      location: 'Main Office - Quiet Pod 3',
      startTimeIso: getIsoAtHourOffset(4),
      durationMinutes: 90,
      createdBy: 'user2',
      category: 'focus',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo_3',
      title: 'Strategy & Roadmap Discussion',
      description: 'Discuss Q3 goals and team priorities across US & Asia teams.',
      location: 'HQ Strategy Room',
      startTimeIso: getIsoAtHourOffset(8),
      durationMinutes: 45,
      createdBy: 'user1',
      category: 'call',
      createdAt: new Date().toISOString(),
    },
  ];
}
