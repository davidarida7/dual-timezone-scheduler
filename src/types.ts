export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTimeIso: string; // ISO string in UTC or local ISO
  durationMinutes: number; // e.g., 30, 60, 90, 120
  createdBy: 'user1' | 'user2';
  category?: 'meeting' | 'focus' | 'personal' | 'call' | 'other';
  color?: string;
  createdAt: string;
}

export interface UserProfile {
  id: 'user1' | 'user2';
  name: string;
  avatarUrl?: string;
  color: string;
  bgColor: string;
  badgeBg: string;
}

export interface TimeZoneInfo {
  iananame: string; // e.g. "America/New_York"
  label: string; // e.g. "New York (EDT/EST)"
  city: string;
}

export interface AppUrlParams {
  tz1: string;
  tz2: string;
  user1: string;
  user2: string;
  img1?: string;
  img2?: string;
}
