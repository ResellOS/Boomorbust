export type CoachPersonality = 'Competitive' | 'Balanced' | 'Conservative';
export type CoachDetail     = 'Detailed' | 'Brief' | 'Data-Only';

export interface CoachSettings {
  personality:        CoachPersonality;
  detail:             CoachDetail;
  allLeagueContext:   boolean;
  tradeHistory:       boolean;
  playerNews:         boolean;
  injuryUpdates:      boolean;
}

export interface ChatMessage {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  streaming?: boolean;
  tradeCard?: TradeAnalysisData | null;
  followUp?:  string | null;
}

// Structured trade analysis — detected from assistant responses
export interface TradeAsset {
  name:      string;
  position:  string;
  team:      string;
  detail:    string;   // "2024 1st Round Pick" or "Age 22 | Elite RB1"
  value:     number;   // KTC-like value
  isPick:    boolean;
}

export interface TradeAnalysisData {
  verdict:       'DO IT' | 'PASS' | 'COUNTER' | 'HOLD';
  confidence:    number;  // 0-100
  give:          TradeAsset[];
  receive:       TradeAsset[];
  totalGive:     number;
  totalReceive:  number;
  valueEdge:     number;  // positive = in your favor
  reasons:       string[];
  teamImpact: {
    winNow:      number;   // delta %
    futureValue: number;
    depthHit:    number;
    flexibility: string;
  };
}

export interface LeagueContext {
  id:     string;
  name:   string;
  format: string;    // "12-Team SF PPR"
  status: string;    // "In Playoffs" | "Rebuilding" | "Your Team"
}

export const SUGGESTED_PROMPTS = [
  {
    id: 'trade',
    icon: 'trade',
    title: 'Trade Advice',
    description: 'Analyze a trade or propose one.',
    prompt: 'Analyze this trade for me: I give [player/pick] for [player/pick]. Should I do it?',
  },
  {
    id: 'startsit',
    icon: 'trophy',
    title: 'Start / Sit Help',
    description: 'Who should I start this week?',
    prompt: 'Who should I start this week? Walk me through my toughest lineup decisions.',
  },
  {
    id: 'strategy',
    icon: 'brain',
    title: 'Team Strategy',
    description: 'How can I improve my team?',
    prompt: 'Give me an honest assessment of my dynasty team and what I should be doing right now.',
  },
  {
    id: 'rookie',
    icon: 'star',
    title: 'Rookie Insight',
    description: 'Tell me about this rookie class.',
    prompt: 'Tell me about the 2025 rookie class. Which rookies should I be targeting in my upcoming draft?',
  },
  {
    id: 'stock',
    icon: 'trending',
    title: 'Stock Watch',
    description: "Who's rising or falling?",
    prompt: "Who's trending up and who's trending down in dynasty right now? Give me your top buys and sells.",
  },
  {
    id: 'overview',
    icon: 'grid',
    title: 'League Overview',
    description: 'Summarize my leagues.',
    prompt: 'Give me a quick overview of all my leagues. Where am I competitive and where should I rebuild?',
  },
] as const;

export type SuggestedPromptId = typeof SUGGESTED_PROMPTS[number]['id'];

// Detect if a user question is trade-related
export function isTradeQuestion(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('trade') ||
    lower.includes('give') ||
    lower.includes('for ') ||
    lower.includes('offer') ||
    lower.includes('deal') ||
    lower.includes('swap')
  );
}

// Extract trade assets from a message like "1.10 and Nico Collins for Bijan Robinson"
export function parseTradeQuestion(msg: string): { give: string[]; receive: string[] } | null {
  // Pattern: "X and Y for Z" or "X for Y"
  const forPattern = /(.+?)\s+for\s+(.+)/i;
  const match = msg.match(forPattern);
  if (!match) return null;

  const giveStr = match[1].replace(/^(trade|i give|giving|send|swap)\s+/i, '').trim();
  const receiveStr = match[2].trim().replace(/[?.!]$/, '');

  const give = giveStr.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  const receive = receiveStr.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean);

  return { give, receive };
}
