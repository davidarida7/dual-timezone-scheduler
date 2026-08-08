import React from 'react';
import { CalendarEvent, UserProfile } from '../types';
import { formatTimeInZone, formatDuration } from '../lib/timeUtils';
import { UserAvatar } from './UserAvatar';
import { X, Calendar, Clock, Globe, MapPin, User, Edit3, Trash2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  leftTz: string;
  rightTz: string;
  userProfiles: Record<'user1' | 'user2', UserProfile>;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onEdit,
  onDelete,
  leftTz,
  rightTz,
  userProfiles,
}) => {
  if (!event) return null;

  const startDate = new Date(event.startTimeIso);
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60 * 1000);
  const leftStartTime = formatTimeInZone(startDate, leftTz);
  const leftEndTime = formatTimeInZone(endDate, leftTz);
  const rightStartTime = formatTimeInZone(startDate, rightTz);
  const rightEndTime = formatTimeInZone(endDate, rightTz);
  const creator = userProfiles[event.createdBy];

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
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-800/40">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                  Duration: {formatDuration(event.durationMinutes)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{event.title}</h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6 text-slate-200">
            {/* Dual Timezone Times */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>Scheduled Time Across Zones</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1">
                  <div className="text-xs text-purple-400 font-semibold">{leftTz.split('/')[1] || leftTz}</div>
                  <div className="text-sm font-bold text-white font-mono">{leftStartTime.timeStr} – {leftEndTime.timeStr}</div>
                  <div className="text-xs text-slate-400">{leftStartTime.dateStr}</div>
                </div>

                <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-1">
                  <div className="text-xs text-indigo-400 font-semibold">{rightTz.split('/')[1] || rightTz}</div>
                  <div className="text-sm font-bold text-white font-mono">{rightStartTime.timeStr} – {rightEndTime.timeStr}</div>
                  <div className="text-xs text-slate-400">{rightStartTime.dateStr}</div>
                </div>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400">Scheduled by</span>
              <div className="flex items-center gap-2 font-bold text-white">
                <UserAvatar user={creator} size="sm" />
                <span>{creator.name}</span>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>Location</span>
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200">
                  {event.location}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Description & Agenda</span>
                </label>
                <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Event</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onEdit(event);
                  onClose();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
