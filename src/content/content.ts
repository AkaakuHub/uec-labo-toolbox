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
  identifyConfirmedFirstChoiceAssignments,
} from './parser';
import { applyEnhancements } from './ui';
import { setupNavigationListeners } from './navigation';
import type { StudentInfo } from '../types/types';

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

  // 第1希望で配属確定した学生を特定
  identifyConfirmedFirstChoiceAssignments(studentChoices, labs);

  applyEnhancements({
    labs,
    labDetails: detailMap,
    rowMap,
    student,
    programSummary,
    programStats,
    studentChoices,
  });

  // ナビゲーション機能を初期化
  setupNavigationListeners(rowMap, studentChoices);

  console.info('[Lab Compass] 拡張UIを適用しました。');
}
