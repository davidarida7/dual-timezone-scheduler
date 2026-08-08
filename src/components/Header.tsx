import React from 'react';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import {
  Share2,
  Plus,
  User,
  Globe,
  ChevronDown,
  CalendarDays,
  Camera,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  activeUser: 'user1' | 'user2';
  userProfiles: Record<'user1' | 'user2', UserProfile>;
  onSelectActiveUser: (user: 'user1' | 'user2') => void;
  leftTz: string;
  rightTz: string;
  onOpenLeftTzModal: () => void;
  onOpenRightTzModal: () => void;
  onOpenNewEventModal: () => void;
  onOpenShareModal: () => void;
  onOpenAvatarModal: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  activeUser,
  userProfiles,
  onSelectActiveUser,
  leftTz,
  rightTz,
  onOpenLeftTzModal,
  onOpenRightTzModal,
  onOpenNewEventModal,
  onOpenShareModal,
  onOpenAvatarModal,
  syncStatus = 'synced',
}) => {
  const formatTzLabel = (tz: string) => {
    const parts = tz.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 lg:px-8 py-3.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Left: Branding & App Title */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Dual-Timezone 24h Scheduler
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700 font-mono">
                  Calendar
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${
                    syncStatus === 'syncing'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  }`}
                  title="Zero-Key Server Persistence & Cross-Device Live Sync"
                >
                  {syncStatus === 'syncing' ? (
                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  ) : (
                    <CloudCheck className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Live Synced'}</span>
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Synchronized 24-hour timeline across two global locations
              </p>
            </div>
          </div>
        </div>

        {/* Center: User Identity Selector & Avatar Upload */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>I am:</span>
          </div>

          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/80 gap-1">
            <button
              onClick={() => onSelectActiveUser('user1')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeUser === 'user1'
                  ? 'bg-purple-500 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserAvatar user={userProfiles.user1} size="sm" showBorder={activeUser !== 'user1'} />
              <span>{userProfiles.user1.name}</span>
            </button>

            <button
              onClick={() => onSelectActiveUser('user2')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeUser === 'user2'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserAvatar user={userProfiles.user2} size="sm" showBorder={activeUser !== 'user2'} />
              <span>{userProfiles.user2.name}</span>
            </button>
          </div>

          <button
            onClick={onOpenAvatarModal}
            className="p-1.5 text-slate-400 hover:text-sky-300 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1 text-xs px-2"
            title="Upload or Change Avatars"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline font-medium">Upload Image</span>
          </button>
        </div>

        {/* Right: Timezone quick buttons & Share/New Event */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
          {/* Timezone Badges */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLeftTzModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 text-xs font-medium text-purple-300 transition-colors cursor-pointer"
              title="Change Left Timezone"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold">Left: {formatTzLabel(leftTz)}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            <button
              onClick={onOpenRightTzModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition-colors cursor-pointer"
              title="Change Right Timezone"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">Right: {formatTzLabel(rightTz)}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenShareModal}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Share Preset Link"
            >
              <Share2 className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={onOpenNewEventModal}
              className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
