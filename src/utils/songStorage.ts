export interface SavedSong {
  id: string;
  title: string;
  dsl: string;
  key: string;
  bpm: number;
  timeSignature: string;
  updatedAt: number;
}

const STORAGE_KEY = 'textToChord_saved_songs';
const LAST_ACTIVE_ID_KEY = 'textToChord_last_active_song_id';

export function loadSavedSongs(): SavedSong[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error('Failed to parse saved songs from localStorage', e);
  }
  return [];
}

export function saveSongToStorage(song: {
  id?: string | null;
  title: string;
  dsl: string;
  key: string;
  bpm: number;
  timeSignature: string;
}): SavedSong {
  const songs = loadSavedSongs();
  const title = song.title.trim() || '無題の楽曲';
  // Use existing ID, or find by title, or generate new ID
  let targetId = song.id;
  if (!targetId) {
    const byTitle = songs.find((s) => s.title.toLowerCase() === title.toLowerCase());
    targetId = byTitle ? byTitle.id : `song_${Date.now()}`;
  }

  const updatedSong: SavedSong = {
    id: targetId,
    title,
    dsl: song.dsl,
    key: song.key,
    bpm: song.bpm,
    timeSignature: song.timeSignature,
    updatedAt: Date.now(),
  };

  const existingIdx = songs.findIndex((s) => s.id === targetId);
  if (existingIdx >= 0) {
    songs[existingIdx] = updatedSong;
  } else {
    songs.unshift(updatedSong);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    localStorage.setItem(LAST_ACTIVE_ID_KEY, updatedSong.id);
  } catch (e) {
    console.error('Failed to save song to localStorage', e);
  }

  return updatedSong;
}

export function deleteSavedSong(id: string): SavedSong[] {
  const songs = loadSavedSongs().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    if (localStorage.getItem(LAST_ACTIVE_ID_KEY) === id) {
      localStorage.removeItem(LAST_ACTIVE_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to delete saved song', e);
  }
  return songs;
}

export function getLastActiveSongId(): string | null {
  return localStorage.getItem(LAST_ACTIVE_ID_KEY);
}
