import './styles.css';

import {
  aggregatePrograms,
  collectSummaryRows,
  findStudentPreferences,
  parseLabApplicantNames,
  parseLabSummaries,
  parseStudentChoiceMap,
  parseProgramSummary,
  parseStudentInfo,
} from './parser';
import { applyEnhancements } from './ui';
import type { StudentInfo } from '../types/types';
import { computeDiff, createSnapshot, loadSnapshot, saveSnapshot } from '../utils/storage';

export function initLabCompass(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}

function run() {
  const labs = parseLabSummaries(document);
  if (!labs.length) return;

  let student: StudentInfo | null = parseStudentInfo(document);
  if (student) {
    const preferences = findStudentPreferences(document, student.studentId);
    student = { ...student, preferences };
  }

  const programSummary = parseProgramSummary(document);
  const rowMap = collectSummaryRows(document);
  const detailMap = parseLabApplicantNames(document);
  const programStats = aggregatePrograms(labs);
  const studentChoices = parseStudentChoiceMap(document);

  const snapshotKey = student?.program ?? 'GLOBAL';
  const previousSnapshot = loadSnapshot(snapshotKey);
  const currentSnapshot = createSnapshot(labs);
  const history = computeDiff(previousSnapshot, currentSnapshot);
  saveSnapshot(snapshotKey, currentSnapshot);

  applyEnhancements({
    labs,
    labDetails: detailMap,
    rowMap,
    student,
    programSummary,
    programStats,
    studentChoices,
    history,
  });
  console.info('[Lab Compass] 拡張UIを適用しました。');
}
