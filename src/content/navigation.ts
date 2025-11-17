import type { StudentChoiceSummary } from '../types/types';

// グローバル変数で必要なデータを保持
let globalRowMap: Map<string, HTMLTableRowElement[]> = new Map();
let globalStudentChoices: Map<string, StudentChoiceSummary> = new Map();
let currentHighlightTimeout: number | null = null;

/**
 * ナビゲーション機能を初期化する
 */
export function setupNavigationListeners(
  rowMap: Map<string, HTMLTableRowElement[]>,
  studentChoices: Map<string, StudentChoiceSummary>
): void {
  globalRowMap = rowMap;
  globalStudentChoices = studentChoices;

  // 確定学生トークンへのクリックイベントを設定（イベントデリゲート）
  document.addEventListener('click', handleDocumentClick);
}

/**
 * ドキュメント全体のクリックイベントを処理
 */
function handleDocumentClick(event: Event): void {
  const target = event.target as HTMLElement;

  // 確定学生トークン（豪華なスタイル）がクリックされたかチェック
  const confirmedToken = target.closest('.labx-student-confirmed-assignment');
  if (confirmedToken) {
    event.preventDefault();
    event.stopPropagation();

    // 現在表示中のツールチップを非表示
    hideTooltip();

    handleConfirmedStudentClick(confirmedToken as HTMLElement);
    return;
  }

  // グレーアウトした学生トークンがクリックされたかチェック
  const grayedToken = target.closest('.labx-student-confirmed-first-choice');
  if (grayedToken) {
    event.preventDefault();
    event.stopPropagation();

    // 現在表示中のツールチップを非表示
    hideTooltip();

    handleGrayedStudentClick(grayedToken as HTMLElement);
  }
}

/**
 * 確定学生がクリックされたときの処理
 */
function handleConfirmedStudentClick(token: HTMLElement): void {
  const studentId = token.dataset.labxStudent;
  const preference = token.dataset.preference ? parseInt(token.dataset.preference) as 1 | 2 | 3 : null;

  if (!studentId || !preference) return;

  const studentInfo = globalStudentChoices.get(studentId);
  if (!studentInfo || studentInfo.confirmed !== preference) return;

  // 配属確定した研究室名を取得
  let assignedLab: string | undefined;

  if (preference === 1 && studentInfo.first.length > 0) {
    assignedLab = studentInfo.first[0];
  } else if (preference === 2 && studentInfo.second.length > 0) {
    assignedLab = studentInfo.second[0];
  } else if (preference === 3 && studentInfo.third.length > 0) {
    assignedLab = studentInfo.third[0];
  }

  if (assignedLab) {
    navigateToLab(assignedLab);
  }
}

/**
 * グレーアウトした学生がクリックされたときの処理
 */
function handleGrayedStudentClick(token: HTMLElement): void {
  const studentId = token.dataset.labxStudent;

  if (!studentId) return;

  const studentInfo = globalStudentChoices.get(studentId);
  if (!studentInfo || !studentInfo.confirmed) return;

  // 配属確定した研究室名を取得
  let assignedLab: string | undefined;
  const confirmedPreference = studentInfo.confirmed;

  if (confirmedPreference === 1 && studentInfo.first.length > 0) {
    assignedLab = studentInfo.first[0];
  } else if (confirmedPreference === 2 && studentInfo.second.length > 0) {
    assignedLab = studentInfo.second[0];
  } else if (confirmedPreference === 3 && studentInfo.third.length > 0) {
    assignedLab = studentInfo.third[0];
  }

  if (assignedLab) {
    navigateToLab(assignedLab);
  }
}

/**
 * 指定された研究室の行にナビゲートする
 */
function navigateToLab(labName: string): void {
  const labRows = globalRowMap.get(labName);

  if (!labRows || labRows.length === 0) {
    console.warn(`研究室 "${labName}" の行が見つかりませんでした`);
    return;
  }

  // 最初の行をターゲットに
  const targetRow = labRows[0];

  // 既存のハイライトをクリア
  clearHighlight();

  // スムーズスクロール
  targetRow.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });

  // ハイライト表示（少し遅延してスクロール後に実行）
  setTimeout(() => {
    highlightLabRow(targetRow);
  }, 500);
}

/**
 * 研究室行をハイライト表示する
 */
function highlightLabRow(row: HTMLTableRowElement): void {
  row.classList.add('labx-row-highlight');

  // 3秒後にハイライトを自動クリア
  currentHighlightTimeout = window.setTimeout(() => {
    clearHighlight();
  }, 3000);
}

/**
 * ハイライトをクリアする
 */
function clearHighlight(): void {
  if (currentHighlightTimeout !== null) {
    clearTimeout(currentHighlightTimeout);
    currentHighlightTimeout = null;
  }

  const highlightedRows = document.querySelectorAll('.labx-row-highlight');
  highlightedRows.forEach(row => {
    row.classList.remove('labx-row-highlight');
  });
}

/**
 * ツールチップを非表示にする（ui.tsの関数を呼び出す）
 * Note: ui.tsのツールチップ関数にアクセスするための簡易的な実装
 */
function hideTooltip(): void {
  const tooltip = document.querySelector('#labx-tooltip') as HTMLElement;
  if (tooltip) {
    tooltip.classList.remove('is-visible');
  }
}