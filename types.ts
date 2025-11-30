
export type ObserverRole = 'mullahiz' | 'muraqib' | 'reserve';

export interface Observer {
  id: string;
  name: string;
  department?: string; // Scientific Department (القسم العلمي)
  role: ObserverRole; // Default role
}

export interface Committee {
  id: string;
  name: string; // School Name (Main Committee)
  subCommitteesCount: number; // Number of classrooms
  observersPerRoom: number; // Usually 2 for High School
  // Leadership
  headName?: string;       // Monitor/Head (مراقب اللجنة)
  assistantName1?: string; // 1st Deputy (النائب الأول)
  assistantName2?: string; // 2nd Deputy (النائب الثاني)
}

export interface DistributionResult {
  committeeName: string;
  subCommitteeNumber: number;
  observers: Observer[];
}

export interface ExamDay {
  id: string;
  label: string; // e.g., "Day 1"
  dayOfWeek: string; // e.g. "Sunday", "Monday"
  date: string;
  // Split subjects
  subject10: string;      // Grade 10
  subject11Sci: string;   // Grade 11 Science
  subject11Arts: string;  // Grade 11 Arts (11D)
  subject12Sci: string;   // Grade 12 Science
  subject12Arts: string;  // Grade 12 Arts
}

// Map dayId -> ObserverId -> boolean (true if absent)
export type DailyAbsenceMap = Record<string, Record<string, boolean>>;

// Map dayId -> ObserverId -> { committeeId: string, subCommitteeNumber: number }
export type ManualAssignment = { committeeId: string; subCommitteeNumber: number };
export type DailyManualAssignmentMap = Record<string, Record<string, ManualAssignment>>;

// Map dayId -> DistributionResult[] (History of distributions)
export type DailyDistributionHistory = Record<string, {
    results: DistributionResult[];
    muraqibs: Observer[];
    reserves: Observer[];
    timestamp: number;
}>;

export interface AppState {
  observers: Observer[];
  committees: Committee[];
  distribution: DistributionResult[];
  muraqibs: Observer[]; // Monitors (not in rooms)
  reserves: Observer[]; // Unassigned observers + Manually assigned reserves
}
