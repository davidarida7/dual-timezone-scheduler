import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CalendarEvent } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Helper to convert context key string to valid Firestore document ID
export function getDocIdForContextKey(contextKey: string): string {
  return encodeURIComponent(contextKey.trim()).replace(/\./g, '%2E');
}

export interface ContextData {
  contextKey: string;
  events: CalendarEvent[];
  avatars: {
    user1?: string;
    user2?: string;
  };
  updatedAt?: string;
}

/**
 * Ensures event objects have no undefined properties before saving to Firestore
 */
export function sanitizeEventForFirestore(event: CalendarEvent): Record<string, any> {
  const clean: Record<string, any> = {
    id: String(event.id || ''),
    title: String(event.title || ''),
    startTimeIso: String(event.startTimeIso || new Date().toISOString()),
    durationMinutes: Number(event.durationMinutes) || 30,
    createdBy: event.createdBy === 'user2' ? 'user2' : 'user1',
    createdAt: String(event.createdAt || new Date().toISOString()),
  };

  if (event.description) {
    clean.description = String(event.description);
  }
  if (event.location) {
    clean.location = String(event.location);
  }
  if (event.category) {
    clean.category = String(event.category);
  }

  return clean;
}

/**
 * Subscribe to real-time updates for a calendar context key across all devices
 */
export function subscribeToContext(
  contextKey: string,
  onUpdate: (data: ContextData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docId = getDocIdForContextKey(contextKey);
  const docRef = doc(db, 'calendars', docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ContextData;
        onUpdate({
          contextKey: data.contextKey || contextKey,
          events: Array.isArray(data.events) ? data.events : [],
          avatars: data.avatars || {},
          updatedAt: data.updatedAt,
        });
      } else {
        onUpdate({
          contextKey,
          events: [],
          avatars: {},
        });
      }
    },
    (err) => {
      console.error('Firestore subscription error for context:', contextKey, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save updated events array for a given context key in Firestore
 */
export async function saveEventsToFirestore(
  contextKey: string,
  events: CalendarEvent[],
  currentAvatars?: { user1?: string; user2?: string }
): Promise<void> {
  try {
    const docId = getDocIdForContextKey(contextKey);
    const docRef = doc(db, 'calendars', docId);

    const cleanEvents = events.map(sanitizeEventForFirestore);

    const payload: Record<string, any> = {
      contextKey,
      events: cleanEvents,
      updatedAt: new Date().toISOString(),
    };

    if (currentAvatars) {
      payload.avatars = {
        user1: currentAvatars.user1 || '',
        user2: currentAvatars.user2 || '',
      };
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to save events to Firestore:', err);
  }
}

/**
 * Save updated avatar for a user in a specific context key in Firestore
 */
export async function saveAvatarToFirestore(
  contextKey: string,
  userId: 'user1' | 'user2',
  avatarUrl: string | undefined,
  currentEvents?: CalendarEvent[]
): Promise<void> {
  try {
    const docId = getDocIdForContextKey(contextKey);
    const docRef = doc(db, 'calendars', docId);

    const snapshot = await getDoc(docRef);
    const existingAvatars = snapshot.exists() ? (snapshot.data().avatars || {}) : {};

    const updatedAvatars = {
      user1: userId === 'user1' ? (avatarUrl || '') : (existingAvatars.user1 || ''),
      user2: userId === 'user2' ? (avatarUrl || '') : (existingAvatars.user2 || ''),
    };

    const payload: Record<string, any> = {
      contextKey,
      avatars: updatedAvatars,
      updatedAt: new Date().toISOString(),
    };

    if (currentEvents && Array.isArray(currentEvents)) {
      payload.events = currentEvents.map(sanitizeEventForFirestore);
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to save avatar to Firestore:', err);
  }
}
