import React, { useState, useEffect } from 'react';
import { CalendarEvent, UserProfile } from '../types';
import {
  formatTimeInZone,
  formatDuration,
  getDateTimeInZone,
  parseDateTimeInZone,
} from '../lib/timeUtils';
import { UserAvatar } from './UserAvatar';
import { X, Calendar, Clock, Globe, MapPin, FileText, Check, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  initialDate?: Date;
  activeUser: 'user1' | 'user2';
  userProfiles: Record<'user1' | 'user2', UserProfile>;
  leftTz: string;
  rightTz: string;
  editingEvent?: CalendarEvent | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  activeUser,
  userProfiles,
  leftTz,
  rightTz,
  editingEvent,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [createdBy, setCreatedBy] = useState<'user1' | 'user2'>(activeUser);
  const [eventDateStr, setEventDateStr] = useState<string>('');
  const [startTimeStr, setStartTimeStr] = useState<string>('09:00');
  const [endTimeStr, setEndTimeStr] = useState<string>('10:00');

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setLocation(editingEvent.location || '');
      const user = editingEvent.createdBy;
      setCreatedBy(user);

      const userTz = user === 'user1' ? leftTz : rightTz;
      const start = new Date(editingEvent.startTimeIso);
      const end = new Date(start.getTime() + (editingEvent.durationMinutes || 60) * 60 * 1000);

      const startInfo = getDateTimeInZone(start, userTz);
      const endInfo = getDateTimeInZone(end, userTz);

      setEventDateStr(startInfo.dateStr);
      setStartTimeStr(startInfo.timeStr);
      setEndTimeStr(endInfo.timeStr);
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      const user = activeUser;
      setCreatedBy(user);

      const userTz = user === 'user1' ? leftTz : rightTz;
      const start = initialDate || new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const startInfo = getDateTimeInZone(start, userTz);
      const endInfo = getDateTimeInZone(end, userTz);

      setEventDateStr(startInfo.dateStr);
      setStartTimeStr(startInfo.timeStr);
      setEndTimeStr(endInfo.timeStr);
    }
  }, [editingEvent, initialDate, activeUser, isOpen, leftTz, rightTz]);

  if (!isOpen) return null;

  const organizerTz = createdBy === 'user1' ? leftTz : rightTz;
  const organizerProfile = userProfiles[createdBy];

  const computeStartAndEndForTz = (tz: string) => {
    if (!eventDateStr) {
      const now = new Date();
      return {
        start: now,
        end: new Date(now.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
      };
    }

    const start = parseDateTimeInZone(eventDateStr, startTimeStr, tz);
    let end = parseDateTimeInZone(eventDateStr, endTimeStr, tz);

    // Handle events that cross midnight into the next day
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const durationMinutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));

    return { start, end, durationMinutes };
  };

  const handleSelectOrganizer = (newUser: 'user1' | 'user2') => {
    if (newUser === createdBy) return;

    const oldTz = createdBy === 'user1' ? leftTz : rightTz;
    const newTz = newUser === 'user1' ? leftTz : rightTz;

    const currentRange = computeStartAndEndForTz(oldTz);
    const newStartInfo = getDateTimeInZone(currentRange.start, newTz);
    const newEndInfo = getDateTimeInZone(currentRange.end, newTz);

    setCreatedBy(newUser);
    setEventDateStr(newStartInfo.dateStr);
    setStartTimeStr(newStartInfo.timeStr);
    setEndTimeStr(newEndInfo.timeStr);
  };

  const { start: startDate, end: endDate, durationMinutes } = computeStartAndEndForTz(organizerTz);

  const startLeft = formatTimeInZone(startDate, leftTz);
  const endLeft = formatTimeInZone(endDate, leftTz);
  const startRight = formatTimeInZone(startDate, rightTz);
  const endRight = formatTimeInZone(endDate, rightTz);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTimeIso: startDate.toISOString(),
      durationMinutes,
      createdBy,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingEvent ? 'Edit Scheduled Event' : 'Schedule New Event'}
                </h3>
                <p className="text-xs text-slate-400">
                  Times below are set in <span className="text-sky-300 font-semibold">{organizerProfile.name}</span>'s time zone ({organizerTz.split('/')[1] || organizerTz})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 text-slate-200">
            {/* Organizer / Created By Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Organizer</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal normal-case">
                  Inputs adapt to selected organizer's time zone
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectOrganizer('user1')}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    createdBy === 'user1'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold ring-1 ring-purple-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserAvatar user={userProfiles.user1} size="xs" showBorder={false} />
                  <span>{userProfiles.user1.name} ({leftTz.split('/')[1] || leftTz})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOrganizer('user2')}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    createdBy === 'user2'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold ring-1 ring-indigo-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserAvatar user={userProfiles.user2} size="xs" showBorder={false} />
                  <span>{userProfiles.user2.name} ({rightTz.split('/')[1] || rightTz})</span>
                </button>
              </div>
            </div>

            {/* Dual Timezone Live Sync Box */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  <span>Synchronized Time Preview</span>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300">
                  Duration: {formatDuration(durationMinutes)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`p-2.5 rounded-lg border transition-all ${
                  createdBy === 'user1'
                    ? 'bg-purple-950/40 border-purple-400 text-purple-200 ring-1 ring-purple-500/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-purple-400">{userProfiles.user1.name} ({leftTz.split('/')[1] || leftTz})</span>
                    {createdBy === 'user1' && (
                      <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-bold">Input Zone</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-white font-mono mt-0.5">
                    {startLeft.timeStr} – {endLeft.timeStr}
                  </div>
                  <div className="text-[10px] text-slate-400">{startLeft.dateStr}</div>
                </div>

                <div className={`p-2.5 rounded-lg border transition-all ${
                  createdBy === 'user2'
                    ? 'bg-indigo-950/40 border-indigo-400 text-indigo-200 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-indigo-400">{userProfiles.user2.name} ({rightTz.split('/')[1] || rightTz})</span>
                    {createdBy === 'user2' && (
                      <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded font-bold">Input Zone</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-white font-mono mt-0.5">
                    {startRight.timeStr} – {endRight.timeStr}
                  </div>
                  <div className="text-[10px] text-slate-400">{startRight.dateStr}</div>
                </div>
              </div>
            </div>

            {/* Event Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sprint Handover or Team Sync"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                autoFocus
              />
            </div>

            {/* Date, Start Time & End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>Date</span>
                  </div>
                </label>
                <input
                  type="date"
                  required
                  value={eventDateStr}
                  onChange={(e) => setEventDateStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Start Time</span>
                  </div>
                </label>
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>End Time</span>
                  </div>
                </label>
                <input
                  type="time"
                  required
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Location</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Conference Room A, Office Pod 3, or Online"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Description & Agenda</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description or key meeting points..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingEvent ? 'Save Changes' : 'Confirm Event'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

