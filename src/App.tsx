import React, { useState, useEffect } from 'react';
import { CalendarEvent, UserProfile } from './types';
import { parseUrlParams, get24HourSlots } from './lib/timeUtils';
import {
  getStoredEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getStoredAvatars,
  saveStoredAvatar,
  getContextKey,
} from './lib/storage';
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

  // User identities from URL, local storage, or defaults
  const [userProfiles, setUserProfiles] = useState<Record<'user1' | 'user2', UserProfile>>(() => {
    const savedAvatars = getStoredAvatars();
    return {
      user1: {
        id: 'user1',
        name: urlConfig.user1,
        avatarUrl: savedAvatars.user1 !== undefined ? savedAvatars.user1 : urlConfig.img1,
        color: '#a855f7', // purple-500
        bgColor: 'bg-purple-950/40',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      },
      user2: {
        id: 'user2',
        name: urlConfig.user2,
        avatarUrl: savedAvatars.user2 !== undefined ? savedAvatars.user2 : urlConfig.img2,
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

  // Derive current parameters context key
  const currentContextKey = getContextKey(
    leftTz,
    rightTz,
    userProfiles.user1.name,
    userProfiles.user2.name
  );

  // Avatar update and persistence handler
  const handleUpdateAvatar = (userId: 'user1' | 'user2', avatarUrl: string | undefined) => {
    setUserProfiles((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        avatarUrl,
      },
    }));
    saveStoredAvatar(userId, avatarUrl);
  };

  // Function to refresh & auto-prune events from storage for current context key
  const refreshEvents = (key: string = currentContextKey) => {
    setEvents(getStoredEvents(key));
  };

  // Load events on context key change and poll every 15s to auto-remove events once their time passes
  useEffect(() => {
    refreshEvents(currentContextKey);

    const interval = setInterval(() => {
      refreshEvents(currentContextKey);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentContextKey]);

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
    if (editingEvent) {
      const updated: CalendarEvent = {
        ...editingEvent,
        ...eventData,
      };
      updateEvent(updated, currentContextKey);
    } else {
      addEvent(eventData, currentContextKey);
    }
    refreshEvents(currentContextKey);
    setEditingEvent(null);
  };

  // Delete event handler
  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId, currentContextKey);
    refreshEvents(currentContextKey);
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
