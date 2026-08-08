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
          events: data.events || [],
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

    const payload: Partial<ContextData> = {
      contextKey,
      events,
      updatedAt: new Date().toISOString(),
    };

    if (currentAvatars) {
      payload.avatars = currentAvatars;
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
      ...existingAvatars,
      [userId]: avatarUrl || '',
    };

    const payload: Partial<ContextData> = {
      contextKey,
      avatars: updatedAvatars,
      updatedAt: new Date().toISOString(),
    };

    if (currentEvents) {
      payload.events = currentEvents;
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to save avatar to Firestore:', err);
  }
}
