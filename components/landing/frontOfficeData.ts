/** Hardcoded landing page content — The Front Office (public marketing). */

export const dashboardMetrics = {
  weekEdge: '+18.4',
  tradeOverpay: '73%',
  rosterHealth: { healthy: 92, out: 0, suspended: 1 },
} as const;

export type LeagueHero = {
  name: string;
  standing: string;
  record: string;
  format: string;
  nextOpponent: string;
};

export const myLeagues: LeagueHero[] = [
  { name: 'Champions', standing: '1st of 12', record: '8-2', format: 'Superflex · Half PPR · 12 teams', nextOpponent: '@ Gridiron Legends' },
  { name: 'The League', standing: '2nd of 12', record: '7-3', format: '1QB · Full PPR · 12 teams', nextOpponent: 'vs Apex Predators' },
  { name: 'Dynasty S2N', standing: '3rd of 12', record: '6-4', format: 'Superflex · TEP · 12 teams', nextOpponent: '@ Win Now FC' },
  { name: 'Rebuilding', standing: '10th of 12', record: '3-7', format: '1QB · Dynasty · 14 teams', nextOpponent: 'vs Taco Tuesday' },
  { name: 'Main Event Show', standing: '5th of 12', record: '5-5', format: 'SF · Tiered PPR · 12 teams', nextOpponent: '@ Capital City' },
  { name: 'Sunday Funday', standing: '7th of 12', record: '4-6', format: '1QB · Dynasty · 10 teams', nextOpponent: 'vs River Runners' },
];

export type MatchupRow = {
  league: string;
  you: { pts: number; rank: number };
  opp: { name: string; pts: number; rank: number };
  edge: number;
};

export type MatchupDetail = {
  starters: string;
  injuries: string;
  positionStrength: string;
  yourEdge: string;
};

export const matchups: (MatchupRow & { detail: MatchupDetail })[] = [
  {
    league: 'Champions',
    you: { pts: 92.4, rank: 1 },
    opp: { name: 'Opponent', pts: 87.2, rank: 8 },
    edge: 5.2,
    detail: {
      starters:
        'Top 5 starters: QB J.Allen · RB B.Hall · RB J.Gibbs · WR T.McLaurin · WR D.London · FLEX P.Nacua.',
      injuries: 'WR3 is questionable (game-time call). RB2 was limited Thursday.',
      positionStrength:
        'They\'re deeper at WR (four guys in consensus top 50) — lean into RB/FLEX matchup edges.',
      yourEdge: 'You carry the better QB and RB floor; they need spike games from peripheral WR volume.',
    },
  },
  {
    league: 'The League',
    you: { pts: 89.1, rank: 2 },
    opp: { name: 'Week 12 Opp', pts: 88.9, rank: 3 },
    edge: 0.2,
    detail: {
      starters: 'QB B.Purdy · RB A.Kamara · RB C.Hubbard · WR A.St. Brown · WR D.Adams · TE T.McBride.',
      injuries: 'No major designations besides a flex candidate listed doubtful.',
      positionStrength:
        'They match you at QB/TE anchor quality but are thinner behind their top two receivers.',
      yourEdge:
        'Narrow matchup — swings will come down to WR spike & game script. Fade panic starts; prioritize stable snap shares.',
    },
  },
  {
    league: 'Dynasty S2N',
    you: { pts: 86.4, rank: 3 },
    opp: { name: 'North Division', pts: 85.1, rank: 5 },
    edge: 1.3,
    detail: {
      starters: 'QB P.Mahomes · RB T.Etienne · RB D.Swift · WR C.Kupp · WR C.Ridley · TE M.Andrews.',
      injuries: 'WR2 dealing with lingering hamstring; monitor pre-game downgrade risk.',
      positionStrength:
        'They chase ceiling at RB with committee backs — capitalize with reliable snap leaders.',
      yourEdge: 'You forecast better FLEX reliability; prioritize touch-weighted starters over dart throws.',
    },
  },
  {
    league: 'Rebuilding',
    you: { pts: 78.2, rank: 10 },
    opp: { name: 'Bottom Bracket FC', pts: 76.9, rank: 11 },
    edge: 1.3,
    detail: {
      starters:
        'QB rookie floor play · RB two committee backs · WR youth upside · FLEX streaming TE matchup.',
      injuries:
        'TE dealing with concussion protocol listed out — pushes them toward suboptimal FLEX fill-ins.',
      positionStrength:
        'Volatile WR room without a bell-cow alpha; good week to trust your QB + chain-mover RBs.',
      yourEdge: 'You\'re thinner on ceiling but clearer on QB/RB anchors — variance tilts mildly your way.',
    },
  },
  {
    league: 'Main Event Show',
    you: { pts: 84.8, rank: 5 },
    opp: { name: 'Metro Bashers', pts: 82.1, rank: 9 },
    edge: 2.7,
    detail: {
      starters: 'QB L.Jackson · RB J.Conner · RB Z.White · WR D.Metcalf · WR M.Pittman · TE unknown stream.',
      injuries: 'One starting WR doubtful — boosts target consolidation for survivors.',
      positionStrength:
        'They spike through rushing equity and one alpha WR rather than layered pass catchers.',
      yourEdge: 'You cover more playable paths at WR — lean pass-catcher volume vs their boom/bust QB days.',
    },
  },
  {
    league: 'Sunday Funday',
    you: { pts: 81.3, rank: 7 },
    opp: { name: 'City Limits', pts: 80.9, rank: 8 },
    edge: 0.4,
    detail: {
      starters:
        'QB K.Murray · RB R.White · RB A.Jones · WR M.Harrison Jr. · WR DJ.Moore · FLEX volatile WR.',
      injuries: 'No players ruled out Sat — QB mobility questions after limited practice snaps.',
      positionStrength:
        'They chase ceiling with condensed target trees — diversify your FLEX to capture multiple game scripts.',
      yourEdge:
        'Toss-up on paper — differentiate with weather/tempo edges and late-week practice reports.',
    },
  },
];

export type Prospect = {
  rank: number;
  name: string;
  pos: string;
  score: number;
  adp: string;
  detail: {
    why: string;
    recent: string;
    adpVsRank: string;
    playbook: string;
  };
};

export const prospects: Prospect[] = [
  {
    rank: 1,
    name: 'Ashton Jeanty',
    pos: 'RB',
    score: 106.8,
    adp: '1.02',
    detail: {
      why: 'Elite production efficiency with contact balance that projects immediately in gap/man schemes.',
      recent: '2025 advanced metrics show 98th-percentile burst for the position in open-field situations.',
      adpVsRank: 'Market ADP around 1.02 — we rank him 1.01 on pure hit rate in premium formats.',
      playbook: 'If you\'re mid-rebuild, treat him as a top-five capital event and build trade lanes early.',
    },
  },
  {
    rank: 2,
    name: 'Travis Hunter',
    pos: 'WR',
    score: 98.2,
    adp: '1.05',
    detail: {
      why: 'Rare two-way profile with WR1 pacing once usage stabilizes.',
      recent: 'Route participation & separation scores trend top decile versus Power-5 baseline.',
      adpVsRank: 'Consensus ADP drifting to 1.05; we anchor closer to elite WR alpha tier.',
      playbook: 'Contenders: prioritize if you\'re consolidating picks; rebuilds: maximize flexibility before draft capital peaks.',
    },
  },
  {
    rank: 3,
    name: 'Jaydon Blue',
    pos: 'RB',
    score: 97.9,
    adp: '2.01',
    detail: {
      why: 'Explosive home-run hitter with credible pass-game utility on film.',
      recent: 'Breakaway rate & explosive carry share register in elite tier for classmates.',
      adpVsRank: 'Late first / early second ADP aligns with upside WR cost — we tilt RB if capital-constrained.',
      playbook: 'Window teams needing RB2++ spike weeks should track landing spot depth chart aggressively.',
    },
  },
  {
    rank: 4,
    name: 'Matthew Golden',
    pos: 'WR',
    score: 97.4,
    adp: '1.08',
    detail: {
      why: 'Separator profile stacks with alpha target potential in spread offenses.',
      recent: 'Contested catch win rate pacing above median with low wasted motion off the line.',
      adpVsRank: 'Retail ADP creeping into top 10 picks — upside baked in; avoid overpay versus proven vets.',
      playbook: 'If you stocked 2027 picks, capitalize on impatient managers exiting mid-first.',
    },
  },
  {
    rank: 5,
    name: 'Savion Williams',
    pos: 'WR',
    score: 95.8,
    adp: '2.06',
    detail: {
      why: 'Size/speed intersections that fit modern boundary X / movable chess piece roles.',
      recent: 'Burst & YAC overlays grade out as spike-friendly but variable week-to-week.',
      adpVsRank: 'ADP clustered mid-second — volatility discount is fair; track combine medicals closely.',
      playbook: 'Best for managers who can roster spot through early-year role uncertainty.',
    },
  },
  {
    rank: 6,
    name: 'Noah Fifita',
    pos: 'QB',
    score: 94.1,
    adp: '3.01',
    detail: {
      why: 'Processor with quick sequencing and low turnover profile at the next level.',
      recent: 'Pressure-to-sack ratio remains excellent versus comparable class passers.',
      adpVsRank: 'Superflex ADP still sorting — expect mid-round consolidation post-combine.',
      playbook: 'SF leagues: treat as capital hedge if you\'re short 2026 QB equity.',
    },
  },
  {
    rank: 7,
    name: 'Omarion Hampton',
    pos: 'RB',
    score: 93.6,
    adp: '2.04',
    detail: {
      why: 'Volume-friendly frame with contact balance that mitigates obvious injury flags on tape.',
      recent: 'Success rate vs loaded boxes trends above class median when excluding blowouts.',
      adpVsRank: 'Second-round ADP cluster — buy if your roster skews older at RB2.',
      playbook: 'Rebuilds: pair with future pick swaps to smooth bust risk.',
    },
  },
  {
    rank: 8,
    name: 'Isaac TeSlaa',
    pos: 'WR',
    score: 92.2,
    adp: '3.04',
    detail: {
      why: 'Release package & catch radius provide low-volume spike weeks even before alpha usage.',
      recent: 'Separation vs press metrics improved sharply through final collegiate stretch.',
      adpVsRank: 'Third-round ADP leaves room if landing spot posts early camp clarity.',
      playbook: 'Contenders streaming WR depth: opportunistic flier if cost stays reasonable.',
    },
  },
  {
    rank: 9,
    name: 'Kole Taylor',
    pos: 'TE',
    score: 90.5,
    adp: '4.02',
    detail: {
      why: 'Inline athleticism with red-zone equity that tracks to fantasy-relevant snap shares.',
      recent: 'Route participation vs 12 personnel sets trend toward every-down viability.',
      adpVsRank: 'TE premium formats should pay up ~half a round earlier than consensus ADP.',
      playbook: 'If you\'re TE desperate in TEP, track medicals + pro-day mobility closely.',
    },
  },
  {
    rank: 10,
    name: 'Kyle McCord',
    pos: 'QB',
    score: 89.3,
    adp: '4.08',
    detail: {
      why: 'Timing thrower with distribution floor—safer bridge profile with starter equity in SF.',
      recent: 'Accuracy vs tight windows improved late season; arm strength questions remain priced in.',
      adpVsRank: 'Day-two ADP band — fair for managers needing QB3 insurance without paying early capital.',
      playbook: 'Pair with a mobile upside QB in SF to cover weekly ceiling gaps.',
    },
  },
];

export type Exposure = {
  player: string;
  leagues: number;
  total: number;
  pct: number;
  detail: { leaguesList: string; risk: string; mitigation: string };
};

export const exposures: Exposure[] = [
  {
    player: 'JJefferson',
    leagues: 5,
    total: 6,
    pct: 83,
    detail: {
      leaguesList: 'Champions, The League, Dynasty S2N, Rebuilding, Main Event Show',
      risk: 'If Jefferson misses time, five of six rosters lose a top-end WR1 anchor simultaneously.',
      mitigation: 'Consider diversifying exposure in 1–2 leagues via soft sell-high windows or pivot trades before playoffs.',
    },
  },
  {
    player: 'B.Hall',
    leagues: 4,
    total: 6,
    pct: 67,
    detail: {
      leaguesList: 'Champions, Dynasty S2N, Main Event Show, Sunday Funday',
      risk: 'Committee or injury shock to the Jets backfield compresses multiple starting lineups.',
      mitigation: 'Pair with one cheap RB3 insurance policy in leagues where you\'re double-stacked.',
    },
  },
  {
    player: 'T.McBride',
    leagues: 4,
    total: 6,
    pct: 67,
    detail: {
      leaguesList: 'The League, Rebuilding, Main Event Show, Sunday Funday',
      risk: 'TE premium leagues concentrate weekly ceiling on one pass-catcher ecosystem.',
      mitigation: 'Balance with mid-tier TE2 targets on waivers or low-cost trade-backs in one league.',
    },
  },
];

export type ArbRow = {
  player: string;
  ktc: string;
  ours: string;
  signal: 'BUY' | 'SELL';
  detail: { why: string; thesis: string; trade: string };
};

export const arbitrage: ArbRow[] = [
  {
    player: 'Player X (veteran WR)',
    ktc: '$2.5M',
    ours: '$1.8M',
    signal: 'BUY',
    detail: {
      why: 'We discount for age curve + target competition that public markets underweight post-bye.',
      thesis: 'Still commands alpha target share on tape; market pricing lags recent usage stabilization.',
      trade: 'Look to acquire under ~$1.9M equivalent in pick value before playoff pushes reset prices.',
    },
  },
  {
    player: 'Player Y (rising RB)',
    ktc: '$1.2M',
    ours: '$2.1M',
    signal: 'SELL',
    detail: {
      why: 'We bake in earlier peak window and scheme fit than thin KTC samples suggest.',
      thesis: 'Explosive profile is real, but weekly touch volatility caps bankable floor.',
      trade: 'If you can sell near high-$1M equivalent, pocket the premium and recycle into safer starters.',
    },
  },
  {
    player: 'Player Z (QB2 in SF)',
    ktc: '$0.9M',
    ours: '$1.4M',
    signal: 'BUY',
    detail: {
      why: 'Mobile equity + improved pass volume projection vs market\'s game-manager label.',
      thesis: 'SF formats should pay for stable 17-game starts even without elite efficiency.',
      trade: 'Target managers chasing shiny WR adds who undervalue QB3 insurance mid-season.',
    },
  },
];

export const testimonials = [
  {
    quote:
      'The Front Office changed how I balance six leagues. The portfolio view alone paid for my Pro upgrade in week one.',
    author: 'Alex K.',
    subtext: '6-league manager, championship contender',
  },
  {
    quote: 'The trade explanations are next level — I finally understand why a deal makes sense before I click accept.',
    author: 'Mike L.',
    subtext: 'Dynasty Champion 2024',
  },
  {
    quote: 'My edge over league-mates feels unfair in the best way. It’s like having a GM on speed dial.',
    author: 'Tyler A.',
    subtext: '4-league manager',
  },
] as const;

export const pricingTiers = [
  {
    tier: 'Free',
    priceLabel: '$0/month',
    features: [
      'Import all your leagues',
      'Multi-league dashboard',
      'Basic trade analysis',
      'Waiver wire targets',
    ],
    highlight: false,
    bg: 'bg-slate-800',
    buttonClass: 'bg-slate-700 hover:bg-slate-600 text-white',
  },
  {
    tier: 'Pro',
    priceLabel: '$4.99/month',
    features: [
      'Everything in Free',
      'Start/Sit optimizer',
      'Dynasty Analyst chat',
      'Weekly digest email',
    ],
    highlight: true,
    bg: 'bg-emerald-900/40 ring-2 ring-emerald-500/50',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  {
    tier: 'Elite',
    priceLabel: '$9.99/month',
    features: [
      'Everything in Pro',
      'Portfolio analytics',
      'Draft class scouting board',
      'Advanced trade finder',
      'Priority support',
    ],
    highlight: false,
    bg: 'bg-blue-900/40',
    buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
] as const;

export const comparisonRows = [
  { feature: 'Multi-league portfolio view', other: '❌', ktc: '❌', nerds: '❌', tfo: '✅' },
  { feature: 'Personalized advice engine', other: '❌', ktc: '❌', nerds: '❌', tfo: '✅' },
  { feature: 'Cross-league exposure detection', other: '❌', ktc: '❌', nerds: '❌', tfo: '✅' },
  { feature: 'Weekly matchup previews', other: '❌', ktc: '❌', nerds: '❌', tfo: '✅' },
  { feature: 'Draft class intelligence', other: '❌', ktc: '❌', nerds: 'Limited', tfo: '✅' },
  { feature: 'Price', other: 'Varies', ktc: 'Free / paid', nerds: '$6.99/mo', tfo: 'Free · Pro $4.99 · Elite $9.99' },
] as const;

export const featureGrid = [
  { title: 'Import Dashboard', body: 'All leagues at a glance', color: 'bg-blue-600/30 border-blue-500/30' },
  { title: 'Start/Sit Optimizer', body: 'Weekly picks per league', color: 'bg-emerald-600/30 border-emerald-500/30' },
  { title: 'Trade Analyzer', body: 'Plain-English explanations', color: 'bg-purple-600/30 border-purple-500/30' },
  { title: 'Waiver Wire Targets', body: 'Best available now', color: 'bg-rose-600/30 border-rose-500/30' },
  { title: 'Dynasty Strategy Engine', body: '3-year window advice', color: 'bg-amber-600/30 border-amber-500/30' },
  { title: 'Rookie Pick Intelligence', body: 'Next draft scouting', color: 'bg-teal-600/30 border-teal-500/30' },
] as const;

export const flowSteps = [
  { n: '1', title: 'Import Your Leagues', body: 'Securely connect your Sleeper account', color: 'bg-blue-600/80 border-blue-400/40' },
  { n: '2', title: 'We Analyze Everything', body: 'Rosters, projections, trades, future picks', color: 'bg-emerald-600/80 border-emerald-400/40' },
  { n: '3', title: 'Get Weekly Decisions', body: 'Sit/start picks, trade targets, strategy advice', color: 'bg-amber-600/80 border-amber-400/40' },
] as const;
