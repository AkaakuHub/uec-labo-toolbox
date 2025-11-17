import type {
  LabApplicantNames,
  LabInfo,
  ProgramAggregate,
  ProgramSummary,
  StudentChoiceSummary,
  StudentInfo,
} from '../types/types';

interface EnhancementContext {
  labs: LabInfo[];
  labDetails: Map<string, LabApplicantNames>;
  rowMap: Map<string, HTMLTableRowElement[]>;
  student: StudentInfo | null;
  programSummary?: ProgramSummary | null;
  programStats: ProgramAggregate[];
  studentChoices: Map<string, StudentChoiceSummary>;
}

let studentChoiceLookup: Map<string, StudentChoiceSummary> = new Map();
let hoverHandlersBound = false;
let tooltipEl: HTMLDivElement | null = null;

export function applyEnhancements(ctx: EnhancementContext) {
  studentChoiceLookup = ctx.studentChoices;
  modernizeTables();
  paintProgramSummary(ctx.programSummary, ctx.programStats);
  decorateSummaryRows(ctx.rowMap, ctx.labs, ctx.labDetails, ctx.student, ctx.studentChoices);
  tagDetailTables(ctx.studentChoices, ctx.student);
  setupStudentHoverSync();
}

function modernizeTables() {
  const tables = Array.from(document.querySelectorAll('table[border]'));
  tables.forEach((table) => {
    table.classList.add('labx-table');
  });
}

function paintProgramSummary(summary?: ProgramSummary | null, stats: ProgramAggregate[] = []) {
  const baseTable = document.querySelector('dl table');
  if (!baseTable || baseTable.closest('.labx-info-panel')) return;
  const container = document.createElement('div');
  container.className = 'labx-info-panel';

  const totalCapacity = summary?.capacity ?? stats.reduce((acc, item) => acc + item.capacity, 0);
  const totalApplicants = summary?.applicants ?? stats.reduce((acc, item) => acc + item.applicants, 0);
  const remaining = Math.max(totalCapacity - totalApplicants, 0);
  const registered = summary?.registered ?? null;

  const overview = document.createElement('div');
  overview.className = 'labx-info-overview';
  overview.innerHTML = `
    <div>
      <p class="labx-info-label">残り席数</p>
      <p class="labx-info-value">${remaining}</p>
    </div>
    <div>
      <p class="labx-info-label">第1希望合計</p>
      <p class="labx-info-value">${totalApplicants}</p>
    </div>
    ${
      registered !== null
        ? `<div><p class="labx-info-label">登録済み</p><p class="labx-info-value">${registered}</p></div>`
        : ''
    }
  `;

  const list = document.createElement('div');
  list.className = 'labx-program-list';
  stats.forEach((program) => {
    const item = document.createElement('div');
    item.className = 'labx-program-item';
    const ratio = program.capacity > 0 ? (program.applicants / program.capacity) * 100 : 0;
    item.innerHTML = `
      <div class="labx-program-title">${program.program}</div>
      <div class="labx-program-metrics">
        <span>第1希望 ${program.applicants}</span>
        <span>定員 ${program.capacity}</span>
        <span class="labx-program-remaining">残り ${Math.max(program.remaining, 0)}</span>
      </div>
      <div class="labx-progress-shell">
        <div class="labx-progress-segment" style="width:${Math.min(ratio, 100).toFixed(1)}%"></div>
      </div>
    `;
    list.appendChild(item);
  });

  container.append(overview, list);
  baseTable.insertAdjacentElement('afterend', container);
}

function decorateSummaryRows(
  rowMap: Map<string, HTMLTableRowElement[]>,
  labs: LabInfo[],
  detailMap: Map<string, LabApplicantNames>,
  student: StudentInfo | null,
  studentChoices: Map<string, StudentChoiceSummary>,
) {
  const labMap = new Map(labs.map((lab) => [lab.name, lab]));
  rowMap.forEach((rows, labName) => {
    const info = labMap.get(labName);
    if (!info) return;
    const applicants = detailMap.get(labName);
    rows.forEach((row) => {
      row.classList.add('labx-row', `labx-status-${info.status}`);
      if (student?.preferences?.some((pref) => pref.labName === labName)) {
        row.classList.add('labx-row-self');
      }
      annotateLabCell(row, info);
      annotateCapacityCell(row, info);
      annotatePreferenceCell(row.cells.item(2), applicants?.first ?? [], student, studentChoices, 1);
      annotatePreferenceCell(row.cells.item(3), applicants?.second ?? [], student, studentChoices, 2);
      annotatePreferenceCell(row.cells.item(4), applicants?.third ?? [], student, studentChoices, 3);
    });
  });
}

function annotateLabCell(row: HTMLTableRowElement, info: LabInfo) {
  const cell = row.cells.item(0);
  if (!cell || cell.querySelector('[data-labx-status]')) return;
  const badge = document.createElement('span');
  badge.dataset.labxStatus = '1';
  badge.className = 'labx-status-chip';
  const label = statusLabel(info.status);
  badge.textContent = `${label.emoji} ${label.text}`;
  const ratio = document.createElement('span');
  ratio.className = 'labx-ratio-chip';
  ratio.textContent = `第1希望 ${info.competitionRate.toFixed(2)}倍`;
  const wrap = document.createElement('div');
  wrap.className = 'labx-lab-meta';
  wrap.append(badge, ratio);
  cell.appendChild(wrap);
}

function annotateCapacityCell(row: HTMLTableRowElement, info: LabInfo) {
  const cell = row.cells.item(1) ?? row.cells.item(0);
  if (!cell || cell.querySelector('[data-labx-capacity]')) return;
  const wrapper = document.createElement('div');
  wrapper.dataset.labxCapacity = '1';
  wrapper.className = 'labx-capacity-block';
  const bar = document.createElement('div');
  bar.className = 'labx-progress-shell';
  const ratio = info.primaryCapacity > 0 ? (info.firstChoicePrimary / info.primaryCapacity) * 100 : 0;
  const fill = document.createElement('div');
  fill.className = 'labx-progress-segment';
  fill.style.width = `${Math.min(ratio, 120)}%`;
  bar.appendChild(fill);
  const caption = document.createElement('p');
  caption.className = 'labx-capacity-caption';
  caption.textContent = `第1希望(3年) ${info.firstChoicePrimary} / 枠 ${info.primaryCapacity}`;
  const totalLine = document.createElement('p');
  totalLine.className = 'labx-capacity-subtext';
  totalLine.textContent = `全希望 ${info.firstChoiceTotal} / 定員 ${info.capacity.total}`;
  wrapper.append(bar, caption, totalLine);
  cell.appendChild(wrapper);
}

function annotatePreferenceCell(
  cell: HTMLTableCellElement | null,
  names: string[],
  student: StudentInfo | null,
  studentChoices: Map<string, StudentChoiceSummary>,
  preference: 1 | 2 | 3
) {
  if (!cell || cell.querySelector('[data-labx-chip-container]') || !names.length) return;
  const container = document.createElement('div');
  container.dataset.labxChipContainer = '1';
  container.className = 'labx-student-chips';
  names.forEach((entry) => {
    const token = createStudentToken(entry, 'chip', student?.studentId, studentChoices, preference);
    container.appendChild(token);
  });
  cell.appendChild(container);
}

function tagDetailTables(
  studentChoices: Map<string, StudentChoiceSummary>,
  student: StudentInfo | null
) {
  const tables = Array.from(document.querySelectorAll('table')).filter((table) => isDetailTable(table));
  tables.forEach((table) => {
    const header = table.querySelector('tr');
    const headerCells = Array.from(header?.querySelectorAll('th') || []);

    // 列の希望順位を特定
    const columnPreferences: (1 | 2 | 3)[] = [];
    headerCells.forEach((cell, index) => {
      if (index === 0) return; // 研究室名列はスキップ
      const text = cell.textContent?.trim() || '';
      if (text.includes('第1希望')) columnPreferences.push(1);
      else if (text.includes('第2希望')) columnPreferences.push(2);
      else if (text.includes('第3希望')) columnPreferences.push(3);
    });

    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td')).slice(1);
      cells.forEach((cell, cellIndex) => {
        const entries = extractEntries(cell);
        if (!entries.length) return;
        cell.innerHTML = '';
        const preference = columnPreferences[cellIndex] || 1; // デフォルトは第1希望
        entries.forEach((entry, entryIndex) => {
          const pill = createStudentToken(entry, 'pill', student?.studentId, studentChoices, preference);
          cell.appendChild(pill);
          if (entryIndex < entries.length - 1) {
            cell.appendChild(document.createElement('br'));
          }
        });
      });
    });
  });
}

function setupStudentHoverSync() {
  if (hoverHandlersBound) return;
  document.addEventListener('pointerover', handleStudentPointerOver);
  document.addEventListener('pointerout', handleStudentPointerOut);
  hoverHandlersBound = true;
}

function handleStudentPointerOver(event: PointerEvent) {
  const target = (event.target as HTMLElement | null)?.closest('[data-labx-student]') as HTMLElement | null;
  if (!target) return;
  const id = target.dataset.labxStudent;
  if (!id) return;
  toggleStudentHighlight(id, true);
  const summary = studentChoiceLookup.get(id);
  if (summary) {
    showTooltip(summary, event);
  }
}

function handleStudentPointerOut(event: PointerEvent) {
  const target = (event.target as HTMLElement | null)?.closest('[data-labx-student]') as HTMLElement | null;
  if (!target) return;
  const id = target.dataset.labxStudent;
  if (!id) return;
  const related = (event.relatedTarget as HTMLElement | null)?.closest('[data-labx-student]') as HTMLElement | null;
  if (related && related.dataset.labxStudent === id) return;
  toggleStudentHighlight(id, false);
  hideTooltip();
}

function toggleStudentHighlight(studentId: string, active: boolean) {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-labx-student="${studentId}"]`);
  nodes.forEach((node) => {
    node.classList.toggle('labx-student-active', active);
  });
}

function showTooltip(summary: StudentChoiceSummary, event: PointerEvent) {
  const tooltip = ensureTooltip();
  const first = formatChoiceLine('第1希望', summary.first, summary.confirmed === 1);
  const second = formatChoiceLine('第2希望', summary.second, summary.confirmed === 2);
  const third = formatChoiceLine('第3希望', summary.third, summary.confirmed === 3);
  tooltip.innerHTML = `
    <div class="labx-tooltip-name">${summary.name}</div>
    ${summary.program ? `<div class="labx-tooltip-program">${summary.program}</div>` : ''}
    <div class="labx-tooltip-line">${first}</div>
    <div class="labx-tooltip-line">${second}</div>
    <div class="labx-tooltip-line">${third}</div>
    ${summary.confirmed ? `<div class="labx-tooltip-confirmed">✓ 配属確定 (${summary.confirmed}希望)</div>` : ''}
  `;
  tooltip.style.left = `${event.clientX + 18 + window.scrollX}px`;
  tooltip.style.top = `${event.clientY + 18 + window.scrollY}px`;
  tooltip.classList.add('is-visible');
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.classList.remove('is-visible');
  }
}

function ensureTooltip(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'labx-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function formatChoiceLine(label: string, labs: string[], isConfirmed: boolean = false): string {
  if (!labs.length) return `${label}: 未登録`;

  if (isConfirmed && labs.length === 1) {
    // 配属確定した研究室をハイライト
    return `${label}: <span class="labx-tooltip-confirmed-lab">${labs[0]} ✓</span>`;
  }

  return `${label}: ${labs.join(' / ')}`;
}

function extractEntries(cell: HTMLTableCellElement): string[] {
  return (cell.innerHTML || '')
    .split(/<br\s*\/?\s*>/gi)
    .flatMap((chunk) => chunk.split(/\n/))
    .map((piece) => piece.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function createStudentToken(
  entry: string,
  variant: 'chip' | 'pill',
  currentId: string | undefined,
  studentChoices: Map<string, StudentChoiceSummary>,
  preference: 1 | 2 | 3
): HTMLElement {
  const token = document.createElement('span');
  const { studentId, name, program } = parseStudentEntry(entry);
  const summary = studentId ? studentChoices.get(studentId) : undefined;
  if (studentId) {
    token.dataset.labxStudent = studentId;
  }
  token.className = variant === 'chip' ? 'labx-student-chip' : 'labx-student-pill';

  // 第1希望で配属確定した学生の第2・第3希望をグレーアウト
  if (studentId && studentChoices.get(studentId)?.confirmed === 1 && preference > 1) {
    token.classList.add('labx-student-confirmed-first-choice');
  }

  if (studentId) {
    const idNode = document.createElement('span');
    idNode.className = 'labx-student-id';
    idNode.textContent = studentId;
    const nameNode = document.createElement('span');
    nameNode.className = 'labx-student-name';
    nameNode.textContent = summary?.name ?? name ?? '';
    token.append(idNode, nameNode);
    if (summary?.program || program) {
      const programNode = document.createElement('span');
      programNode.className = 'labx-student-program';
      programNode.textContent = summary?.program ?? program ?? '';
      token.appendChild(programNode);
    }
  } else {
    token.textContent = name ?? entry;
  }
  if (currentId && studentId === currentId) {
    token.classList.add('labx-student-self');
  }
  return token;
}

function parseStudentEntry(entry: string): { studentId: string | null; name: string; program?: string } {
  const segments = entry.split(':');
  const firstSegment = segments[0]?.trim() ?? '';
  const idMatch = firstSegment.match(/\d{6,}/);
  const studentId = idMatch ? idMatch[0] : null;
  const remainder = segments.slice(studentId ? 1 : 0).join(':').trim() || firstSegment;
  const programMatch = remainder.match(/\(([^)]+)\)/);
  const name = remainder.replace(/\([^)]*\)/g, '').trim() || remainder;
  return {
    studentId,
    name,
    program: programMatch ? programMatch[1].trim() : undefined,
  };
}

function isDetailTable(table: HTMLTableElement): boolean {
  const header = table.querySelector('tr');
  if (!header) return false;
  const headerCells = Array.from(header.querySelectorAll('th'));
  if (headerCells.length !== 4) return false;
  return headerCells.some((cell) => cell.textContent?.includes('第1希望学生'));
}

function statusLabel(status: LabInfo['status']): { emoji: string; text: string } {
  switch (status) {
    case 'available':
      return { emoji: '🟢', text: '余裕あり' };
    case 'almost-full':
      return { emoji: '🟡', text: '残りわずか' };
    case 'over':
      return { emoji: '🟠', text: '満員' };
    default:
      return { emoji: '🔴', text: '危険水準' };
  }
}
