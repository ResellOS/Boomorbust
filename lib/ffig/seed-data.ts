import type { FFigInput } from './engine';
import { ROOKIE_2025_FFIG_SEEDS } from '@/lib/rookies/rookie2025Board';

// [name, pos, year, round, pick, college, team, age, dom, ras, breakoutAge|null, targetShare,
//  smallSchool, committee, p2sBust, vacVolMod, qbCoeffMod, schemeMod, hit|null, ppg|null]
type Row = [
  string, 'QB'|'RB'|'WR'|'TE', number, number, number,
  string, string, number, number, number, number|null, number,
  boolean, boolean, boolean, number, number, number,
  boolean|null, number|null
];

const RAW: Row[] = [
  // ── 2000 ──────────────────────────────────────────────────────────────────
  ['Tom Brady',        'QB', 2000, 6, 199, 'Michigan',       'NE',  22.5, 42, 4.2, 22,   0, false, false, true,  0,    0,    0,    true,  24.1],
  ['Jamal Lewis',      'RB', 2000, 1,   5, 'Tennessee',      'BAL', 22.0, 82, 7.8, 21,  54, false, false, false, 0,    0,    0,    true,  18.4],
  ['Plaxico Burress',  'WR', 2000, 1,   8, 'Michigan State', 'PIT', 22.0, 68, 9.3, 22,  28, false, false, false, 0,   -0.1,  0,    true,  14.2],
  ['Travis Taylor',    'WR', 2000, 1,  10, 'Florida',        'BAL', 22.0, 72, 8.9, 21,  32, false, false, false, 0.1, -0.1,  0,    false,  8.1],
  ['Brian Westbrook',  'RB', 2000, 3,  91, 'Villanova',      'PHI', 23.0, 88, 8.1, 21,  38, true,  false, false, 0.1,  0,    0,    true,  19.2],

  // ── 2001 ──────────────────────────────────────────────────────────────────
  ['LaDainian Tomlinson','RB',2001,1, 5, 'TCU',           'SD',  21.5, 92, 7.3, 20,  58, false, false, false, 0.1,  0,    0.05, true,  28.2],
  ['Reggie Wayne',     'WR', 2001, 1,  30, 'Miami FL',       'IND', 22.5, 74, 8.2, 22,  28, false, false, false, 0,    0.1,  0.05, true,  16.8],
  ['Santana Moss',     'WR', 2001, 1,  16, 'Miami FL',       'NYJ', 22.0, 75, 9.6, 22,  26, false, false, false, 0,   -0.1,  0,    true,  12.8],
  ['Chris Chambers',   'WR', 2001, 2,  52, 'Wisconsin',      'MIA', 24.0, 68, 8.8, 23,  30, false, false, false, 0.1, -0.1,  0,    true,  14.1],
  ['Alge Crumpler',    'TE', 2001, 2,  35, 'North Carolina', 'ATL', 22.0, 58, 7.4, 22,  22, false, false, false, 0,    0,    0,    true,  11.2],

  // ── 2002 ──────────────────────────────────────────────────────────────────
  ['Clinton Portis',   'RB', 2002, 2,  51, 'Colorado',       'DEN', 21.0, 85, 8.7, 20,  52, false, false, false, 0.1,  0,    0.05, true,  18.9],
  ['Javon Walker',     'WR', 2002, 1,  20, 'Florida State',  'GB',  23.0, 72, 8.8, 22,  28, false, false, false, 0,    0.1,  0.05, true,  14.2],
  ['Anquan Boldin',    'WR', 2002, 2,  54, 'Florida State',  'ARI', 22.0, 78, 7.1, 22,  34, false, false, true,  0,   -0.1,  0,    true,  15.6],
  ['Ashley Lelie',     'WR', 2002, 1,  19, 'Hawaii',         'DEN', 22.0, 82, 9.4, 21,  38, true,  false, false, 0,    0,    0.05, false,  9.8],
  ['T.J. Duckett',     'RB', 2002, 1,  18, 'Michigan State', 'ATL', 22.0, 78, 8.2, 21,  44, false, true,  false, 0,    0,    0,    false,  6.2],

  // ── 2003 ──────────────────────────────────────────────────────────────────
  ['Andre Johnson',    'WR', 2003, 1,   3, 'Miami FL',       'HOU', 21.5, 84, 9.2, 21,  38, false, false, false, 0.1, -0.1,  0,    true,  16.4],
  ['Willis McGahee',   'RB', 2003, 1,  23, 'Miami FL',       'BUF', 21.0, 88, 8.2, 20,  62, false, false, false, 0.1, -0.1,  0,    true,  17.2],
  ['Larry Johnson',    'RB', 2003, 1,  27, 'Penn State',     'KC',  23.0, 86, 8.4, 22,  68, false, true,  false, 0,    0,    0,    true,  19.8],
  ['Lee Evans',        'WR', 2003, 1,  13, 'Wisconsin',      'BUF', 23.0, 76, 9.5, 22,  32, false, false, false, 0.1, -0.1,  0,    true,  13.6],
  ['Dallas Clark',     'TE', 2003, 1,  24, 'Iowa',           'IND', 23.5, 62, 7.8, 23,  26, false, false, false, 0,    0.1,  0.05, true,  13.2],

  // ── 2004 ──────────────────────────────────────────────────────────────────
  ['Larry Fitzgerald', 'WR', 2004, 1,   3, 'Pittsburgh',     'ARI', 20.5, 92, 8.5, 20,  48, false, false, false, 0,   -0.1,  0,    true,  18.2],
  ['Roy Williams',     'WR', 2004, 1,   7, 'Texas',          'DET', 21.5, 76, 8.7, 21,  34, false, false, false, 0.1, -0.1,  0,    true,  13.4],
  ['Reggie Williams',  'WR', 2004, 1,   9, 'Washington',     'JAC', 21.5, 80, 8.4, 20,  36, false, false, false, 0.1, -0.1,  0,    false,  8.2],
  ['Ben Roethlisberger','QB',2004, 1,  11, 'Miami OH',       'PIT', 22.0, 82, 7.2, 21,   0, true,  false, false, 0,    0,    0,    true,  22.8],
  ['Kevin Jones',      'RB', 2004, 1,  30, 'Virginia Tech',  'DET', 22.0, 84, 9.2, 21,  56, false, true,  false, 0,   -0.1,  0,    false, 10.4],

  // ── 2005 ──────────────────────────────────────────────────────────────────
  ['Ronnie Brown',     'RB', 2005, 1,   2, 'Auburn',         'MIA', 24.0, 82, 8.6, 23,  46, false, false, false, 0.1, -0.1,  0,    true,  16.4],
  ['Cadillac Williams','RB', 2005, 1,   5, 'Auburn',         'TB',  23.0, 88, 8.4, 22,  54, false, false, false, 0.1, -0.1,  0,    false, 12.2],
  ['Braylon Edwards',  'WR', 2005, 1,   3, 'Michigan',       'CLE', 22.0, 82, 8.7, 21,  38, false, false, false, 0.1, -0.1,  0,    true,  14.8],
  ['Heath Miller',     'TE', 2005, 1,  30, 'Virginia',       'PIT', 22.0, 68, 7.1, 22,  28, false, false, false, 0,    0.1,  0.05, true,  11.6],
  ['Frank Gore',       'RB', 2005, 3,  65, 'Miami FL',       'SF',  22.0, 72, 7.5, 22,  44, false, true,  false, 0,    0,    0,    true,  17.8],

  // ── 2006 ──────────────────────────────────────────────────────────────────
  ['Vernon Davis',     'TE', 2006, 1,   6, 'Maryland',       'SF',  22.0, 72, 9.9, 21,  30, false, false, false, 0,   -0.1,  0,    true,  14.8],
  ['Santonio Holmes',  'WR', 2006, 1,  25, 'Ohio State',     'PIT', 22.0, 76, 8.8, 21,  32, false, false, false, 0,    0.1,  0.05, true,  13.2],
  ['Greg Jennings',    'WR', 2006, 2,  52, 'Western Michigan','GB', 22.5, 88, 8.6, 22,  40, true,  false, false, 0,    0.1,  0.05, true,  14.8],
  ['Matt Leinart',     'QB', 2006, 1,  10, 'USC',            'ARI', 23.0, 78, 5.8, 22,   0, false, false, true,  0,    0,    0,    false,  8.4],
  ['Vince Young',      'QB', 2006, 1,   3, 'Texas',          'TEN', 22.5, 88, 9.3, 22,   0, false, false, false, 0,    0,    0,    false, 14.2],

  // ── 2007 ──────────────────────────────────────────────────────────────────
  ['Calvin Johnson',   'WR', 2007, 1,   2, 'Georgia Tech',   'DET', 21.5, 95, 9.9, 20,  52, false, false, false, 0.1, -0.1,  0,    true,  22.8],
  ['Adrian Peterson',  'RB', 2007, 1,   7, 'Oklahoma',       'MIN', 21.5, 90, 9.7, 21,  62, false, false, false, 0.1,  0,    0,    true,  25.4],
  ['Marshawn Lynch',   'RB', 2007, 1,  12, 'California',     'BUF', 21.0, 84, 8.6, 20,  56, false, false, false, 0.1, -0.1,  0,    true,  18.6],
  ['Dwayne Bowe',      'WR', 2007, 1,  23, 'LSU',            'KC',  22.5, 76, 8.4, 22,  30, false, false, false, 0,   -0.1,  0,    true,  13.8],
  ['Ted Ginn Jr',      'WR', 2007, 1,   9, 'Ohio State',     'MIA', 22.0, 62, 9.9, 21,  24, false, false, false, 0,   -0.1,  0,    false,  8.2],

  // ── 2008 ──────────────────────────────────────────────────────────────────
  ['Matt Ryan',        'QB', 2008, 1,   3, 'Boston College', 'ATL', 23.0, 78, 6.2, 22,   0, false, false, false, 0,    0,    0.05, true,  24.2],
  ['DeSean Jackson',   'WR', 2008, 2,  49, 'California',     'PHI', 21.5, 78, 9.4, 21,  30, false, false, false, 0,    0.1,  0.05, true,  14.6],
  ['Darren McFadden',  'RB', 2008, 1,   4, 'Arkansas',       'OAK', 20.5, 90, 9.4, 20,  62, false, false, false, 0,   -0.1,  0,    false, 13.6],
  ['Jonathan Stewart', 'RB', 2008, 1,  13, 'Oregon',         'CAR', 21.0, 84, 8.8, 21,  54, false, true,  false, 0,    0,    0,    true,  13.4],
  ['Lance Moore',      'WR', 2008, 5, 152, 'Toledo',         'NO',  22.0, 82, 7.4, 22,  36, true,  false, true,  0,    0.1,  0.05, true,  11.8],

  // ── 2009 ──────────────────────────────────────────────────────────────────
  ['Matthew Stafford', 'QB', 2009, 1,   1, 'Georgia',        'DET', 21.0, 72, 6.8, 21,   0, false, false, false, 0,    0,    0,    true,  22.6],
  ['LeSean McCoy',     'RB', 2009, 2,  53, 'Pittsburgh',     'PHI', 20.5, 82, 8.3, 20,  48, false, true,  false, 0,    0.1,  0.05, true,  21.4],
  ['Michael Crabtree', 'WR', 2009, 1,  10, 'Texas Tech',     'SF',  21.5, 88, 8.0, 20,  44, false, false, false, 0,   -0.1,  0.05, true,  14.2],
  ['Jeremy Maclin',    'WR', 2009, 1,  19, 'Missouri',       'PHI', 21.0, 82, 8.8, 20,  36, false, false, false, 0,    0.1,  0.05, true,  14.8],
  ['Percy Harvin',     'WR', 2009, 1,  22, 'Florida',        'MIN', 21.0, 74, 9.7, 21,  24, false, false, false, 0,   -0.1,  0,    true,  13.8],

  // ── 2010 ──────────────────────────────────────────────────────────────────
  ['Sam Bradford',     'QB', 2010, 1,   1, 'Oklahoma',       'STL', 22.5, 82, 6.1, 21,   0, false, false, false, 0,    0,    0.05, false, 16.8],
  ['Dez Bryant',       'WR', 2010, 1,  24, 'Oklahoma State', 'DAL', 21.5, 88, 8.9, 21,  40, false, false, false, 0,    0.1,  0.05, true,  18.4],
  ['Rob Gronkowski',   'TE', 2010, 2,  42, 'Arizona',        'NE',  21.0, 72, 9.1, 21,  28, false, false, false, 0,    0.1,  0.05, true,  22.6],
  ['CJ Spiller',       'RB', 2010, 1,   9, 'Clemson',        'BUF', 22.5, 82, 9.9, 22,  42, false, true,  false, 0,   -0.1,  0,    true,  16.2],
  ['Jimmy Graham',     'TE', 2010, 4, 255, 'Miami FL',       'NO',  23.5, 52, 9.2, null,18, false, false, true,  0.1,  0.1,  0.05, true,  18.8],

  // ── 2011 ──────────────────────────────────────────────────────────────────
  ['Cam Newton',       'QB', 2011, 1,   1, 'Auburn',         'CAR', 21.5, 85, 9.5, 21,   0, false, false, false, 0,    0,    0,    true,  26.8],
  ['AJ Green',         'WR', 2011, 1,   4, 'Georgia',        'CIN', 22.5, 88, 9.3, 22,  38, false, false, false, 0,    0,    0,    true,  18.6],
  ['Julio Jones',      'WR', 2011, 1,   6, 'Alabama',        'ATL', 22.0, 82, 9.7, 21,  34, false, false, false, 0.1,  0.1,  0.05, true,  18.4],
  ['DeMarco Murray',   'RB', 2011, 3,  71, 'Oklahoma',       'DAL', 23.0, 78, 8.2, 22,  46, false, true,  false, 0,    0.1,  0.05, true,  18.8],
  ['Mark Ingram',      'RB', 2011, 1,  28, 'Alabama',        'NO',  21.5, 84, 7.8, 21,  52, false, true,  false, 0,    0,    0,    true,  14.2],

  // ── 2012 ──────────────────────────────────────────────────────────────────
  ['Andrew Luck',      'QB', 2012, 1,   1, 'Stanford',       'IND', 22.5, 78, 7.6, 22,   0, false, false, false, 0,    0,    0.05, true,  26.4],
  ['Trent Richardson', 'RB', 2012, 1,   3, 'Alabama',        'CLE', 21.5, 84, 8.6, 21,  54, false, false, false, 0.1, -0.1,  0,    false, 10.8],
  ['Doug Martin',      'RB', 2012, 1,  31, 'Boise State',    'TB',  23.0, 82, 8.4, 22,  52, true,  false, false, 0.1, -0.1,  0,    true,  16.2],
  ['Russell Wilson',   'QB', 2012, 3,  75, 'Wisconsin',      'SEA', 23.0, 82, 8.6, 22,   0, false, false, true,  0,    0,    0,    true,  24.8],
  ['Michael Floyd',    'WR', 2012, 1,  13, 'Notre Dame',     'ARI', 22.5, 76, 8.2, 21,  32, false, false, false, 0,   -0.1,  0,    false,  9.4],

  // ── 2013 ──────────────────────────────────────────────────────────────────
  ['DeAndre Hopkins',  'WR', 2013, 1,  27, 'Clemson',        'HOU', 20.5, 84, 8.8, 20,  36, false, false, false, 0.1, -0.1,  0,    true,  17.8],
  ['Eddie Lacy',       'RB', 2013, 2,  61, 'Alabama',        'GB',  22.5, 82, 8.0, 22,  48, false, false, false, 0.1,  0.1,  0.05, true,  16.8],
  ['Tavon Austin',     'WR', 2013, 1,   8, 'West Virginia',  'STL', 22.0, 82, 9.8, 21,  28, false, false, false, 0,   -0.1,  0.05, false,  8.6],
  ['Cordarrelle Patterson','WR',2013,1,29,'Tennessee',       'MIN', 22.0, 58, 9.9, null,18, false, false, false, 0,   -0.1,  0,    false,  7.8],
  ['Giovani Bernard',  'RB', 2013, 2,  37, 'North Carolina', 'CIN', 22.0, 78, 8.2, 21,  36, false, true,  false, 0,    0,    0,    true,  12.4],

  // ── 2014 ──────────────────────────────────────────────────────────────────
  ['Odell Beckham Jr', 'WR', 2014, 1,  12, 'LSU',            'NYG', 21.5, 85, 9.0, 21,  36, false, false, false, 0.1,  0,    0.05, true,  21.8],
  ['Mike Evans',       'WR', 2014, 1,   7, 'Texas A&M',      'TB',  20.5, 88, 8.4, 20,  40, false, false, false, 0.1, -0.1,  0,    true,  19.2],
  ['Sammy Watkins',    'WR', 2014, 1,   4, 'Clemson',        'BUF', 21.0, 82, 9.4, 20,  34, false, false, false, 0,   -0.1,  0,    false, 12.4],
  ['Brandin Cooks',    'WR', 2014, 1,  20, 'Oregon State',   'NO',  20.5, 88, 8.8, 20,  38, false, false, false, 0.1,  0.1,  0.05, true,  17.2],
  ['Bishop Sankey',    'RB', 2014, 2,  54, 'Washington',     'TEN', 21.5, 88, 8.4, 21,  58, false, false, false, 0,   -0.1,  0,    false,  7.8],

  // ── 2015 ──────────────────────────────────────────────────────────────────
  ['Amari Cooper',     'WR', 2015, 1,   4, 'Alabama',        'OAK', 21.0, 86, 8.4, 20,  36, false, false, false, 0.1, -0.1,  0,    true,  18.6],
  ['Todd Gurley',      'RB', 2015, 1,  10, 'Georgia',        'STL', 21.0, 86, 9.3, 20,  58, false, false, false, 0.1,  0,    0,    true,  22.4],
  ['Melvin Gordon',    'RB', 2015, 1,  15, 'Wisconsin',      'SD',  21.5, 90, 8.6, 21,  62, false, false, false, 0.1, -0.1,  0,    true,  18.8],
  ['Marcus Mariota',   'QB', 2015, 1,   2, 'Oregon',         'TEN', 21.5, 86, 7.8, 21,   0, false, false, false, 0,    0,    0.05, false, 18.4],
  ['Tevin Coleman',    'RB', 2015, 3,  73, 'Indiana',        'ATL', 22.0, 82, 9.4, 22,  50, false, true,  false, 0,    0,    0.05, true,  14.2],

  // ── 2016 ──────────────────────────────────────────────────────────────────
  ['Ezekiel Elliott',  'RB', 2016, 1,   4, 'Ohio State',     'DAL', 20.5, 90, 8.9, 20,  62, false, false, false, 0.1,  0,    0,    true,  24.6],
  ['Will Fuller',      'WR', 2016, 1,  21, 'Notre Dame',     'HOU', 22.0, 76, 9.6, 21,  28, false, false, false, 0.1,  0,    0,    true,  14.2],
  ['Jordan Howard',    'RB', 2016, 5, 150, 'Indiana',        'CHI', 21.0, 90, 7.6, 21,  58, false, false, true,  0.1, -0.1,  0,    true,  15.8],
  ['Corey Coleman',    'WR', 2016, 1,  15, 'Baylor',         'CLE', 21.5, 88, 9.5, 21,  38, false, false, false, 0,   -0.1,  0.05, false,  9.2],
  ['Sterling Shepard', 'WR', 2016, 2,  40, 'Oklahoma',       'NYG', 23.0, 82, 7.6, 22,  34, false, false, false, 0,    0,    0.05, true,  13.8],

  // ── 2017 ──────────────────────────────────────────────────────────────────
  ['Christian McCaffrey','RB',2017,1,  8, 'Stanford',        'CAR', 21.0, 86, 8.8, 21,  56, false, false, false, 0.1,  0,    0.05, true,  26.8],
  ['Leonard Fournette', 'RB',2017,1,  4, 'LSU',             'JAC', 22.0, 88, 9.4, 21,  62, false, false, false, 0.1, -0.1,  0,    true,  17.6],
  ['Alvin Kamara',     'RB', 2017, 3,  67, 'Tennessee',      'NO',  22.0, 72, 8.2, 22,  38, false, true,  false, 0,    0.1,  0.05, true,  22.4],
  ['Cooper Kupp',      'WR', 2017, 3,  69, 'Eastern WA',     'LAR', 23.5, 90, 6.2, 23,  46, true,  false, false, 0,    0.1,  0.05, true,  20.2],
  ['JuJu Smith-Schuster','WR',2017,2, 62, 'USC',             'PIT', 20.5, 72, 7.8, 20,  28, false, false, false, 0,    0.1,  0.05, true,  16.4],
  ['Kareem Hunt',      'RB', 2017, 3,  86, 'Toledo',         'KC',  22.0, 78, 7.8, 22,  44, true,  false, true,  0,    0.1,  0.05, true,  19.2],

  // ── 2018 ──────────────────────────────────────────────────────────────────
  ['Saquon Barkley',   'RB', 2018, 1,   2, 'Penn State',     'NYG', 21.0, 90, 9.9, 21,  60, false, false, false, 0.1, -0.1,  0,    true,  24.6],
  ['Calvin Ridley',    'WR', 2018, 1,  26, 'Alabama',        'ATL', 23.0, 82, 9.1, 22,  32, false, false, false, 0,    0.1,  0.05, true,  17.8],
  ['DJ Moore',         'WR', 2018, 1,  24, 'Maryland',       'CAR', 21.5, 78, 8.6, 21,  32, false, false, false, 0.1,  0,    0,    true,  17.4],
  ['Baker Mayfield',   'QB', 2018, 1,   1, 'Oklahoma',       'CLE', 23.0, 86, 7.4, 22,   0, false, false, false, 0,    0,    0.05, false, 18.8],
  ['Courtland Sutton', 'WR', 2018, 2,  40, 'SMU',            'DEN', 22.5, 82, 9.5, 22,  34, false, false, false, 0.1, -0.1,  0,    true,  17.2],

  // ── 2019 ──────────────────────────────────────────────────────────────────
  ['AJ Brown',         'WR', 2019, 2,  51, 'Ole Miss',       'TEN', 21.5, 86, 9.0, 21,  34, false, false, false, 0.1, -0.1,  0,    true,  20.4],
  ['DK Metcalf',       'WR', 2019, 2,  64, 'Ole Miss',       'SEA', 21.5, 78, 9.8, 21,  32, false, false, false, 0.1,  0.1,  0.05, true,  18.8],
  ['Terry McLaurin',   'WR', 2019, 3,  76, 'Ohio State',     'WAS', 23.5, 72, 9.4, 23,  26, false, false, true,  0.1, -0.1,  0,    true,  15.8],
  ['Marquise Brown',   'WR', 2019, 1,  25, 'Oklahoma',       'BAL', 22.0, 82, 9.6, 22,  32, false, false, false, 0,   -0.1,  0,    true,  14.8],
  ['Miles Sanders',    'RB', 2019, 2,  53, 'Penn State',     'PHI', 21.5, 72, 8.8, 21,  44, false, true,  false, 0,    0,    0.05, true,  14.2],

  // ── 2020 ──────────────────────────────────────────────────────────────────
  ['Justin Jefferson', 'WR', 2020, 1,  22, 'LSU',            'MIN', 21.0, 78, 8.0, 21,  28, false, false, false, 0.1,  0.1,  0.05, true,  24.8],
  ['CeeDee Lamb',      'WR', 2020, 1,  17, 'Oklahoma',       'DAL', 21.0, 88, 8.4, 21,  36, false, false, false, 0.1,  0.1,  0.05, true,  22.4],
  ['Jonathan Taylor',  'RB', 2020, 2,  41, 'Wisconsin',      'IND', 21.5, 92, 9.0, 21,  64, false, false, false, 0.1,  0.1,  0,    true,  26.2],
  ['Justin Herbert',   'QB', 2020, 1,   6, 'Oregon',         'LAC', 22.0, 76, 8.9, 22,   0, false, false, false, 0,    0,    0.05, true,  26.8],
  ['Tee Higgins',      'WR', 2020, 2,  33, 'Clemson',        'CIN', 21.5, 78, 8.8, 21,  32, false, false, false, 0,    0.1,  0,    true,  17.4],
  ['Clyde Edwards-Helaire','RB',2020,1,32,'LSU',             'KC',  21.0, 80, 7.6, 21,  42, false, false, false, 0.1,  0.1,  0.05, false, 13.8],

  // ── 2021 ──────────────────────────────────────────────────────────────────
  ['Ja\'Marr Chase',   'WR', 2021, 1,   5, 'LSU',            'CIN', 21.0, 95, 9.0, 20,  42, false, false, false, 0,    0.1,  0,    true,  24.6],
  ['Najee Harris',     'RB', 2021, 1,  24, 'Alabama',        'PIT', 23.0, 90, 7.8, 22,  56, false, false, false, 0.1, -0.1,  0,    true,  17.4],
  ['Kyle Pitts',       'TE', 2021, 1,   4, 'Florida',        'ATL', 20.5, 82, 9.8, 20,  36, false, false, false, 0.1, -0.1,  0,    true,  18.4],
  ['Jaylen Waddle',    'WR', 2021, 1,   6, 'Alabama',        'MIA', 22.5, 78, 9.3, 22,  26, false, false, false, 0.1, -0.1,  0,    true,  18.2],
  ['Travis Etienne',   'RB', 2021, 1,  25, 'Clemson',        'JAC', 22.0, 86, 9.0, 21,  52, false, false, false, 0.1,  0,    0,    true,  18.6],
  ['Rashod Bateman',   'WR', 2021, 1,  27, 'Minnesota',      'BAL', 22.0, 82, 8.8, 21,  32, false, false, false, 0,   -0.1,  0,    false, 11.8],

  // ── 2022 ──────────────────────────────────────────────────────────────────
  ['Breece Hall',      'RB', 2022, 2,  36, 'Iowa State',     'NYJ', 21.0, 92, 9.1, 21,  60, false, false, false, 0.1,  0,    0.05, true,  22.4],
  ['Garrett Wilson',   'WR', 2022, 1,  10, 'Ohio State',     'NYJ', 22.0, 82, 8.6, 21,  30, false, false, false, 0,   -0.1,  0,    true,  17.6],
  ['Drake London',     'WR', 2022, 1,   8, 'USC',            'ATL', 21.5, 82, 8.2, 21,  36, false, false, false, 0.1, -0.1,  0,    true,  16.2],
  ['Chris Olave',      'WR', 2022, 1,  11, 'Ohio State',     'NO',  22.0, 78, 8.8, 21,  26, false, false, false, 0.1, -0.1,  0,    true,  17.2],
  ['Christian Watson', 'WR', 2022, 2,  34, 'NDSU',           'GB',  22.5, 72, 9.6, 22,  28, true,  false, false, 0,    0.1,  0.05, true,  14.8],
  ['Dameon Pierce',    'RB', 2022, 4, 107, 'Florida',        'HOU', 22.5, 72, 8.4, 22,  38, false, false, true,  0.1, -0.1,  0,    true,  15.2],

  // ── 2023 ──────────────────────────────────────────────────────────────────
  ['CJ Stroud',        'QB', 2023, 1,   2, 'Ohio State',     'HOU', 21.5, 82, 7.8, 21,   0, false, false, false, 0,    0,    0.05, true,  28.4],
  ['Bijan Robinson',   'RB', 2023, 1,   8, 'Texas',          'ATL', 21.5, 92, 9.2, 21,  62, false, false, false, 0.1,  0,    0.05, true,  22.4],
  ['Jaxon Smith-Njigba','WR',2023,1,  20, 'Ohio State',      'SEA', 21.0, 72, 7.8, 21,  28, false, false, false, 0.1,  0,    0.05, true,  16.4],
  ['Zay Flowers',      'WR', 2023, 1,  22, 'Boston College', 'BAL', 22.5, 86, 9.0, 22,  36, false, false, false, 0,    0.1,  0,    true,  16.8],
  ['Rashee Rice',      'WR', 2023, 2,  55, 'SMU',            'KC',  22.0, 88, 8.6, 22,  40, true,  false, false, 0,    0.1,  0.05, true,  18.8],

  // ── 2024 ──────────────────────────────────────────────────────────────────
  ['Marvin Harrison Jr','WR',2024,1,  4, 'Ohio State',       'ARI', 21.0, 88, 9.4, 20,  42, false, false, false, 0.1, -0.1,  0,    true,  17.8],
  ['Malik Nabers',     'WR', 2024, 1,   6, 'LSU',            'NYG', 21.0, 88, 8.8, 21,  38, false, false, false, 0.1, -0.1,  0,    true,  19.2],
  ['Rome Odunze',      'WR', 2024, 1,   9, 'Washington',     'CHI', 22.0, 82, 9.2, 22,  34, false, false, false, 0,   -0.1,  0,    true,  14.2],
  ['Brian Thomas Jr',  'WR', 2024, 1,  23, 'LSU',            'JAC', 21.5, 82, 9.4, 21,  36, false, false, false, 0.1, -0.1,  0,    true,  18.4],
  ['Brock Bowers',     'TE', 2024, 1,  13, 'Georgia',        'LV',  21.0, 86, 9.0, 20,  40, false, false, false, 0.1, -0.1,  0,    true,  22.8],

  // ── 2025 NFL draft class (canonical rows in lib/rookies/rookie2025Board.ts) ──
  ...(ROOKIE_2025_FFIG_SEEDS as Row[]),
];

export const HISTORICAL_PROSPECTS: FFigInput[] = RAW.map(
  ([name,pos,year,round,pick,college,team,age,dom,ras,breakout,ts,small,committee,p2s,vvm,qcm,scheme,hit,ppg]) => ({
    player_name:                name,
    position:                   pos,
    draft_year:                 year,
    draft_round:                round,
    draft_pick:                 pick,
    college,
    nfl_team:                   team,
    age_at_draft:               age,
    dom_score:                  dom,
    ras_score:                  ras,
    breakout_age:               breakout,
    target_share:               ts,
    small_school_penalty:       small,
    committee_backfield_penalty:committee,
    p2s_bust_penalty:           p2s,
    vacated_volume_mod:         vvm,
    qb_coefficient_mod:         qcm,
    scheme_proe_mod:            scheme,
    dynasty_hit:                hit,
    career_ppg:                 ppg,
  })
);
