// Interfaces = espejo de los schemas de Swagger (/openapi.json)

// ── Errores ───────────────────────────────────────────
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  traceId: string;
  details?: ApiErrorDetail[];
  retryAfterSeconds?: number;
}

// ── Auth ──────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  code: string;
  name: string;
}

export interface RegisterRequest {
  teamName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
  team: Team;
}

export interface MeResponse {
  user: User;
  team: Team;
  expiresAt: string;
}

// ── Enums compartidos ─────────────────────────────────
export type WantedStatus = 'AT_LARGE' | 'CAPTURED' | 'MISSING';
export type FruitType = 'PARAMECIA' | 'ZOAN' | 'LOGIA';
export type CrewRole =
  | 'CAPTAIN'
  | 'FIRST_MATE'
  | 'NAVIGATOR'
  | 'SNIPER'
  | 'COOK'
  | 'DOCTOR'
  | 'SHIPWRIGHT'
  | 'MUSICIAN'
  | 'ARCHAEOLOGIST'
  | 'HELMSMAN'
  | 'FIGHTER';

// ── Tripulaciones y carteles ──────────────────────────
export interface CrewRef {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  shipName: string;
  jollyRogerColor: string;
  memberCount: number;
  totalBounty: number;
}

export interface DevilFruit {
  name: string;
  type: FruitType;
}

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: CrewRef;
  role: CrewRole;
  devilFruit: DevilFruit | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

export interface WantedDetail extends WantedSummary {
  age: number;
  heightCm: number;
  bio: string;
  lastSeen: { island: string; seenAt: string };
  bountyHistory: { amount: number; issuedAt: string }[]; // de la más antigua a la actual
}

export interface WantedPage {
  content: WantedSummary[];
  totalElements: number;
  totalPages: number; // 0 si no hay resultados
  page: number; // desde 0
  size: number;
}

// Parámetros válidos de GET /wanted (ver features/wanted/params.ts)
export type WantedSort = 'bounty,desc' | 'name,asc' | 'updatedAt,desc';
export type WantedPageSize = 10 | 20 | 50;
export type FruitFilter = FruitType | 'NONE';

export interface WantedQuery {
  page: number;
  size: WantedPageSize;
  sort: WantedSort;
  status?: WantedStatus;
  crewId?: string;
  fruit?: FruitFilter;
  q?: string;
}

// ── Dashboard ─────────────────────────────────────────
export interface DashboardSummary {
  team: Team;
  wanted: {
    total: number;
    totalBounty: number;
    averageBounty: number;
    byStatus: Record<WantedStatus, number>;
    byFruit: Record<FruitType | 'NONE', number>;
  };
  crews: {
    total: number;
    mostWanted: Crew | null;
  };
  topBounties: WantedSummary[];
  generatedAt: string;
}

// ── Log Pose ──────────────────────────────────────────
export type LogPoseStatus = 'LOCKED' | 'UNLOCKED';

export interface LogPose {
  status: LogPoseStatus;
  grandLineUnlocked: boolean;
  unlockedAt: string | null;
  message: string;
}
