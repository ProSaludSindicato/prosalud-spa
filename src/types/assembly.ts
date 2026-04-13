export type QuestionStatus = "PENDING" | "OPEN" | "CLOSED";
export type QuestionType = "SINGLE" | "MULTIPLE";
export type MajorityType = "SIMPLE" | "ABSOLUTE" | "TWO_THIRDS";

export interface QuestionOption {
  id: string;
  text: string;
  description?: string;
}

export interface AssemblyQuestion {
  id: string;
  title: string;
  description?: string;
  helpText?: string;
  options: QuestionOption[];
  type: QuestionType;
  majorityType: MajorityType;
  status: QuestionStatus;
  timeLimit: number;
  quorumRequired: boolean;
  allowChangeVote: boolean;
  order: number;
  openedAt?: string;
  closedAt?: string;
  votesCount: number;
  resultsVisible: boolean;
}

export interface AssemblyVote {
  id: string;
  questionId: string;
  voterId: string;
  voterName: string;
  selectedOptions: string[];
  votedAt: string;
}

export interface QuorumConfig {
  totalDelegates: number;
  presentDelegates: number;
  requiredPercentage: number;
  verified: boolean;
}

export interface AssemblyStats {
  questionId: string;
  totalVotes: number;
  optionResults: {
    optionId: string;
    optionText: string;
    votes: number;
    percentage: number;
  }[];
  majorityAchieved: boolean;
  majorityType: MajorityType;
}

export interface VotingMode {
  type: "CANDIDATE" | "ASSEMBLY";
}

export const LIVE_VOTE_OPTIONS = [
  { id: "agree", text: "De acuerdo" },
  { id: "disagree", text: "En desacuerdo" },
] as const;

export type LiveVoteOptionId = (typeof LIVE_VOTE_OPTIONS)[number]["id"];

export interface AttendanceRecord {
  id: number;
  document_number: string;
  full_name: string;
  issue_date_normalized?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  authenticated_at: string;
  signature_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

export interface Assembly {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  questionsCount?: number;
  attendancesCount?: number;
  quorumConfigsCount?: number;
}
