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
