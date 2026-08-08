import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface UserAvatarProps {
  user: UserProfile;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeMap = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm font-bold',
  xl: 'w-10 h-10 text-base font-bold',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'sm',
  className = '',
  showBorder = true,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [user.avatarUrl]);

  const isUser1 = user.id === 'user1';

  const firstLetter = (user.name || '?').trim().charAt(0).toUpperCase() || '?';

  const sizeClass = sizeMap[size] || sizeMap.sm;

  const borderClass = showBorder
    ? isUser1
      ? 'border border-purple-400/80 shadow-sm'
      : 'border border-indigo-400/80 shadow-sm'
    : '';

  const fallbackBgClass = isUser1
    ? 'bg-purple-600 text-white font-bold'
    : 'bg-indigo-600 text-white font-bold';

  if (user.avatarUrl && !hasError) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${borderClass} ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 uppercase select-none ${fallbackBgClass} ${borderClass} ${className}`}
      title={user.name}
    >
      {firstLetter}
    </div>
  );
};
