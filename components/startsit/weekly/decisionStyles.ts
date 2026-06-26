import type { WeeklyDecisionKind } from '@/lib/startsit/types';

export function kindStyle(kind: WeeklyDecisionKind): {
  color: string;
  bg: string;
  border: string;
} {
  switch (kind) {
    case 'START':
      return { color: '#36E7A1', bg: 'rgba(54,231,161,0.08)', border: 'rgba(54,231,161,0.35)' };
    case 'BENCH':
      return { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)' };
    case 'ADD':
    case 'DROP':
      return { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)' };
    case 'TRADE':
      return { color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.35)' };
    case 'WEATHER':
    case 'INJURY':
      return { color: '#22D3EE', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.35)' };
    default:
      return { color: '#8b9bb8', bg: 'rgba(139,155,184,0.08)', border: 'rgba(139,155,184,0.25)' };
  }
}

export function slotBorder(rec: 'start' | 'sit' | 'flex' | 'neutral'): string {
  switch (rec) {
    case 'start':
      return 'rgba(54,231,161,0.55)';
    case 'sit':
      return 'rgba(239,68,68,0.45)';
    case 'flex':
      return 'rgba(251,191,36,0.45)';
    default:
      return 'rgba(255,255,255,0.1)';
  }
}
