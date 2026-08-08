import React, { useState } from 'react';
import { X, Share2, Copy, Check, Globe, User, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  leftTz: string;
  rightTz: string;
  user1: string;
  user2: string;
  img1?: string;
  img2?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  leftTz,
  rightTz,
  user1,
  user2,
  img1,
  img2,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build full URL with query parameters
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const params = new URLSearchParams();
  params.set('tz1', leftTz);
  params.set('tz2', rightTz);
  params.set('user1', user1);
  params.set('user2', user2);
  if (img1) params.set('img1', img1);
  if (img2) params.set('img2', img2);

  const shareableUrl = `${baseUrl}?${params.toString()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Share Calendar Configuration</h3>
                <p className="text-xs text-slate-400">
                  Generates a custom URL pre-configured with timezones & user identities
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

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-5 text-slate-200">
            {/* Encoded Preset Preview Badges */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Parameters Encoded in Link:
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2 text-purple-300">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Left: {leftTz.split('/')[1] || leftTz}</span>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2 text-indigo-300">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Right: {rightTz.split('/')[1] || rightTz}</span>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2 text-slate-300">
                  {img1 ? (
                    <img src={img1} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 border border-purple-400" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  )}
                  <span className="truncate">User 1: {user1}</span>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2 text-slate-300">
                  {img2 ? (
                    <img src={img2} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 border border-indigo-400" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  )}
                  <span className="truncate">User 2: {user2}</span>
                </div>
              </div>
            </div>

            {/* Generated Link Display */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Shareable Link</span>
              </label>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 break-all select-all">
                {shareableUrl}
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`w-full py-3 px-4 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Shareable Link</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
