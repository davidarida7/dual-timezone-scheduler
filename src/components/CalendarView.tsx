import React, { useEffect, useState } from 'react';
import { CalendarEvent, UserProfile } from '../types';
import { formatTimeInZone, formatDuration } from '../lib/timeUtils';
import { UserAvatar } from './UserAvatar';
import { Clock, Plus, Globe, Video, Sparkles } from 'lucide-react';
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

export interface PositionedEvent {
  event: CalendarEvent;
  startMs: number;
  endMs: number;
  topPx: number;
  heightPx: number;
  colIndex: number;
  maxCols: number;
}

export function computeEventPositions(
  events: CalendarEvent[],
  gridStartMs: number,
  gridEndMs: number,
  hourHeight: number
): PositionedEvent[] {
  // 1. Convert events to time spans and filter to those within grid window
  const visibleItems = events
    .map((event) => {
      const startMs = new Date(event.startTimeIso).getTime();
      const durationMins = Math.max(15, event.durationMinutes || 30);
      const endMs = startMs + durationMins * 60000;
      return { event, startMs, endMs };
    })
    .filter(({ startMs, endMs }) => startMs < gridEndMs && endMs > gridStartMs);

  // 2. Sort by start time ascending, then by duration descending
  visibleItems.sort((a, b) => {
    if (a.startMs !== b.startMs) return a.startMs - b.startMs;
    return (b.endMs - b.startMs) - (a.endMs - a.startMs);
  });

  // 3. Cluster overlapping events
  const clusters: (typeof visibleItems)[] = [];
  let currentCluster: (typeof visibleItems) = [];
  let clusterEndMs = 0;

  for (const item of visibleItems) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEndMs = item.endMs;
    } else {
      if (item.startMs < clusterEndMs) {
        currentCluster.push(item);
        clusterEndMs = Math.max(clusterEndMs, item.endMs);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterEndMs = item.endMs;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. Assign column indices within each cluster
  const result: PositionedEvent[] = [];

  for (const cluster of clusters) {
    const colEndTimes: number[] = [];
    const itemPositions: { item: (typeof visibleItems)[0]; colIndex: number }[] = [];

    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= item.startMs) {
          placedCol = c;
          colEndTimes[c] = item.endMs;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEndTimes.length;
        colEndTimes.push(item.endMs);
      }
      itemPositions.push({ item, colIndex: placedCol });
    }

    const maxCols = colEndTimes.length;

    for (const { item, colIndex } of itemPositions) {
      const visStart = Math.max(item.startMs, gridStartMs);
      const visEnd = Math.min(item.endMs, gridEndMs);
      const startOffsetHrs = (visStart - gridStartMs) / 3600000;
      const durationHrs = (visEnd - visStart) / 3600000;

      const topPx = startOffsetHrs * hourHeight;
      const rawHeightPx = durationHrs * hourHeight;
      const heightPx = Math.max(28, rawHeightPx - 2);

      result.push({
        event: item.event,
        startMs: item.startMs,
        endMs: item.endMs,
        topPx,
        heightPx,
        colIndex,
        maxCols,
      });
    }
  }

  return result;
}

const HOUR_HEIGHT = 64; // pixels per hour slot

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

  // Calculate NOW position in pixels
  const nowMs = now.getTime();
  const isNowInGrid = nowMs >= gridStartMs && nowMs <= gridEndMs;
  const nowTopPx = isNowInGrid ? ((nowMs - gridStartMs) / 3600000) * HOUR_HEIGHT : -1;

  // Position events on the 24-hour vertical scale
  const positionedEvents = computeEventPositions(events, gridStartMs, gridEndMs, HOUR_HEIGHT);

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
              <span>24-Hour Timeline Canvas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Side-by-side overlap scheduling • Duration scaled visual blocks
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
          <div className="grid grid-cols-12 divide-x divide-slate-800">
            {/* Left Timezone Column */}
            <div className="col-span-3 sm:col-span-3 lg:col-span-2 bg-slate-900/40 divide-y divide-slate-800/80">
              {hourSlots.map((slotDate) => {
                const leftInfo = formatTimeInZone(slotDate, leftTz);
                return (
                  <div
                    key={slotDate.toISOString()}
                    className="h-[64px] p-2.5 sm:p-3 flex flex-col justify-center"
                  >
                    <div className="flex items-baseline gap-1.5 font-mono text-slate-200">
                      <span className="text-sm font-bold">{leftInfo.hourStr}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {leftInfo.ampm}
                      </span>
                      {leftInfo.dayDiffStr && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800 font-sans font-bold">
                          {leftInfo.dayDiffStr}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">{leftInfo.dateStr}</span>
                  </div>
                );
              })}
            </div>

            {/* Center Timeline Column Canvas */}
            <div className="col-span-6 sm:col-span-6 lg:col-span-8 relative h-[1536px] bg-slate-900">
              {/* 24 Hourly Background Slots */}
              <div className="absolute inset-0 divide-y divide-slate-800/60">
                {hourSlots.map((slotDate) => {
                  const leftInfo = formatTimeInZone(slotDate, leftTz);
                  return (
                    <div
                      key={slotDate.toISOString()}
                      onClick={() => onSelectSlot(slotDate)}
                      className="h-[64px] relative group/slot cursor-pointer hover:bg-slate-800/30 transition-colors flex items-center px-3"
                    >
                      <div className="opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-sky-400 font-medium">
                        <Plus className="w-3 h-3" />
                        <span>Add Event at {leftInfo.hourStr} {leftInfo.ampm}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* NOW Indicator Line */}
              {isNowInGrid && nowTopPx >= 0 && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center transition-all duration-1000"
                  style={{ top: `${nowTopPx}px` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 -ml-1" />
                  <div className="h-0.5 bg-rose-500/90 flex-1 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded ml-1 shadow">
                    NOW ({formatTimeInZone(now, leftTz).timeStr})
                  </span>
                </div>
              )}

              {/* Events Layer */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {positionedEvents.map((pe) => {
                  const { event, topPx, heightPx, colIndex, maxCols } = pe;
                  const isUser1 = event.createdBy === 'user1';
                  const creatorProfile = userProfiles[event.createdBy];

                  const colWidthPercent = 100 / maxCols;
                  const leftPercent = colIndex * colWidthPercent;

                  const startLeft = formatTimeInZone(new Date(event.startTimeIso), leftTz);
                  const endMs =
                    new Date(event.startTimeIso).getTime() + (event.durationMinutes || 30) * 60000;
                  const endLeft = formatTimeInZone(new Date(endMs), leftTz);

                  const isCompact = heightPx < 42;
                  const isMedium = heightPx >= 42 && heightPx < 85;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: `${leftPercent}%`,
                        width: `calc(${colWidthPercent}% - 4px)`,
                      }}
                      className={`absolute pointer-events-auto rounded-xl border p-1.5 sm:p-2 shadow-lg transition-all hover:z-30 hover:shadow-2xl cursor-pointer flex flex-col justify-between overflow-hidden ml-0.5 ${
                        isUser1
                          ? 'bg-purple-950/90 border-purple-500/60 hover:border-purple-300 text-purple-100 ring-1 ring-purple-500/30'
                          : 'bg-indigo-950/90 border-indigo-500/60 hover:border-indigo-300 text-indigo-100 ring-1 ring-indigo-500/30'
                      }`}
                    >
                      {isCompact ? (
                        /* Short / Compact 15m-30m events */
                        <div className="flex items-center justify-between gap-1 h-full min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="text-xs font-bold text-white truncate">
                              {event.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-300/80 shrink-0">
                              {startLeft.timeStr}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[9px] font-semibold px-1 py-0.2 rounded flex items-center gap-1 ${
                                isUser1
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              <UserAvatar user={creatorProfile} size="xs" showBorder={false} />
                              <span className="truncate max-w-[50px] sm:max-w-[80px]">
                                {creatorProfile.name}
                              </span>
                            </span>
                          </div>
                        </div>
                      ) : isMedium ? (
                        /* Medium 45m-1h events */
                        <div className="flex flex-col justify-between h-full min-w-0">
                          {/* Row 1: Title & Duration */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <h4 className="text-xs font-bold text-white truncate">
                                {event.title}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-900/90 border border-slate-700/80 text-slate-200 shrink-0">
                              {formatDuration(event.durationMinutes)}
                            </span>
                          </div>

                          {/* Row 2: Time Range & User Avatar Badge */}
                          <div className="flex items-center justify-between gap-1.5 mt-auto pt-0.5">
                            <div className="text-[10px] font-mono font-medium text-slate-300/90 truncate shrink-0">
                              {startLeft.timeStr} – {endLeft.timeStr}
                            </div>

                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                                isUser1
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              <UserAvatar user={creatorProfile} size="xs" showBorder={false} />
                              <span className="truncate max-w-[60px] sm:max-w-[90px]">
                                {creatorProfile.name}
                              </span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Tall 1.5h+ events */
                        <div className="flex flex-col justify-between h-full min-w-0 space-y-1">
                          <div>
                            {/* Header: Title & Duration */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <h4 className="text-xs font-bold text-white truncate">
                                  {event.title}
                                </h4>
                              </div>
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-slate-200 shrink-0">
                                {formatDuration(event.durationMinutes)}
                              </span>
                            </div>

                            {/* Time Range */}
                            <div className="text-[10px] font-mono text-slate-300/90 mt-0.5">
                              {startLeft.timeStr} – {endLeft.timeStr}
                            </div>

                            {/* Optional Location */}
                            {event.location && heightPx >= 95 && (
                              <p className="text-[10px] text-slate-300/80 truncate mt-0.5">
                                📍 {event.location}
                              </p>
                            )}

                            {/* Optional Description */}
                            {event.description && heightPx >= 115 && (
                              <p className="text-[11px] text-slate-300/70 line-clamp-2 mt-1">
                                {event.description}
                              </p>
                            )}
                          </div>

                          {/* Footer: User Avatar & Badge */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/10 mt-auto">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                isUser1
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              <UserAvatar user={creatorProfile} size="xs" showBorder={false} />
                              <span className="truncate max-w-[80px] sm:max-w-[120px]">{creatorProfile.name}</span>
                            </span>

                            {event.location && (event.location.startsWith('http://') || event.location.startsWith('https://')) && (
                              <a
                                href={event.location}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded bg-slate-900/90 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-700 text-[10px] flex items-center gap-1 shrink-0"
                                title="Join meeting link"
                              >
                                <Video className="w-3 h-3" />
                                <span className="hidden sm:inline">Join</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Timezone Column */}
            <div className="col-span-3 sm:col-span-3 lg:col-span-2 bg-slate-900/40 divide-y divide-slate-800/80">
              {hourSlots.map((slotDate) => {
                const rightInfo = formatTimeInZone(slotDate, rightTz);
                return (
                  <div
                    key={slotDate.toISOString()}
                    className="h-[64px] p-2.5 sm:p-3 flex flex-col items-end justify-center"
                  >
                    <div className="flex items-baseline gap-1.5 font-mono text-slate-200">
                      {rightInfo.dayDiffStr && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-sans font-bold">
                          {rightInfo.dayDiffStr}
                        </span>
                      )}
                      <span className="text-sm font-bold">{rightInfo.hourStr}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {rightInfo.ampm}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate text-right">
                      {rightInfo.dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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

