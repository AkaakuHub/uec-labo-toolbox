import type {
  CapacityBreakdown,
  LabApplicantNames,
  LabInfo,
  LabStatus,
  ProgramAggregate,
  ProgramSummary,
  StudentChoiceSummary,
  StudentInfo,
  StudentPreference,
} from '../types/types';

const ZERO_BREAKDOWN: CapacityBreakdown = {
  total: 0,
  thirdYear: 0,
  senior: 0,
  kCourse: 0,
};

const SUMMARY_HEADER_KEYWORDS = ['研究室名', '第1希望'];
const DETAIL_HEADER_KEYWORD = '第1希望学生';

const LAB_STATUS_THRESHOLDS = {
  available: 0.8,
  'almost-full': 1,
  over: 1.2,
};

function parseBreakdown(text: string | null | undefined): CapacityBreakdown {
  if (!text) return { ...ZERO_BREAKDOWN };
  const normalized = text
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = normalized.match(/(-?\d+)\s*\(([^)]+)\)/);
  if (!match) {
    const total = Number.parseInt(normalized, 10);
    return {
      total: Number.isFinite(total) ? total : 0,
      thirdYear: 0,
      senior: 0,
      kCourse: 0,
    };
  }
  const total = Number.parseInt(match[1], 10) || 0;
  const [thirdRaw = '0', seniorRaw = '0', kCourseRaw = '0'] = match[2]
    .split(/[,、]/)
    .map((token) => token.trim());
  return {
    total,
    thirdYear: Number.parseInt(thirdRaw, 10) || 0,
    senior: Number.parseInt(seniorRaw, 10) || 0,
    kCourse: Number.parseInt(kCourseRaw, 10) || 0,
  };
}

function sumBreakdowns(buckets: CapacityBreakdown[]): CapacityBreakdown {
  return buckets.reduce(
    (acc, bucket) => ({
      total: acc.total + bucket.total,
      thirdYear: acc.thirdYear + bucket.thirdYear,
      senior: acc.senior + bucket.senior,
      kCourse: acc.kCourse + bucket.kCourse,
    }),
    { ...ZERO_BREAKDOWN },
  );
}

function classifyLabStatus(capacity: number, firstChoiceApplicants: number): LabStatus {
  if (capacity <= 0) return firstChoiceApplicants > 0 ? 'critical' : 'available';
  const ratio = firstChoiceApplicants / capacity;
  if (ratio < LAB_STATUS_THRESHOLDS.available) return 'available';
  if (ratio < LAB_STATUS_THRESHOLDS['almost-full']) return 'almost-full';
  if (ratio < LAB_STATUS_THRESHOLDS.over) return 'over';
  return 'critical';
}

function normalizeLabName(text: string | null | undefined): string | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function splitStudentEntries(cell: Element | null): string[] {
  if (!cell) return [];
  const html = cell.innerHTML ?? '';
  return html
    .split(/<br\s*\/?\s*>/gi)
    .flatMap((chunk) => chunk.split(/\n/))
    .map((piece) => piece.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractProgramName(table: HTMLTableElement): string | undefined {
  let cursor: Element | null = table.parentElement;
  const guard = 10;
  let hops = 0;
  while (cursor && hops < guard) {
    const maybeDt = cursor.previousElementSibling;
    if (!maybeDt) {
      cursor = cursor.parentElement;
      hops += 1;
      continue;
    }
    if (maybeDt.tagName === 'DT') {
      const text = maybeDt.textContent?.replace(/\s+/g, ' ').trim();
      if (text) return text;
      break;
    }
    cursor = maybeDt;
    hops += 1;
  }
  return undefined;
}

export function parseLabSummaries(doc: Document): LabInfo[] {
  const tables = Array.from(doc.querySelectorAll('table'));
  const labs: LabInfo[] = [];

  tables.forEach((table) => {
    const header = table.querySelector('tr');
    if (!header) return;
    const headerCells = Array.from(header.querySelectorAll('th'));
    if (headerCells.length < 5) return;
    const headerText = headerCells
      .map((cell) => cell.textContent?.trim() ?? '')
      .join('');
    if (!SUMMARY_HEADER_KEYWORDS.every((keyword) => headerText.includes(keyword))) return;

    const programName = extractProgramName(table);
    const bodyRows = Array.from(table.querySelectorAll('tr')).slice(1);
    bodyRows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 5) return;
      const rawName = normalizeLabName(cells[0]?.textContent?.split('\n')[0] ?? '');
      if (!rawName) return;
      const capacity = parseBreakdown(cells[1]?.textContent);
      const first = parseBreakdown(cells[2]?.textContent);
      const second = parseBreakdown(cells[3]?.textContent);
      const third = parseBreakdown(cells[4]?.textContent);
      const totals = sumBreakdowns([first, second, third]);
      const firstChoiceCount = first.total;
      const competitionRate = capacity.total > 0 ? Number((firstChoiceCount / capacity.total).toFixed(2)) : 0;
      labs.push({
        name: rawName,
        email: cells[5]?.textContent?.trim() ?? undefined,
        programName,
        capacity,
        applicants: { first, second, third },
        totals,
        firstChoiceCount,
        competitionRate,
        status: classifyLabStatus(capacity.total, firstChoiceCount),
      });
    });
  });

  return labs;
}

function isDetailTable(table: HTMLTableElement): boolean {
  const header = table.querySelector('tr');
  if (!header) return false;
  const headerCells = Array.from(header.querySelectorAll('th'));
  if (headerCells.length !== 4) return false;
  return headerCells.some((cell) => cell.textContent?.includes(DETAIL_HEADER_KEYWORD));
}

export function findStudentPreferences(doc: Document, studentId: string): StudentPreference[] {
  if (!studentId) return [];
  const tables = Array.from(doc.querySelectorAll('table')).filter((table) => isDetailTable(table));
  const matches: StudentPreference[] = [];

  tables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length !== 4) return;
      const labName = normalizeLabName(cells[0]?.textContent?.split('\n')[0] ?? '');
      if (!labName) return;
      for (let prefIndex = 1; prefIndex <= 3; prefIndex += 1) {
        const cell = cells[prefIndex];
        if (!cell) continue;
        if (cell.textContent?.includes(studentId)) {
          matches.push({ labName, preference: prefIndex as 1 | 2 | 3 });
        }
      }
    });
  });

  return matches;
}

export function parseStudentInfo(doc: Document): StudentInfo | null {
  const info: Partial<StudentInfo> = { preferences: [] };
  const headers = Array.from(doc.querySelectorAll('h3[align="right"]'));
  headers.forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (text.startsWith('学籍番号')) {
      info.studentId = text.split('：')[1]?.trim() ?? '';
    } else if (text.startsWith('氏名')) {
      info.name = text.split('：')[1]?.trim() ?? '';
    } else if (text.startsWith('プログラム名')) {
      info.program = text.split('：')[1]?.trim() ?? '';
    }
  });
  if (!info.studentId) return null;
  return info as StudentInfo;
}

export function parseProgramSummary(doc: Document): ProgramSummary | null {
  const table = doc.querySelector('table');
  if (!table) return null;
  const rows = Array.from(table.querySelectorAll('tr'));
  const summary: ProgramSummary = {
    name: 'I類全体',
    registered: 0,
    applicants: 0,
    capacity: 0,
    breakdownTotal: { ...ZERO_BREAKDOWN },
  };
  let hasValue = false;
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length === 0) return;
    const label = cells[0].textContent?.trim();
    if (!label) return;
    if (label.includes('登録数')) {
      summary.registered = Number.parseInt(cells[1]?.textContent ?? '', 10) || 0;
      hasValue = true;
    }
    if (label.includes('配属希望人数')) {
      summary.applicants = Number.parseInt(cells[1]?.textContent ?? '', 10) || 0;
      hasValue = true;
    }
    if (label.includes('総定員')) {
      summary.capacity = Number.parseInt(cells[1]?.textContent ?? '', 10) || 0;
      hasValue = true;
    }
  });
  return hasValue ? summary : null;
}

export function buildLabMap(labs: LabInfo[]): Map<string, LabInfo> {
  return new Map(labs.map((lab) => [lab.name, lab]));
}

export function collectSummaryRows(doc: Document): Map<string, HTMLTableRowElement[]> {
  const tables = Array.from(doc.querySelectorAll('table'));
  const map = new Map<string, HTMLTableRowElement[]>();
  tables.forEach((table) => {
    const header = table.querySelector('tr');
    if (!header) return;
    const headerCells = Array.from(header.querySelectorAll('th'));
    if (headerCells.length < 5) return;
    const headerText = headerCells
      .map((cell) => cell.textContent?.trim() ?? '')
      .join('');
    if (!SUMMARY_HEADER_KEYWORDS.every((keyword) => headerText.includes(keyword))) return;
    const bodyRows = Array.from(table.querySelectorAll('tr')).slice(1);
    bodyRows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 2) return;
      const labName = normalizeLabName(cells[0]?.textContent?.split('\n')[0] ?? '');
      if (!labName) return;
      const current = map.get(labName) ?? [];
      current.push(row as HTMLTableRowElement);
      map.set(labName, current);
    });
  });
  return map;
}

export function parseLabApplicantNames(doc: Document): Map<string, LabApplicantNames> {
  const tables = Array.from(doc.querySelectorAll('table')).filter((table) => isDetailTable(table));
  const result = new Map<string, LabApplicantNames>();
  tables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length !== 4) return;
      const labName = normalizeLabName(cells[0]?.textContent?.split('\n')[0] ?? '');
      if (!labName) return;
      const entry = result.get(labName) ?? { first: [], second: [], third: [] };
      entry.first.push(...splitStudentEntries(cells[1]));
      entry.second.push(...splitStudentEntries(cells[2]));
      entry.third.push(...splitStudentEntries(cells[3]));
      result.set(labName, entry);
    });
  });
  return result;
}

export function aggregatePrograms(labs: LabInfo[]): ProgramAggregate[] {
  const map = new Map<string, ProgramAggregate>();
  labs.forEach((lab) => {
    const program = lab.programName ?? 'プログラム不明';
    const value = map.get(program) ?? { program, capacity: 0, applicants: 0, remaining: 0 };
    value.capacity += lab.capacity.total;
    value.applicants += lab.firstChoiceCount;
    map.set(program, value);
  });
  map.forEach((entry) => {
    entry.remaining = Math.max(entry.capacity - entry.applicants, 0);
  });
  return Array.from(map.values()).sort((a, b) => a.program.localeCompare(b.program, 'ja'));
}

export function parseStudentChoiceMap(doc: Document): Map<string, StudentChoiceSummary> {
  const tables = Array.from(doc.querySelectorAll('table')).filter((table) => isDetailTable(table));
  const map = new Map<string, StudentChoiceSummary>();
  tables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length !== 4) return;
      const labName = normalizeLabName(cells[0]?.textContent?.split('\n')[0] ?? '');
      if (!labName) return;
      for (let prefIndex = 1; prefIndex <= 3; prefIndex += 1) {
        const entries = splitStudentEntries(cells[prefIndex]);
        entries.forEach((entry) => {
          const parsed = parseStudentEntry(entry);
          if (!parsed.studentId) return;
          const record = map.get(parsed.studentId) ?? {
            name: parsed.name,
            program: parsed.program,
            first: [],
            second: [],
            third: [],
          };
          const bucket = prefIndex === 1 ? record.first : prefIndex === 2 ? record.second : record.third;
          if (!bucket.includes(labName)) {
            bucket.push(labName);
          }
          if (!record.name && parsed.name) record.name = parsed.name;
          if (!record.program && parsed.program) record.program = parsed.program;
          map.set(parsed.studentId, record);
        });
      }
    });
  });
  return map;
}

export function parseStudentEntry(entry: string): {
  studentId: string | null;
  name: string;
  program?: string;
} {
  const segments = entry.split(':');
  const firstSegment = segments[0]?.trim() ?? '';
  const idMatch = firstSegment.match(/\d{6,}/);
  const studentId = idMatch ? idMatch[0] : null;
  const namePart = segments.slice(studentId ? 1 : 0).join(':').trim() || firstSegment;
  const programMatch = namePart.match(/\(([^)]+)\)/);
  const name = namePart.replace(/\([^)]*\)/g, '').trim() || namePart;
  return {
    studentId,
    name,
    program: programMatch ? programMatch[1].trim() : undefined,
  };
}
