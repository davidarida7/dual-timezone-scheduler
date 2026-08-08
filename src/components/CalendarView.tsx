import React, { useEffect, useState } from 'react';
import { CalendarEvent, UserProfile } from '../types';
import { formatTimeInZone, formatDuration } from '../lib/timeUtils';
import { UserAvatar } from './UserAvatar';
import { Clock, Plus, Globe, Video, User, CheckCircle2, VideoOff, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface CalendarViewProps {
  leftTz: string;
  rightTz: string;
  hourSlots: Date[];
  events: CalendarEvent[];
  userProfiles: Record<'user1' | 'user2', UserProfile>;
  activeUser: 'user1' | 'user2';
  onSelectSlot: (slotDate: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenNewEvent: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  leftTz,
  rightTz,
  hourSlots,
  events,
  userProfiles,
  activeUser,
  onSelectSlot,
  onSelectEvent,
  onOpenNewEvent,
}) => {
  const [now, setNow] = useState<Date>(new Date());

  // Update current time every 30 seconds for live NOW line movement
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format timezone label
  const getTzCity = (tzStr: string) => {
    const parts = tzStr.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  };

  // Compute total grid span
  const firstSlot = hourSlots[0];
  const lastSlot = hourSlots[hourSlots.length - 1];
  const gridStartMs = firstSlot ? firstSlot.getTime() : new Date().getTime();
  const gridEndMs = lastSlot ? lastSlot.getTime() + 3600000 : gridStartMs + 24 * 3600000;
  const totalGridMs = gridEndMs - gridStartMs;

  // Calculate NOW position percentage
  const nowMs = now.getTime();
  const isNowInGrid = nowMs >= gridStartMs && nowMs <= gridEndMs;
  const nowTopPercent = isNowInGrid ? ((nowMs - gridStartMs) / totalGridMs) * 100 : -1;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-4">
      {/* Top Info Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-800 p-3.5 rounded-2xl text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            Displaying 24-hour timeline from{' '}
            <strong className="text-white font-medium">
              {formatTimeInZone(hourSlots[0] || new Date(), leftTz).timeStr}
            </strong>{' '}
            to{' '}
            <strong className="text-white font-medium">
              {formatTimeInZone(hourSlots[hourSlots.length - 1] || new Date(), leftTz).timeStr}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <UserAvatar user={userProfiles.user1} size="xs" />
            <span>{userProfiles.user1.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserAvatar user={userProfiles.user2} size="xs" />
            <span>{userProfiles.user2.name}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-mono">{events.length} event(s) scheduled</span>
        </div>
      </div>

      {/* Main 24-Hour Dual-Timezone Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Sticky Timezone Header */}
        <div className="grid grid-cols-12 bg-slate-800/90 border-b border-slate-700/80 divide-x divide-slate-700/60 sticky top-[65px] z-20 backdrop-blur-md">
          {/* Left Column Header (Timezone 1) */}
          <div className="col-span-3 sm:col-span-3 lg:col-span-2 p-3 sm:p-4 text-left bg-purple-950/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Left Zone</span>
            </div>
            <div className="text-sm font-bold text-white truncate" title={leftTz}>
              {getTzCity(leftTz)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {formatTimeInZone(now, leftTz).offsetStr}
            </div>
          </div>

          {/* Center Column Header (Timeline) */}
          <div className="col-span-6 sm:col-span-6 lg:col-span-8 p-3 sm:p-4 text-center flex flex-col items-center justify-center bg-slate-900/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>24-Hour Timeline Grid</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any hour row or event to inspect & schedule
            </p>
          </div>

          {/* Right Column Header (Timezone 2) */}
          <div className="col-span-3 sm:col-span-3 lg:col-span-2 p-3 sm:p-4 text-right bg-indigo-950/30">
            <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <span>Right Zone</span>
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-bold text-white truncate" title={rightTz}>
              {getTzCity(rightTz)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {formatTimeInZone(now, rightTz).offsetStr}
            </div>
          </div>
        </div>

        {/* 24 Hourly Rows Container */}
        <div className="relative divide-y divide-slate-800/80">
          
          {/* NOW Indicator Horizontal Line */}
          {isNowInGrid && nowTopPercent >= 0 && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none flex items-center transition-all duration-1000"
              style={{ top: `${nowTopPercent}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 -ml-1" />
              <div className="h-0.5 bg-rose-500/90 flex-1 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded ml-1 shadow">
                NOW ({formatTimeInZone(now, leftTz).timeStr})
              </span>
            </div>
          )}

          {/* Render 24 hour slots */}
          {hourSlots.map((slotDate, index) => {
            const leftInfo = formatTimeInZone(slotDate, leftTz);
            const rightInfo = formatTimeInZone(slotDate, rightTz);

            // Filter events that start in this 1-hour slot (or overlap with it)
            const slotStartMs = slotDate.getTime();
            const slotEndMs = slotStartMs + 3600000;

            const eventsInSlot = events.filter((ev) => {
              const evStart = new Date(ev.startTimeIso).getTime();
              const evEnd = evStart + ev.durationMinutes * 60000;
              return evStart >= slotStartMs && evStart < slotEndMs;
            });

            return (
              <div
                key={slotDate.toISOString()}
                className="grid grid-cols-12 group hover:bg-slate-800/40 transition-colors min-h-[64px]"
              >
                {/* Left Timezone Cell */}
                <div className="col-span-3 sm:col-span-3 lg:col-span-2 p-2.5 sm:p-3 bg-slate-900/40 border-r border-slate-800 flex flex-col justify-center">
                  <div className="flex items-baseline gap-1.5 font-mono text-slate-200">
                    <span className="text-sm font-bold">{leftInfo.hourStr}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{leftInfo.ampm}</span>
                    {leftInfo.dayDiffStr && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800 font-sans font-bold">
                        {leftInfo.dayDiffStr}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">{leftInfo.dateStr}</span>
                </div>

                {/* Center Events Timeline Slot */}
                <div
                  onClick={() => onSelectSlot(slotDate)}
                  className="col-span-6 sm:col-span-6 lg:col-span-8 p-2 relative flex flex-col justify-center cursor-pointer border-r border-slate-800/80 group-hover:border-slate-700/60"
                >
                  {/* Subtle Slot Hour Background Grid Label */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-sky-400 font-medium">
                    <Plus className="w-3 h-3" />
                    <span>Add Event at {leftInfo.hourStr} {leftInfo.ampm}</span>
                  </div>

                  {/* Render Scheduled Events for this slot */}
                  {eventsInSlot.length > 0 ? (
                    <div className="space-y-1.5 z-10">
                      {eventsInSlot.map((event) => {
                        const isUser1 = event.createdBy === 'user1';
                        const creatorProfile = userProfiles[event.createdBy];

                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(event);
                            }}
                            className={`p-2.5 rounded-xl border transition-all shadow-md cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                              isUser1
                                ? 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400 text-purple-100'
                                : 'bg-indigo-950/40 border-indigo-500/40 hover:border-indigo-400 text-indigo-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 shrink-0">
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                              </div>

                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-white truncate">
                                    {event.title}
                                  </h4>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-slate-900/80 border border-slate-700 text-slate-300">
                                    {formatDuration(event.durationMinutes)}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-[11px] text-slate-300/80 truncate max-w-md">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {event.locationOrLink && (
                                <a
                                  href={event.locationOrLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-700 text-[10px] flex items-center gap-1"
                                  title="Join meeting link"
                                >
                                  <Video className="w-3 h-3" />
                                  <span className="hidden lg:inline">Join</span>
                                </a>
                              )}

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                          isUser1 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        <UserAvatar user={creatorProfile} size="xs" showBorder={false} />
                        {creatorProfile.name}
                      </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-2 text-[11px] text-slate-600 group-hover:text-slate-400 transition-colors flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-sky-500/50" />
                      <span className="font-mono text-[10px]">Open Slot</span>
                    </div>
                  )}
                </div>

                {/* Right Timezone Cell */}
                <div className="col-span-3 sm:col-span-3 lg:col-span-2 p-2.5 sm:p-3 bg-slate-900/40 flex flex-col items-end justify-center">
                  <div className="flex items-baseline gap-1.5 font-mono text-slate-200">
                    {rightInfo.dayDiffStr && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-sans font-bold">
                        {rightInfo.dayDiffStr}
                      </span>
                    )}
                    <span className="text-sm font-bold">{rightInfo.hourStr}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{rightInfo.ampm}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate text-right">{rightInfo.dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>
            Click on any hour slot to schedule a new event as{' '}
            <strong className="text-sky-400 font-medium">{userProfiles[activeUser].name}</strong>.
          </span>
          <button
            onClick={onOpenNewEvent}
            className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule custom event</span>
          </button>
        </div>
      </div>
    </div>
  );
};
