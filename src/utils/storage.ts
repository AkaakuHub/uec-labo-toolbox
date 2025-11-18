import type { HistoryState, LabDiff, LabInfo, LabSnapshot } from '../types/types';

type SnapshotStore = Record<string, LabSnapshot>;

const STORAGE_KEY = 'lab-compass:snapshots';

function readStore(): SnapshotStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SnapshotStore;
    return parsed ?? {};
  } catch (error) {
    console.warn('[Lab Compass] snapshot load failed', error);
    return {};
  }
}

function writeStore(store: SnapshotStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('[Lab Compass] snapshot save failed', error);
  }
}

export function createSnapshot(labs: LabInfo[]): LabSnapshot {
  return {
    timestamp: Date.now(),
    labs: labs.map((lab) => ({
      name: lab.name,
      firstChoicePrimary: lab.firstChoicePrimary,
      firstChoiceTotal: lab.firstChoiceTotal,
    })),
  };
}

export function loadSnapshot(programKey: string): LabSnapshot | null {
  const store = readStore();
  return store[programKey] ?? null;
}

export function saveSnapshot(programKey: string, snapshot: LabSnapshot): void {
  const store = readStore();
  store[programKey] = snapshot;
  writeStore(store);
}

export function computeDiff(previous: LabSnapshot | null, current: LabSnapshot): HistoryState {
  const diffMap = new Map<string, LabDiff>();
  if (previous) {
    const prevMap = new Map(previous.labs.map((lab) => [lab.name, lab]));
    current.labs.forEach((lab) => {
      const prev = prevMap.get(lab.name);
      const primaryDiff = lab.firstChoicePrimary - (prev?.firstChoicePrimary ?? 0);
      const totalDiff = lab.firstChoiceTotal - (prev?.firstChoiceTotal ?? 0);
      if (primaryDiff !== 0 || totalDiff !== 0) {
        diffMap.set(lab.name, {
          firstChoicePrimary: primaryDiff,
          firstChoiceTotal: totalDiff,
        });
      }
    });
  }
  return {
    diffMap,
    previousTimestamp: previous?.timestamp ?? null,
    changedLabs: diffMap.size,
  };
}
