export const STORAGE_KEYS = {
  solvedDsaIds: 'solvedDsaIds',
  bookmarkedDsaIds: 'bookmarkedDsaIds',
  solvedSqlIds: 'solvedSqlIds',
  bookmarkedSqlIds: 'bookmarkedSqlIds',
  studyMeta: 'studyMeta',
} as const;

export interface StudyMeta {
  studyDays: string[];
}

const defaultStudyMeta: StudyMeta = {
  studyDays: [],
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const dedupeStrings = (items: string[]) => Array.from(new Set(items));

export const readJson = <T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (validate && !validate(parsed)) {
      return fallback;
    }
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readText = (key: string, fallback = '') => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return window.localStorage.getItem(key) ?? fallback;
};

export const writeText = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
};

export const removeStoredValue = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
};

export const readStringArray = (key: string) =>
  dedupeStrings(readJson<string[]>(key, [], isStringArray));

const isStudyMeta = (value: unknown): value is StudyMeta => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeMeta = value as StudyMeta;
  return isStringArray(maybeMeta.studyDays);
};

export const readStudyMeta = () => {
  const studyMeta = readJson(STORAGE_KEYS.studyMeta, defaultStudyMeta, isStudyMeta);
  return {
    studyDays: dedupeStrings(studyMeta.studyDays).sort(),
  };
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayKey = () => toDateKey(new Date());

const shiftDateKey = (dateKey: string, offset: number) => {
  const shiftedDate = new Date(`${dateKey}T00:00:00`);
  shiftedDate.setDate(shiftedDate.getDate() + offset);
  return toDateKey(shiftedDate);
};

export const markStudyDay = (studyDays: string[], day = getTodayKey()) =>
  dedupeStrings([...studyDays, day]).sort();

export const calculateCurrentStreak = (studyDays: string[]) => {
  if (studyDays.length === 0) {
    return 0;
  }

  const uniqueDays = dedupeStrings(studyDays).sort();
  const studyDaySet = new Set(uniqueDays);
  const today = getTodayKey();
  const yesterday = shiftDateKey(today, -1);

  const latestDay = uniqueDays[uniqueDays.length - 1];
  let anchorDay: string | null = null;

  if (studyDaySet.has(today)) {
    anchorDay = today;
  } else if (studyDaySet.has(yesterday)) {
    anchorDay = yesterday;
  } else if (latestDay) {
    anchorDay = latestDay;
  }

  if (!anchorDay) {
    return 0;
  }

  if (anchorDay !== today && anchorDay !== yesterday) {
    return 0;
  }

  let streak = 0;
  let cursor = anchorDay;

  while (studyDaySet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
};
