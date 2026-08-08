import { TimeZoneInfo, AppUrlParams } from '../types';

export const COMMON_TIMEZONES: TimeZoneInfo[] = [
  { iananame: 'America/New_York', label: 'New York (EDT/EST)', city: 'New York' },
  { iananame: 'America/Los_Angeles', label: 'Los Angeles (PDT/PST)', city: 'Los Angeles' },
  { iananame: 'America/Chicago', label: 'Chicago (CDT/CST)', city: 'Chicago' },
  { iananame: 'Europe/London', label: 'London (BST/GMT)', city: 'London' },
  { iananame: 'Europe/Paris', label: 'Paris (CEST/CET)', city: 'Paris' },
  { iananame: 'Europe/Berlin', label: 'Berlin (CEST/CET)', city: 'Berlin' },
  { iananame: 'Asia/Tokyo', label: 'Tokyo (JST)', city: 'Tokyo' },
  { iananame: 'Asia/Shanghai', label: 'Shanghai / Beijing (CST)', city: 'Beijing' },
  { iananame: 'Asia/Singapore', label: 'Singapore (SGT)', city: 'Singapore' },
  { iananame: 'Asia/Dubai', label: 'Dubai (GST)', city: 'Dubai' },
  { iananame: 'Asia/Kolkata', label: 'India (IST)', city: 'Mumbai' },
  { iananame: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', city: 'Sydney' },
  { iananame: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', city: 'Auckland' },
  { iananame: 'UTC', label: 'Coordinated Universal Time (UTC)', city: 'UTC' },
];

export function getUserLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

export function parseUrlParams(): AppUrlParams {
  if (typeof window === 'undefined') {
    return {
      tz1: 'America/New_York',
      tz2: 'Asia/Tokyo',
      user1: 'Alex',
      user2: 'Jordan',
    };
  }

  const params = new URLSearchParams(window.location.search);
  const localTz = getUserLocalTimeZone();
  
  // Support variants like tz1, leftTz, tzLeft, tzA
  const tz1 = params.get('tz1') || params.get('leftTz') || params.get('tzLeft') || params.get('tzA') || localTz;
  
  // Default second timezone to Tokyo or London if same as local
  let defaultTz2 = 'Asia/Tokyo';
  if (tz1 === 'Asia/Tokyo') defaultTz2 = 'Europe/London';
  
  const tz2 = params.get('tz2') || params.get('rightTz') || params.get('tzRight') || params.get('tzB') || defaultTz2;

  // Support user1, u1, p1, person1
  const user1 = params.get('user1') || params.get('u1') || params.get('p1') || params.get('person1') || 'Alex';
  const user2 = params.get('user2') || params.get('u2') || params.get('p2') || params.get('person2') || 'Jordan';

  // Support img1, avatar1, pic1, image1
  const img1 = params.get('img1') || params.get('avatar1') || params.get('pic1') || params.get('image1') || undefined;
  const img2 = params.get('img2') || params.get('avatar2') || params.get('pic2') || params.get('image2') || undefined;

  return { tz1, tz2, user1, user2, img1, img2 };
}

export function formatTimeInZone(date: Date, timeZone: string, includeDate: boolean = false): {
  timeStr: string;
  hourStr: string;
  ampm: string;
  dateStr: string;
  offsetStr: string;
  dayDiffStr?: string;
  isNextDay?: boolean;
  isPrevDay?: boolean;
} {
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const hourOnlyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: true,
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const formattedTime = timeFormatter.format(date);
    const hourOnly = hourOnlyFormatter.format(date);
    const formattedDate = dateFormatter.format(date);

    // Get offset
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    });
    const parts = offsetFormatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';

    // Day difference calculation relative to UTC or reference local date
    const localDay = new Intl.DateTimeFormat('en-US', { timeZone: getUserLocalTimeZone(), day: 'numeric' }).format(date);
    const targetDay = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(date);

    let dayDiffStr = '';
    let isNextDay = false;
    let isPrevDay = false;

    if (localDay !== targetDay) {
      // Check if target is next day or previous day
      const targetDateVal = new Date(date.toLocaleString('en-US', { timeZone })).getDate();
      const localDateVal = new Date(date.toLocaleString('en-US', { timeZone: getUserLocalTimeZone() })).getDate();
      
      if (targetDateVal > localDateVal || (targetDateVal === 1 && localDateVal > 25)) {
        dayDiffStr = '+1d';
        isNextDay = true;
      } else {
        dayDiffStr = '-1d';
        isPrevDay = true;
      }
    }

    const [hourVal, ampmVal] = hourOnly.split(' ');

    return {
      timeStr: formattedTime,
      hourStr: hourVal || hourOnly,
      ampm: ampmVal || '',
      dateStr: formattedDate,
      offsetStr: tzPart,
      dayDiffStr,
      isNextDay,
      isPrevDay,
    };
  } catch (err) {
    return {
      timeStr: date.toLocaleTimeString(),
      hourStr: `${date.getHours()}`,
      ampm: date.getHours() >= 12 ? 'PM' : 'AM',
      dateStr: date.toLocaleDateString(),
      offsetStr: timeZone,
    };
  }
}

export function get24HourSlots(): Date[] {
  const slots: Date[] = [];
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const slotDate = new Date(base.getTime() + i * 60 * 60 * 1000);
    slots.push(slotDate);
  }

  return slots;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours % 1 === 0) return `${hours}h`;
  return `${Math.floor(hours)}h ${minutes % 60}m`;
}

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getDateTimeInZone(date: Date, timeZone: string): { dateStr: string; timeStr: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const pMap: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        pMap[part.type] = part.value;
      }
    }
    if (pMap.hour === '24') pMap.hour = '00';
    const year = pMap.year;
    const month = pMap.month.padStart(2, '0');
    const day = pMap.day.padStart(2, '0');
    const hour = pMap.hour.padStart(2, '0');
    const minute = pMap.minute.padStart(2, '0');

    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hour}:${minute}`,
    };
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${y}-${m}-${d}`,
      timeStr: `${h}:${min}`,
    };
  }
}

export function parseDateTimeInZone(dateStr: string, timeStr: string, timeZone: string): Date {
  if (!dateStr) return new Date();

  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = (timeStr || '00:00').split(':').map(Number);

  const targetMs = Date.UTC(y, m - 1, d, h || 0, min || 0, 0, 0);
  let guessMs = targetMs;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    for (let i = 0; i < 2; i++) {
      const parts = formatter.formatToParts(new Date(guessMs));
      const pMap: Record<string, number> = {};
      for (const part of parts) {
        if (part.type !== 'literal') {
          pMap[part.type] = parseInt(part.value, 10);
        }
      }
      if (pMap.hour === 24) pMap.hour = 0;
      const currentLocalMs = Date.UTC(
        pMap.year,
        pMap.month - 1,
        pMap.day,
        pMap.hour,
        pMap.minute,
        0,
        0
      );
      const diff = targetMs - currentLocalMs;
      if (diff === 0) break;
      guessMs += diff;
    }

    return new Date(guessMs);
  } catch {
    return new Date(y, m - 1, d, h || 0, min || 0);
  }
}

