export type LabStatus = 'available' | 'almost-full' | 'over' | 'critical';

export interface CapacityBreakdown {
  total: number;
  thirdYear: number;
  senior: number;
  kCourse: number;
}

export interface PreferenceBucket {
  first: CapacityBreakdown;
  second: CapacityBreakdown;
  third: CapacityBreakdown;
}

export interface LabInfo {
  name: string;
  email?: string;
  programName?: string;
  capacity: CapacityBreakdown;
  applicants: PreferenceBucket;
  totals: CapacityBreakdown;
  firstChoiceTotal: number;
  firstChoicePrimary: number;
  primaryCapacity: number;
  competitionRate: number;
  status: LabStatus;
}

export interface StudentPreference {
  labName: string;
  preference: 1 | 2 | 3;
}

export interface StudentInfo {
  studentId: string;
  name: string;
  program: string;
  preferences: StudentPreference[];
}

export interface ProgramSummary {
  name: string;
  registered: number;
  applicants: number;
  capacity: number;
  breakdownTotal: CapacityBreakdown;
}

export interface LabApplicantNames {
  first: string[];
  second: string[];
  third: string[];
}

export interface ProgramAggregate {
  program: string;
  capacity: number;
  applicants: number;
  remaining: number;
}

export interface StudentChoiceSummary {
  name: string;
  program?: string;
  first: string[];
  second: string[];
  third: string[];
  confirmed?: 1 | 2 | 3 | null;
}
