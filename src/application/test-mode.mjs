const DISABLE_VOICE_ANNOUNCEMENTS_KEY = 'dungeon-rogue-disable-voice-announcements';

export function getDisableVoiceAnnouncementsStorageKey() {
  return DISABLE_VOICE_ANNOUNCEMENTS_KEY;
}

export function areVoiceAnnouncementsForcedOff() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (window.__DUNGEON_ROGUE_DISABLE_VOICE_ANNOUNCEMENTS__ === true) {
      return true;
    }
  } catch {}

  try {
    return window.localStorage?.getItem(DISABLE_VOICE_ANNOUNCEMENTS_KEY) === '1';
  } catch {
    return false;
  }
}
