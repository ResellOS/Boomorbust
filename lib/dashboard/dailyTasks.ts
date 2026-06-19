export interface TradeTaskData {
  give_player_name: string;
  get_player_name: string;
  league_name: string;
  target_manager_name: string;
  acceptance_probability: number;
  reason: string;
  tfo_delta?: number;
  value_signal_boost?: number;
  give_player_id?: string;
  get_player_id?: string;
  league_id?: string;
}

export interface ReviewTaskData {
  player_name: string;
  position: string;
  league_name: string;
  verdict: string;
  rank_delta?: number;
  reason: string;
  player_id?: string;
  league_id?: string;
}

export type DailyTaskType = 'TRADE' | 'REVIEW';

export interface DailyTask {
  id: string;
  userId: string;
  taskType: DailyTaskType;
  taskData: TradeTaskData | ReviewTaskData;
  taskScore: number;
  impactScore: number;
  confidenceScore: number;
  urgencyScore: number;
  easeScore: number;
  generatedAt: string;
  expiresAt: string;
  status: string;
}

export type UrgencyLevel = 'HIGH' | 'MED' | 'LOW';

export function urgencyFromScore(score: number): UrgencyLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MED';
  return 'LOW';
}

export function acceptancePillStyle(probability: number): { bg: string; text: string } {
  if (probability > 60) return { bg: '#36E7A1', text: '#0a0d14' };
  if (probability >= 40) return { bg: '#FBBF24', text: '#0a0d14' };
  return { bg: '#A78BFA', text: '#fff' };
}

export function isTradeTaskData(data: TradeTaskData | ReviewTaskData): data is TradeTaskData {
  return 'give_player_name' in data && 'get_player_name' in data;
}

export function isReviewTaskData(data: TradeTaskData | ReviewTaskData): data is ReviewTaskData {
  return 'player_name' in data && 'verdict' in data;
}

function normalizeTaskDataRaw(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
}

/** Engine stores 0–1; legacy rows may use 0–100. */
export function normalizeAcceptanceProbability(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw > 0 && raw <= 1) return raw * 100;
  return Math.min(100, Math.max(0, raw));
}

function parseTaskData(raw: unknown, taskType: string): TradeTaskData | ReviewTaskData {
  const d = normalizeTaskDataRaw(raw);
  if (taskType === 'TRADE') {
    return {
      give_player_name: String(d.give_player_name ?? d.givePlayerName ?? '—'),
      get_player_name: String(d.get_player_name ?? d.getPlayerName ?? '—'),
      league_name: String(d.league_name ?? d.leagueName ?? 'League'),
      target_manager_name: String(d.target_manager_name ?? d.targetManagerName ?? 'Manager'),
      acceptance_probability: normalizeAcceptanceProbability(Number(d.acceptance_probability ?? d.acceptanceProbability ?? 0)),
      reason: String(d.reason ?? ''),
      tfo_delta: d.tfo_delta != null ? Number(d.tfo_delta) : d.tfoDelta != null ? Number(d.tfoDelta) : undefined,
      value_signal_boost:
        d.value_signal_boost != null
          ? Number(d.value_signal_boost)
          : d.valueSignalBoost != null
            ? Number(d.valueSignalBoost)
            : undefined,
      give_player_id: d.give_player_id != null ? String(d.give_player_id) : d.givePlayerId != null ? String(d.givePlayerId) : undefined,
      get_player_id: d.get_player_id != null ? String(d.get_player_id) : d.getPlayerId != null ? String(d.getPlayerId) : undefined,
      league_id: d.league_id != null ? String(d.league_id) : d.leagueId != null ? String(d.leagueId) : undefined,
    };
  }
  return {
    player_name: String(d.player_name ?? d.playerName ?? '—'),
    position: String(d.position ?? '—'),
    league_name: String(d.league_name ?? d.leagueName ?? 'League'),
    verdict: String(d.verdict ?? 'BUST'),
    rank_delta: d.rank_delta != null ? Number(d.rank_delta) : d.rankDelta != null ? Number(d.rankDelta) : undefined,
    reason: String(d.reason ?? ''),
    player_id: d.player_id != null ? String(d.player_id) : d.playerId != null ? String(d.playerId) : undefined,
    league_id: d.league_id != null ? String(d.league_id) : d.leagueId != null ? String(d.leagueId) : undefined,
  };
}

export function mapDailyTaskRow(row: Record<string, unknown>): DailyTask {
  const taskType = String(row.task_type ?? 'REVIEW').toUpperCase() as DailyTaskType;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    taskType: taskType === 'TRADE' ? 'TRADE' : 'REVIEW',
    taskData: parseTaskData(row.task_data, taskType),
    taskScore: Number(row.task_score ?? 0),
    impactScore: Number(row.impact_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    urgencyScore: Number(row.urgency_score ?? 0),
    easeScore: Number(row.ease_score ?? 0),
    generatedAt: String(row.generated_at ?? ''),
    expiresAt: String(row.expires_at ?? ''),
    status: String(row.status ?? 'pending'),
  };
}
