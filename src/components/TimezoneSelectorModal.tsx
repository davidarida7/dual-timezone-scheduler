import React, { useState } from 'react';
import { COMMON_TIMEZONES, isValidIanaTimeZone } from '../lib/timeUtils';
import { X, Search, Globe, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimezoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSide: 'left' | 'right';
  currentTz: string;
  onSelectTz: (newTz: string) => void;
}

export const TimezoneSelectorModal: React.FC<TimezoneSelectorModalProps> = ({
  isOpen,
  onClose,
  targetSide,
  currentTz,
  onSelectTz,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customTzInput, setCustomTzInput] = useState('');
  const [customError, setCustomError] = useState('');

  if (!isOpen) return null;

  const filteredTimezones = COMMON_TIMEZONES.filter(
    (tz) =>
      tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tz.iananame.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tz.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApplyCustom = () => {
    const trimmed = customTzInput.trim();
    if (!trimmed) return;
    if (isValidIanaTimeZone(trimmed)) {
      onSelectTz(trimmed);
      onClose();
    } else {
      setCustomError('Invalid IANA Time Zone string (e.g., America/New_York)');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Globe className={`w-5 h-5 ${targetSide === 'left' ? 'text-purple-400' : 'text-indigo-400'}`} />
              <h3 className="text-base font-bold text-white capitalize">
                Select {targetSide} Timezone
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search location or timezone..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                autoFocus
              />
            </div>
          </div>

          {/* Preset List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-800/50">
            {filteredTimezones.map((tz) => {
              const isSelected = tz.iananame === currentTz;
              return (
                <button
                  key={tz.iananame}
                  onClick={() => {
                    onSelectTz(tz.iananame);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? targetSide === 'left'
                        ? 'bg-purple-500/15 border border-purple-500/40 text-purple-200'
                        : 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-200'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{tz.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tz.iananame}</div>
                  </div>

                  {isSelected && <Check className={`w-4 h-4 shrink-0 ${targetSide === 'left' ? 'text-purple-400' : 'text-indigo-400'}`} />}
                </button>
              );
            })}

            {filteredTimezones.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching preset timezones found. You can type a custom IANA zone below.
              </div>
            )}
          </div>

          {/* Custom IANA input fallback */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Or type custom IANA string:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTzInput}
                onChange={(e) => {
                  setCustomTzInput(e.target.value);
                  setCustomError('');
                }}
                placeholder="e.g. Europe/Rome or Asia/Seoul"
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 cursor-pointer"
              >
                Apply
              </button>
            </div>
            {customError && (
              <p className="text-[10px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{customError}</span>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
