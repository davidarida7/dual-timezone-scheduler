import React, { useState, useEffect } from 'react';
import { CalendarEvent, UserProfile } from './types';
import { parseUrlParams, get24HourSlots } from './lib/timeUtils';
import {
  getStoredEvents,
  saveEvents,
  getStoredAvatars,
  saveStoredAvatar,
  getContextKey,
  pruneExpiredEvents,
  DEFAULT_CONTEXT_KEY,
} from './lib/storage';
import {
  subscribeToContext,
  saveEventsToFirestore,
  saveAvatarToFirestore,
} from './lib/firebase';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { EventModal } from './components/EventModal';
import { EventDetailModal } from './components/EventDetailModal';
import { ShareModal } from './components/ShareModal';
import { TimezoneSelectorModal } from './components/TimezoneSelectorModal';
import { AvatarUploadModal } from './components/AvatarUploadModal';

export default function App() {
  const [urlConfig] = useState(() => parseUrlParams());
  
  // Timezone states
  const [leftTz, setLeftTz] = useState<string>(urlConfig.tz1);
  const [rightTz, setRightTz] = useState<string>(urlConfig.tz2);

  // User identities from URL or defaults
  const [userProfiles, setUserProfiles] = useState<Record<'user1' | 'user2', UserProfile>>(() => {
    return {
      user1: {
        id: 'user1',
        name: urlConfig.user1,
        avatarUrl: urlConfig.img1,
        color: '#a855f7', // purple-500
        bgColor: 'bg-purple-950/40',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      },
      user2: {
        id: 'user2',
        name: urlConfig.user2,
        avatarUrl: urlConfig.img2,
        color: '#3b82f6', // blue-500 navy
        bgColor: 'bg-indigo-950/40',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      },
    };
  });

  const [activeUser, setActiveUser] = useState<'user1' | 'user2'>('user1');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [inspectEvent, setInspectEvent] = useState<CalendarEvent | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [isTzModalOpen, setIsTzModalOpen] = useState(false);
  const [tzTargetSide, setTzTargetSide] = useState<'left' | 'right'>('left');

  // Derive current parameters context key (tied to timezones and user names)
  const currentContextKey = getContextKey(
    leftTz,
    rightTz,
    userProfiles.user1.name,
    userProfiles.user2.name
  );

  // Avatar update and persistence handler (keyed by currentContextKey)
  const handleUpdateAvatar = (userId: 'user1' | 'user2', avatarUrl: string | undefined) => {
    setUserProfiles((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        avatarUrl,
      },
    }));
    saveStoredAvatar(currentContextKey, userId, avatarUrl);
    saveAvatarToFirestore(currentContextKey, userId, avatarUrl, events);
  };

  // Real-time Firestore synchronization for events and avatars tied to currentContextKey
  useEffect(() => {
    // 1. Initial local load
    const cachedEvents = getStoredEvents(currentContextKey);
    setEvents(cachedEvents);

    const cachedAvatars = getStoredAvatars(currentContextKey);
    setUserProfiles((prev) => ({
      user1: {
        ...prev.user1,
        avatarUrl: cachedAvatars.user1 !== undefined ? cachedAvatars.user1 : urlConfig.img1,
      },
      user2: {
        ...prev.user2,
        avatarUrl: cachedAvatars.user2 !== undefined ? cachedAvatars.user2 : urlConfig.img2,
      },
    }));

    // 2. Real-time Firestore subscription across devices/browsers
    const unsubscribe = subscribeToContext(
      currentContextKey,
      (data) => {
        let rawEvents = data.events;

        // If Firestore document is brand new & empty for DEFAULT_CONTEXT_KEY, load initial demo events
        if (!data.updatedAt && rawEvents.length === 0 && currentContextKey === DEFAULT_CONTEXT_KEY) {
          rawEvents = getStoredEvents(DEFAULT_CONTEXT_KEY);
          // Persist initial demo events to Firestore so all connected devices sync
          saveEventsToFirestore(DEFAULT_CONTEXT_KEY, rawEvents);
        }

        const activeEvents = pruneExpiredEvents(rawEvents);
        setEvents(activeEvents);
        saveEvents(activeEvents, currentContextKey);

        // Sync avatars for this specific context key
        const localAvatars = getStoredAvatars(currentContextKey);
        const u1Avatar =
          data.avatars.user1 !== undefined
            ? (data.avatars.user1 || undefined)
            : (localAvatars.user1 !== undefined ? localAvatars.user1 : urlConfig.img1);

        const u2Avatar =
          data.avatars.user2 !== undefined
            ? (data.avatars.user2 || undefined)
            : (localAvatars.user2 !== undefined ? localAvatars.user2 : urlConfig.img2);

        setUserProfiles((prev) => {
          if (prev.user1.avatarUrl === u1Avatar && prev.user2.avatarUrl === u2Avatar) {
            return prev;
          }
          return {
            user1: { ...prev.user1, avatarUrl: u1Avatar },
            user2: { ...prev.user2, avatarUrl: u2Avatar },
          };
        });
      },
      (err) => {
        console.warn('Firestore fallback to local storage:', err);
      }
    );

    // Periodic prune for expired events
    const interval = setInterval(() => {
      setEvents((prevEvents) => {
        const active = pruneExpiredEvents(prevEvents);
        if (active.length !== prevEvents.length) {
          saveEvents(active, currentContextKey);
          saveEventsToFirestore(currentContextKey, active);
        }
        return active;
      });
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentContextKey, urlConfig]);

  // Synchronize browser address bar URL parameters when settings change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('tz1', leftTz);
      params.set('tz2', rightTz);
      params.set('user1', userProfiles.user1.name);
      params.set('user2', userProfiles.user2.name);

      // Only sync HTTP/HTTPS URLs to browser URL query bar to avoid huge base64 strings in URL
      if (userProfiles.user1.avatarUrl && !userProfiles.user1.avatarUrl.startsWith('data:')) {
        params.set('img1', userProfiles.user1.avatarUrl);
      } else {
        params.delete('img1');
      }

      if (userProfiles.user2.avatarUrl && !userProfiles.user2.avatarUrl.startsWith('data:')) {
        params.set('img2', userProfiles.user2.avatarUrl);
      } else {
        params.delete('img2');
      }

      const newSearch = params.toString();
      const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      console.error('Failed to update URL search params:', e);
    }
  }, [leftTz, rightTz, userProfiles]);

  // 24 Hour Slots
  const hourSlots = get24HourSlots();

  // Calendar slot selection handler
  const handleSelectSlot = (slotDate: Date) => {
    setSelectedSlotDate(slotDate);
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  // Event Save handler (Add or Update)
  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    let updatedEvents: CalendarEvent[] = [];
    if (editingEvent) {
      const updated: CalendarEvent = {
        ...editingEvent,
        ...eventData,
      };
      updatedEvents = events.map((ev) => (ev.id === updated.id ? updated : ev));
    } else {
      const newEv: CalendarEvent = {
        ...eventData,
        id: 'evt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      updatedEvents = [...events, newEv];
    }

    const activeEvents = pruneExpiredEvents(updatedEvents);
    setEvents(activeEvents);
    saveEvents(activeEvents, currentContextKey);
    saveEventsToFirestore(currentContextKey, activeEvents, {
      user1: userProfiles.user1.avatarUrl,
      user2: userProfiles.user2.avatarUrl,
    });

    setEditingEvent(null);
    setIsEventModalOpen(false);
  };

  // Delete event handler
  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter((ev) => ev.id !== eventId);
    const activeEvents = pruneExpiredEvents(updatedEvents);
    setEvents(activeEvents);
    saveEvents(activeEvents, currentContextKey);
    saveEventsToFirestore(currentContextKey, activeEvents, {
      user1: userProfiles.user1.avatarUrl,
      user2: userProfiles.user2.avatarUrl,
    });
    setInspectEvent(null);
  };

  // Edit existing event trigger
  const handleTriggerEditEvent = (eventToEdit: CalendarEvent) => {
    setEditingEvent(eventToEdit);
    setSelectedSlotDate(new Date(eventToEdit.startTimeIso));
    setIsEventModalOpen(true);
  };

  // Timezone selection handler
  const handleSelectTz = (newTz: string) => {
    if (tzTargetSide === 'left') {
      setLeftTz(newTz);
    } else {
      setRightTz(newTz);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <Header
        activeUser={activeUser}
        userProfiles={userProfiles}
        onSelectActiveUser={setActiveUser}
        leftTz={leftTz}
        rightTz={rightTz}
        onOpenLeftTzModal={() => {
          setTzTargetSide('left');
          setIsTzModalOpen(true);
        }}
        onOpenRightTzModal={() => {
          setTzTargetSide('right');
          setIsTzModalOpen(true);
        }}
        onOpenNewEventModal={() => {
          setSelectedSlotDate(new Date());
          setEditingEvent(null);
          setIsEventModalOpen(true);
        }}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
      />

      {/* Main 24-Hour Calendar Body */}
      <main className="flex-1 pb-12">
        <CalendarView
          leftTz={leftTz}
          rightTz={rightTz}
          hourSlots={hourSlots}
          events={events}
          userProfiles={userProfiles}
          activeUser={activeUser}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(event) => setInspectEvent(event)}
          onOpenNewEvent={() => {
            setSelectedSlotDate(new Date());
            setEditingEvent(null);
            setIsEventModalOpen(true);
          }}
        />
      </main>

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        initialDate={selectedSlotDate}
        activeUser={activeUser}
        userProfiles={userProfiles}
        leftTz={leftTz}
        rightTz={rightTz}
        editingEvent={editingEvent}
      />

      <EventDetailModal
        event={inspectEvent}
        onClose={() => setInspectEvent(null)}
        onEdit={handleTriggerEditEvent}
        onDelete={handleDeleteEvent}
        leftTz={leftTz}
        rightTz={rightTz}
        userProfiles={userProfiles}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        leftTz={leftTz}
        rightTz={rightTz}
        user1={userProfiles.user1.name}
        user2={userProfiles.user2.name}
        img1={userProfiles.user1.avatarUrl}
        img2={userProfiles.user2.avatarUrl}
      />

      <TimezoneSelectorModal
        isOpen={isTzModalOpen}
        onClose={() => setIsTzModalOpen(false)}
        targetSide={tzTargetSide}
        currentTz={tzTargetSide === 'left' ? leftTz : rightTz}
        onSelectTz={handleSelectTz}
      />

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        userProfiles={userProfiles}
        onUpdateAvatar={handleUpdateAvatar}
      />
    </div>
  );
}
