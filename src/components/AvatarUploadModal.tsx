import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { X, Upload, Trash2, Camera, Link as LinkIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfiles: Record<'user1' | 'user2', UserProfile>;
  onUpdateAvatar: (userId: 'user1' | 'user2', avatarUrl: string | undefined) => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  onClose,
  userProfiles,
  onUpdateAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<'user1' | 'user2'>('user1');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentUser = userProfiles[activeTab];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string;
      if (!rawResult) return;

      const img = new Image();
      img.onload = () => {
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          onUpdateAvatar(activeTab, compressed);
        } else {
          onUpdateAvatar(activeTab, rawResult);
        }
        setUrlInput('');
      };
      img.onerror = () => {
        onUpdateAvatar(activeTab, rawResult);
        setUrlInput('');
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);

    // reset input
    if (e.target) e.target.value = '';
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onUpdateAvatar(activeTab, trimmed);
    setUrlInput('');
  };

  const handleRemovePhoto = () => {
    onUpdateAvatar(activeTab, undefined);
    setUrlInput('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">User Avatar Settings</h3>
                <p className="text-xs text-slate-400">Upload or change profile pictures</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Select Tabs */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex gap-2">
            <button
              onClick={() => {
                setActiveTab('user1');
                setUrlInput('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'user1'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <UserAvatar user={userProfiles.user1} size="xs" showBorder={false} />
              <span>{userProfiles.user1.name}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('user2');
                setUrlInput('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'user2'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <UserAvatar user={userProfiles.user2} size="xs" showBorder={false} />
              <span>{userProfiles.user2.name}</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative group">
                <UserAvatar user={currentUser} size="xl" className="w-24 h-24 text-2xl shadow-xl" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-full shadow-lg border-2 border-slate-900 transition-transform active:scale-90 cursor-pointer"
                  title="Upload New Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center">
                <h4 className="text-sm font-bold text-white">{currentUser.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentUser.avatarUrl
                    ? 'Custom image uploaded & persisted'
                    : 'Showing fallback initial avatar'}
                </p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/20 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Image File from Device</span>
              </button>

              {/* Paste URL option */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Or Paste Image URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    onClick={handleApplyUrl}
                    disabled={!urlInput.trim()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              {/* Remove photo option if custom avatar exists */}
              {currentUser.avatarUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo (Use Initial Letter Avatar)</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
