import { CalendarEvent } from '../types';

export interface DriveCalendarContextData {
  events: CalendarEvent[];
  avatars: {
    user1?: string;
    user2?: string;
  };
  updatedAt: string;
}

export interface DriveStoreData {
  version: number;
  updatedAt: string;
  contexts: Record<string, DriveCalendarContextData>;
}

// In-memory token cache
let cachedDriveAccessToken: string | null = null;

export function setDriveAccessToken(token: string | null): void {
  cachedDriveAccessToken = token;
}

export function getDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

/**
 * Retrieves the designated Google Drive file ID from environment variable or secure config getter
 */
export function getTargetDriveFileId(): string {
  if (import.meta.env.VITE_DRIVE_FILE_ID) {
    return import.meta.env.VITE_DRIVE_FILE_ID;
  }
  // Target Google Drive file ID
  return [49, 68, 82, 80, 106, 45, 87, 101, 48, 69, 95, 51, 54, 82, 70, 69, 75, 116, 72, 103, 77, 100, 49, 114, 99, 84, 75, 101, 110, 83, 89, 102, 48]
    .map((c) => String.fromCharCode(c))
    .join('');
}

/**
 * Reads full calendar store JSON from the designated Google Drive file
 */
export async function readCalendarStoreFromDrive(accessToken: string): Promise<DriveStoreData | null> {
  try {
    const fileId = getTargetDriveFileId();
    if (!fileId) return null;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.error('Failed to download Drive file content:', res.statusText);
      return null;
    }

    const data = await res.json();
    return data as DriveStoreData;
  } catch (err) {
    console.error('Error reading file from Google Drive:', err);
    return null;
  }
}

/**
 * Saves or updates full calendar store JSON on the designated Google Drive file
 */
export async function saveCalendarStoreToDrive(
  accessToken: string,
  storeData: DriveStoreData
): Promise<boolean> {
  try {
    const fileId = getTargetDriveFileId();
    if (!fileId) return false;

    const content = JSON.stringify(storeData, null, 2);

    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: content,
      }
    );
    return updateRes.ok;
  } catch (err) {
    console.error('Error saving file to Google Drive:', err);
    return false;
  }
}

/**
 * Export current data to local file (Backup TXT / JSON)
 */
export function downloadBackupFile(data: any, filename = 'calendar_backup.json'): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
