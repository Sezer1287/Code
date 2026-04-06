import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { toPng } from 'html-to-image';
import {
  buildDashboardMetrics,
  buildPlayerStatsRows,
  filterEventsByPeriod,
  buildMatchSummaryTimeline,
  buildPlayerDetailModalData,
} from '../domain/dashboardStats';
import { DEFAULT_FORMATION, FORMATION_LAYOUTS, createSlotsForFormation } from '../domain/formations';

const ACCENT_COLOR = '#ff2a63';
const PANEL_BG = '#f8f9fb';
const STATS_SHELL_MAX_WIDTH = 980;
const SUMMARY_BORDER_COLOR = '#e0e3e8';
const SUMMARY_TEXT_PRIMARY = '#112032';
const SUMMARY_TEXT_MUTED = '#677180';

const PRIMARY_NAV_TABS = [
  { id: 'match', label: 'MATCH', enabled: true },
  { id: 'report', label: 'REPORT', enabled: false },
  { id: 'h2h', label: 'H2H', enabled: false },
  { id: 'standings', label: 'STANDINGS', enabled: false },
  { id: 'news', label: 'NEWS', enabled: false },
  { id: 'video', label: 'VIDEO', enabled: false },
];

const SECONDARY_TABS = [
  { id: 'summary', label: 'SUMMARY', enabled: true },
  { id: 'stats', label: 'STATS', enabled: true },
  { id: 'lineups', label: 'LINEUPS', enabled: true },
  { id: 'player_stats', label: 'PLAYER STATS', enabled: true },
  { id: 'commentary', label: 'COMMENTARY', enabled: false },
];

const STATS_PERIOD_TABS = [
  { id: 'match', label: 'MATCH' },
  { id: 'first_half', label: '1ST HALF' },
  { id: 'second_half', label: '2ND HALF' },
];

const STATS_COMPARISON_TABS = [
  { id: 'top_stats', label: 'TOP STATS' },
  { id: 'shots', label: 'SHOTS' },
  { id: 'attack', label: 'ATTACK' },
  { id: 'passes', label: 'PASSES' },
  { id: 'defense', label: 'DEFENSE' },
  { id: 'goalkeeping', label: 'GOALKEEPING' },
];

const IG_STORY_METRIC_ROWS = [
  { id: 'top_xg', label: 'Expected goals (xG)' },
  { id: 'top_possession', label: 'Ball possession' },
  { id: 'top_total_shots', label: 'Total shots' },
  { id: 'top_shots_on_target', label: 'Shots on target' },
  { id: 'top_big_chances', label: 'Big chances' },
];

const PLAYER_STATS_COLUMN_WIDTHS = {
  player: 218,
  rating: 76,
  totalShots: 92,
  goals: 76,
  minutes: 98,
  touches: 86,
  touchesOppositionBox: 148,
  passesAS: 126,
  dribblesAS: 126,
  duels: 84,
  expectedGoals: 140,
  xgot: 146,
  expectedAssists: 146,
  finalThirdPassesAS: 186,
  longPassesAS: 156,
  crossesAS: 136,
  aerialAS: 132,
  groundDuelsWon: 136,
  tackleWin: 116,
  foulCommitted: 132,
  interception: 112,
  clearance: 102,
  errorLeadsGoal: 154,
  errorLeadsShot: 154,
  goalsConceded: 132,
  goalsPrevented: 132,
  xgotFaced: 118,
  punches: 96,
  throws: 92,
  sweeperActions: 122,
  ownGoals: 98,
  yellowCards: 112,
  redCards: 96,
  shotOn: 116,
  shotOff: 116,
  shotBlocked: 112,
  shotInsideBox: 148,
  shotOutsideBox: 156,
  shotHeader: 126,
  bigChancesCreated: 148,
  bigChancesMissed: 142,
  assists: 88,
  offsides: 88,
  foulWon: 118,
  saves: 126,
};

const OUR_LINEUP_FALLBACK_FORMATION = '3-5-2';
const OPPONENT_LINEUP_FALLBACK_FORMATION = '4-3-3';
const LINEUP_PITCH_HEIGHT = 560;
const LINEUP_EVENT_ICON_ORDER = [
  'goal',
  'assist',
  'penalty_goal',
  'penalty_miss',
  'substitution',
  'yellow_card',
  'red_card',
  'blue_card',
];
const LINEUP_RATING_VARIANCE_PATTERN = [0.45, 0.2, -0.1, 0.35, -0.2, 0.1, -0.3, 0.25, -0.15, 0.05, -0.05];

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeFormationKey(candidate, fallback = DEFAULT_FORMATION) {
  const normalized = String(candidate || '').trim();
  if (normalized && FORMATION_LAYOUTS[normalized]) {
    return normalized;
  }
  return fallback;
}

function splitLineupsByRole(lineups = []) {
  const starters = [];
  const bench = [];

  lineups.forEach((lineup) => {
    if (!lineup?.player_id) {
      return;
    }

    const isBench = lineup.role === 'bench' || lineup.slot_label === 'BENCH';
    if (isBench) {
      bench.push(lineup);
      return;
    }
    starters.push(lineup);
  });

  const sortBySlot = (first, second) => {
    const firstOrder = Number.isFinite(first.slot_order) ? first.slot_order : Number.MAX_SAFE_INTEGER;
    const secondOrder = Number.isFinite(second.slot_order) ? second.slot_order : Number.MAX_SAFE_INTEGER;
    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }
    return String(first.created_at || '').localeCompare(String(second.created_at || ''));
  };

  return {
    starters: starters.sort(sortBySlot),
    bench: bench.sort(sortBySlot),
  };
}

function detectFormationFromStarterSlots(starters = [], fallback = OUR_LINEUP_FALLBACK_FORMATION) {
  const fromSlot = String(starters[0]?.slot_id || '').split('_r')[0];
  if (fromSlot && FORMATION_LAYOUTS[fromSlot]) {
    return fromSlot;
  }
  return normalizeFormationKey(fallback, OUR_LINEUP_FALLBACK_FORMATION);
}

function formatFormationLabel(formationKey = '') {
  const label = String(formationKey || '').trim();
  return label || '-';
}

function getSlotRole(slotLabel = '') {
  const normalized = String(slotLabel || '').trim().toUpperCase();
  if (!normalized) {
    return '';
  }

  const prefixes = ['GK', 'CB', 'RB', 'LB', 'CM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const matched = prefixes.find(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`) || normalized.startsWith(prefix),
  );
  return matched || '';
}

function bindStartersToFormation(formationKey, starters = []) {
  const targetFormation = normalizeFormationKey(formationKey, OUR_LINEUP_FALLBACK_FORMATION);
  const baseSlots = createSlotsForFormation(targetFormation);
  const startersBySlotId = starters.reduce((lookup, slot) => {
    lookup[slot.slot_id] = slot.player_id || '';
    return lookup;
  }, {});

  const mappedBySlotId = baseSlots.map((slot) => ({
    ...slot,
    player_id: startersBySlotId[slot.slot_id] || '',
  }));
  if (mappedBySlotId.some((slot) => Boolean(slot.player_id))) {
    return mappedBySlotId;
  }

  const starterIds = starters.map((slot) => slot.player_id).filter(Boolean);
  return baseSlots.map((slot, index) => ({
    ...slot,
    player_id: starterIds[index] || '',
  }));
}

function buildFormationPitchPositions(slots = [], side = 'our') {
  if (!slots.length) {
    return [];
  }

  const groupedByRow = slots.reduce((lookup, slot) => {
    const rowKey = Number.isFinite(slot.row_index) ? slot.row_index : 0;
    if (!lookup[rowKey]) {
      lookup[rowKey] = [];
    }
    lookup[rowKey].push(slot);
    return lookup;
  }, {});

  const rowKeys = Object.keys(groupedByRow)
    .map((key) => Number(key))
    .sort((first, second) => first - second);
  const rowCount = rowKeys.length || 1;
  const frontX = side === 'our' ? 43 : 57;
  const keeperX = side === 'our' ? 4 : 96;
  const xBounds = side === 'our' ? [6, 46] : [54, 94];
  const yBounds = [10, 90];

  return rowKeys.flatMap((rowKey, rowOrderIndex) => {
    const rowSlots = groupedByRow[rowKey]
      .slice()
      .sort((first, second) => (first.column_index ?? 0) - (second.column_index ?? 0));
    const depth = rowCount === 1 ? 0 : rowOrderIndex / (rowCount - 1);
    const baseX = frontX + (keeperX - frontX) * depth;
    const rowSize = rowSlots.length || 1;
    const centerColumn = (rowSize - 1) / 2;

    return rowSlots.map((slot, columnOrderIndex) => {
      const spreadProgress = rowSize === 1 ? 0.5 : (columnOrderIndex + 1) / (rowSize + 1);
      const baseY = spreadProgress * 100;
      const outwardDirection = side === 'our' ? -1 : 1;
      const depthJitter = (0.18 + rowOrderIndex * 0.12) * outwardDirection;
      const parityJitter = (columnOrderIndex % 2 === 0 ? -0.24 : 0.24) * outwardDirection;
      const spreadJitterY = (columnOrderIndex - centerColumn) * 0.62;
      const rowPullBackByDepth = [0.8, 1.4, 2.2, 2.8, 3.2];
      const rowPullBack = rowPullBackByDepth[rowOrderIndex] ?? rowPullBackByDepth[rowPullBackByDepth.length - 1];

      return {
        ...slot,
        pitchX: clampNumber(baseX + depthJitter + parityJitter + rowPullBack * outwardDirection, xBounds[0], xBounds[1]),
        pitchY: clampNumber(baseY + spreadJitterY, yBounds[0], yBounds[1]),
      };
    });
  });
}

function createEmptyIconCountMap() {
  return {
    goal: 0,
    assist: 0,
    penalty_goal: 0,
    penalty_miss: 0,
    blue_card: 0,
    yellow_card: 0,
    red_card: 0,
    substitution: 0,
  };
}

function incrementIconCount(targetMap, ownerKey, iconType) {
  const normalizedOwner = String(ownerKey || '').trim();
  if (!normalizedOwner || !LINEUP_EVENT_ICON_ORDER.includes(iconType)) {
    return;
  }

  if (!targetMap[normalizedOwner]) {
    targetMap[normalizedOwner] = createEmptyIconCountMap();
  }
  targetMap[normalizedOwner][iconType] += 1;
}

function buildOurIconCounts(matchEvents = []) {
  const countsByPlayer = {};
  const explicitAssistKeys = new Set();

  matchEvents.forEach((event) => {
    if (event.type !== 'assist') {
      return;
    }
    const key = `${event.action_group_id || event.id || ''}:${event.player_id || ''}`;
    explicitAssistKeys.add(key);
    incrementIconCount(countsByPlayer, event.player_id, 'assist');
  });

  matchEvents.forEach((event) => {
    if (event.type === 'goal') {
      if (event.source_action === 'penalty_won') {
        incrementIconCount(countsByPlayer, event.player_id, 'penalty_goal');
      } else {
        incrementIconCount(countsByPlayer, event.player_id, 'goal');
      }

      const assistPlayerId = String(event.assist_player_id || event.assisted_by_id || '').trim();
      if (assistPlayerId) {
        const assistKey = `${event.action_group_id || event.id || ''}:${assistPlayerId}`;
        if (!explicitAssistKeys.has(assistKey)) {
          incrementIconCount(countsByPlayer, assistPlayerId, 'assist');
        }
      }
      return;
    }

    if (
      event.type === 'yellow_card' ||
      event.type === 'red_card' ||
      event.type === 'blue_card'
    ) {
      incrementIconCount(countsByPlayer, event.player_id, event.type);
      return;
    }

    if (
      event.type === 'penalty_won' &&
      !event.is_derived &&
      event.penalty_outcome === 'missed'
    ) {
      incrementIconCount(countsByPlayer, event.penalty_taker_id || event.player_id, 'penalty_miss');
      return;
    }

    if (event.type === 'substitution' && !event.is_derived) {
      incrementIconCount(countsByPlayer, event.player_in_id, 'substitution');
      incrementIconCount(countsByPlayer, event.player_out_id || event.player_id, 'substitution');
    }
  });

  return countsByPlayer;
}

function getRatingColorByValue(rawRating = 0) {
  const rating = clampNumber(Number(rawRating) || 0, 0, 10);
  if (rating >= 9) {
    return '#1f5cff';
  }
  if (rating >= 8) {
    return '#1d7a3f';
  }
  if (rating >= 7) {
    return '#5da614';
  }
  if (rating >= 6) {
    return '#e18b13';
  }
  return '#cf2f2f';
}

function getRatingBadgeStyles(rating, isBestPlayer) {
  return {
    backgroundColor: isBestPlayer ? '#1f5cff' : getRatingColorByValue(rating),
    color: '#ffffff',
    fontWeight: 900,
    borderRadius: 1.2,
    boxShadow: isBestPlayer ? '0 0 0 2px rgba(31, 92, 255, 0.2), 0 4px 10px rgba(31, 92, 255, 0.35)' : '0 2px 6px rgba(20, 30, 42, 0.22)',
  };
}

function normalizeDisplayRating(value, fallback = 6) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return clampNumber(fallback, 0, 10);
  }
  return clampNumber(Number(numeric.toFixed(1)), 0, 10);
}

function buildOpponentEventTotals(matchEvents = []) {
  const totals = createEmptyIconCountMap();
  const explicitAssistKeys = new Set();

  matchEvents.forEach((event) => {
    if (event.type !== 'assist') {
      return;
    }
    totals.assist += 1;
    explicitAssistKeys.add(`${event.action_group_id || event.id || ''}:${event.player_id || ''}`);
  });

  matchEvents.forEach((event) => {
    if (event.type === 'goal') {
      if (event.source_action === 'penalty_won') {
        totals.penalty_goal += 1;
      } else {
        totals.goal += 1;
      }
      const assistPlayerId = String(event.assist_player_id || event.assisted_by_id || '').trim();
      if (assistPlayerId) {
        const key = `${event.action_group_id || event.id || ''}:${assistPlayerId}`;
        if (!explicitAssistKeys.has(key)) {
          totals.assist += 1;
        }
      }
      return;
    }

    if (event.type === 'yellow_card') {
      totals.yellow_card += 1;
      return;
    }

    if (event.type === 'red_card') {
      totals.red_card += 1;
      return;
    }

    if (event.type === 'blue_card') {
      totals.blue_card += 1;
      return;
    }

    if (
      event.type === 'penalty_won' &&
      !event.is_derived &&
      event.penalty_outcome === 'missed'
    ) {
      totals.penalty_miss += 1;
      return;
    }

    if (event.type === 'substitution' && !event.is_derived) {
      totals.substitution += 1;
    }
  });

  return totals;
}

function sortSlotsByRolePreference(slots = [], preferredRoles = []) {
  const roleOrder = preferredRoles.reduce((lookup, role, index) => {
    lookup[role] = index;
    return lookup;
  }, {});

  return slots.slice().sort((first, second) => {
    const firstRole = getSlotRole(first.slot_label);
    const secondRole = getSlotRole(second.slot_label);
    const firstRank = Object.prototype.hasOwnProperty.call(roleOrder, firstRole) ? roleOrder[firstRole] : Number.MAX_SAFE_INTEGER;
    const secondRank = Object.prototype.hasOwnProperty.call(roleOrder, secondRole) ? roleOrder[secondRole] : Number.MAX_SAFE_INTEGER;
    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }
    if ((first.row_index ?? 0) !== (second.row_index ?? 0)) {
      return (first.row_index ?? 0) - (second.row_index ?? 0);
    }
    if ((first.column_index ?? 0) !== (second.column_index ?? 0)) {
      return (first.column_index ?? 0) - (second.column_index ?? 0);
    }
    return (first.slot_order ?? 0) - (second.slot_order ?? 0);
  });
}

function sortSlotsForSubstitutions(slots = []) {
  const rowSizes = slots.reduce((lookup, slot) => {
    const rowKey = Number.isFinite(slot.row_index) ? slot.row_index : 0;
    lookup[rowKey] = (lookup[rowKey] || 0) + 1;
    return lookup;
  }, {});

  return slots.slice().sort((first, second) => {
    const firstRowSize = rowSizes[first.row_index] || 1;
    const secondRowSize = rowSizes[second.row_index] || 1;
    const firstCenter = (firstRowSize - 1) / 2;
    const secondCenter = (secondRowSize - 1) / 2;
    const firstOuterRank = Math.abs((first.column_index ?? 0) - firstCenter);
    const secondOuterRank = Math.abs((second.column_index ?? 0) - secondCenter);

    if (firstOuterRank !== secondOuterRank) {
      return secondOuterRank - firstOuterRank;
    }
    if ((first.row_index ?? 0) !== (second.row_index ?? 0)) {
      return (first.row_index ?? 0) - (second.row_index ?? 0);
    }
    return (first.slot_order ?? 0) - (second.slot_order ?? 0);
  });
}

function distributeSyntheticOpponentIcons(opponentSlots = [], iconTotals = createEmptyIconCountMap()) {
  const countsBySlotId = opponentSlots.reduce((lookup, slot) => {
    lookup[slot.slot_id] = createEmptyIconCountMap();
    return lookup;
  }, {});

  const distributionByType = {
    goal: sortSlotsByRolePreference(opponentSlots, ['ST', 'LW', 'RW', 'CM', 'LM', 'RM']),
    assist: sortSlotsByRolePreference(opponentSlots, ['CM', 'LM', 'RM', 'LW', 'RW', 'ST']),
    penalty_goal: sortSlotsByRolePreference(opponentSlots, ['ST', 'LW', 'RW', 'CM', 'LM', 'RM']),
    penalty_miss: sortSlotsByRolePreference(opponentSlots, ['ST', 'LW', 'RW', 'CM', 'LM', 'RM']),
    substitution: sortSlotsForSubstitutions(opponentSlots),
    yellow_card: sortSlotsByRolePreference(opponentSlots, ['CB', 'LB', 'RB', 'CM', 'LM', 'RM', 'ST', 'LW', 'RW', 'GK']),
    red_card: sortSlotsByRolePreference(opponentSlots, ['CB', 'LB', 'RB', 'CM', 'LM', 'RM', 'ST', 'LW', 'RW', 'GK']),
    blue_card: sortSlotsByRolePreference(opponentSlots, ['CB', 'LB', 'RB', 'CM', 'LM', 'RM', 'ST', 'LW', 'RW', 'GK']),
  };

  LINEUP_EVENT_ICON_ORDER.forEach((iconType) => {
    const count = Math.max(0, Number(iconTotals[iconType]) || 0);
    const targets = distributionByType[iconType] || [];
    if (!count || !targets.length) {
      return;
    }

    for (let index = 0; index < count; index += 1) {
      const targetSlot = targets[index % targets.length];
      countsBySlotId[targetSlot.slot_id][iconType] += 1;
    }
  });

  return countsBySlotId;
}

function buildIconRailFromCounts(counts = createEmptyIconCountMap()) {
  return LINEUP_EVENT_ICON_ORDER.filter((iconType) => (Number(counts[iconType]) || 0) > 0);
}

function buildPlayerLabel(player, fallbackLabel = 'Unassigned') {
  const name = String(player?.name || fallbackLabel).trim() || fallbackLabel;
  const shirtNumber = String(player?.shirt_number || '').trim();
  return shirtNumber ? `${shirtNumber} ${name}` : name;
}

function getIconEmoji(iconType) {
  if (iconType === 'goal') {
    return '\u26BD';
  }
  if (iconType === 'assist') {
    return '\uD83C\uDFAF';
  }
  if (iconType === 'penalty_goal') {
    return '\uD83E\uDD45';
  }
  if (iconType === 'penalty_miss') {
    return '\uD83D\uDEAB';
  }
  if (iconType === 'substitution') {
    return '\uD83D\uDD01';
  }
  if (iconType === 'yellow_card') {
    return '\uD83D\uDFE8';
  }
  if (iconType === 'red_card') {
    return '\uD83D\uDFE5';
  }
  if (iconType === 'blue_card') {
    return '\uD83D\uDFE6';
  }
  return '';
}


function formatScopeLabel(match) {
  return `${match.date} vs ${match.opponent} (${match.status})`;
}

function sanitizeFilenameSegment(value, fallback = 'na') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return normalized || fallback;
}

function formatGeneratedAtLabel(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatBreadcrumb(match, statsScope) {
  if (!match || statsScope === 'all') {
    return ['FOOTBALL', 'ALL COMPETITIONS', 'ALL MATCHES'];
  }

  const competitionName = String(match.competition_name || match.season_tag || 'UNASSIGNED').trim().toUpperCase();
  const phasePrefix = match.competition_type === 'cup' ? 'ROUND' : 'WEEK';
  const roundLabel = Number.isFinite(Number(match.round_number))
    ? `${phasePrefix} ${Number(match.round_number)}`
    : 'MATCH CENTER';

  return ['FOOTBALL', competitionName || 'UNASSIGNED', roundLabel];
}

function formatDateTimeLabel(match, statsScope) {
  if (!match || statsScope === 'all') {
    return 'All recorded matches';
  }

  const datePart = match.date
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(`${match.date}T00:00:00`))
    : '-';

  const createdAtDate = match.created_at ? new Date(match.created_at) : null;
  const timePart =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--';

  return `${datePart} ${timePart}`;
}

function formatRating(rating, totalEvents) {
  if (!totalEvents) {
    return '-';
  }

  return rating.toFixed(1);
}

function TeamBadge({ label, logoUrl }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ minWidth: { xs: 120, sm: 170 } }}>
      <Avatar
        variant="rounded"
        src={logoUrl || undefined}
        alt={label}
        sx={{
          width: { xs: 56, sm: 76 },
          height: { xs: 56, sm: 76 },
          bgcolor: 'white',
          border: '1px solid',
          borderColor: '#cfd7e1',
        }}
      >
        <SportsSoccerRoundedIcon color="action" fontSize="small" />
      </Avatar>
      <Typography
        variant="h6"
        sx={{
          fontSize: { xs: 18, sm: 32 },
          lineHeight: 1,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          color: SUMMARY_TEXT_PRIMARY,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function parseRatio(rawValue) {
  const [attemptedRaw, successRaw] = String(rawValue || '0/0')
    .split('/')
    .map((value) => Number(value) || 0);
  const attempted = Math.max(0, attemptedRaw);
  const success = Math.max(0, successRaw);
  const pct = attempted > 0 ? Math.round((success / attempted) * 100) : 0;
  return {
    attempted,
    success,
    pct,
  };
}

function formatComparisonNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '-';
  }
  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }
  return String(numericValue);
}

function formatPctLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  const rounded = Number(numeric.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function buildTopStatsRows(ourMetrics, oppMetrics, combinedMetrics) {
  const ourPass = parseRatio(ourMetrics?.totals?.passesAS);
  const oppPass = parseRatio(oppMetrics?.totals?.passesAS);
  const rawOurPossession = Number(combinedMetrics?.estimated?.possessionOurPct) || 0;
  const ourPossession = Math.min(100, Math.max(0, Number(rawOurPossession.toFixed(1))));
  const oppPossession = Number((100 - ourPossession).toFixed(1));

  return [
    {
      id: 'top_xg',
      label: 'Expected goals (xG)',
      ourValue: Number(ourMetrics?.estimated?.xg) || 0,
      oppValue: Number(oppMetrics?.estimated?.xg) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.estimated?.xg),
      oppDisplay: formatComparisonNumber(oppMetrics?.estimated?.xg),
    },
    {
      id: 'top_possession',
      label: 'Ball possession',
      ourValue: ourPossession,
      oppValue: oppPossession,
      ourDisplay: formatPctLabel(ourPossession),
      oppDisplay: formatPctLabel(oppPossession),
    },
    {
      id: 'top_total_shots',
      label: 'Total shots',
      ourValue: Number(ourMetrics?.totals?.totalShots) || 0,
      oppValue: Number(oppMetrics?.totals?.totalShots) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.totalShots),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.totalShots),
    },
    {
      id: 'top_shots_on_target',
      label: 'Shots on target',
      ourValue: Number(ourMetrics?.totals?.successfulShots) || 0,
      oppValue: Number(oppMetrics?.totals?.successfulShots) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.successfulShots),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.successfulShots),
    },
    {
      id: 'top_big_chances',
      label: 'Big chances',
      ourValue: Number(ourMetrics?.totals?.bigChancesDetailed) || 0,
      oppValue: Number(oppMetrics?.totals?.bigChancesDetailed) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.bigChancesDetailed),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.bigChancesDetailed),
    },
    {
      id: 'top_corners',
      label: 'Corner kicks',
      ourValue: Number(ourMetrics?.totals?.corners) || 0,
      oppValue: Number(oppMetrics?.totals?.corners) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.corners),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.corners),
    },
    {
      id: 'top_passes',
      label: 'Passes',
      ourValue: ourPass.pct,
      oppValue: oppPass.pct,
      ourDisplay: `${ourPass.pct}% (${ourPass.attempted}/${ourPass.success})`,
      oppDisplay: `${oppPass.pct}% (${oppPass.attempted}/${oppPass.success})`,
    },
    {
      id: 'top_blue_cards',
      label: 'Blue cards',
      ourValue: Number(ourMetrics?.totals?.blueCards) || 0,
      oppValue: Number(oppMetrics?.totals?.blueCards) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.blueCards),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.blueCards),
    },
    {
      id: 'top_yellow_cards',
      label: 'Yellow cards',
      ourValue: Number(ourMetrics?.totals?.yellowCards) || 0,
      oppValue: Number(oppMetrics?.totals?.yellowCards) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.yellowCards),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.yellowCards),
    },
    {
      id: 'top_red_cards',
      label: 'Red cards',
      ourValue: Number(ourMetrics?.totals?.redCards) || 0,
      oppValue: Number(oppMetrics?.totals?.redCards) || 0,
      ourDisplay: formatComparisonNumber(ourMetrics?.totals?.redCards),
      oppDisplay: formatComparisonNumber(oppMetrics?.totals?.redCards),
    },
  ];
}

function buildSectionComparisonRows(sectionId, ourMetrics, oppMetrics) {
  if (sectionId === 'top_stats') {
    return [];
  }

  const ourRows = ourMetrics?.statsSections?.[sectionId] || [];
  const oppRows = oppMetrics?.statsSections?.[sectionId] || [];
  const oppById = new Map(oppRows.map((row) => [row.id, row]));
  const orderedRows = [...ourRows];

  oppRows.forEach((row) => {
    if (!orderedRows.some((ourRow) => ourRow.id === row.id)) {
      orderedRows.push(row);
    }
  });

  return orderedRows.map((row) => {
    const oppRow = oppById.get(row.id);
    const ourValue = Number(row?.value) || 0;
    const oppValue = Number(oppRow?.value) || 0;

    return {
      id: row.id,
      label: row.label,
      ourValue,
      oppValue,
      ourDisplay: row.display ?? formatComparisonNumber(ourValue),
      oppDisplay: oppRow?.display ?? formatComparisonNumber(oppValue),
      estimated: Boolean(row.estimated || oppRow?.estimated),
    };
  });
}

function ComparisonStatRow({ row }) {
  const ourValue = Math.max(0, Number(row.ourValue) || 0);
  const oppValue = Math.max(0, Number(row.oppValue) || 0);
  const total = ourValue + oppValue;
  const ourRawWidth = total > 0 ? (ourValue / total) * 50 : 0;
  const oppRawWidth = total > 0 ? (oppValue / total) * 50 : 0;
  const ourWidth = ourValue > 0 ? Math.max(ourRawWidth, 1.8) : 0;
  const oppWidth = oppValue > 0 ? Math.max(oppRawWidth, 1.8) : 0;

  return (
    <Box sx={{ py: 0.76 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(96px, 1fr) minmax(168px, 2.2fr) minmax(96px, 1fr)',
          alignItems: 'center',
          columnGap: 0.9,
          minHeight: 28,
        }}
      >
        <Typography sx={{ fontWeight: 800, color: '#1f2f40', textAlign: 'left' }}>{row.ourDisplay}</Typography>
        <Stack direction="row" spacing={0.55} alignItems="center" justifyContent="center" sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, textAlign: 'center', color: '#334357' }}>{row.label}</Typography>
          {row.estimated ? (
            <Chip
              size="small"
              label="Est."
              variant="outlined"
              sx={{
                height: 17,
                fontSize: 9.5,
                borderColor: '#dde3eb',
                color: '#8c96a4',
                bgcolor: '#f8fafd',
              }}
            />
          ) : null}
        </Stack>
        <Typography sx={{ fontWeight: 800, color: '#1f2f40', textAlign: 'right' }}>{row.oppDisplay}</Typography>
      </Box>

      <Box
        sx={{
          mt: 0.52,
          borderRadius: 99,
          height: 8,
          bgcolor: '#e3e7ed',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: `${ourWidth}%`,
            transform: 'translateX(-100%)',
            bgcolor: '#ff4a79',
            borderRadius: '99px 0 0 99px',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: `${oppWidth}%`,
            bgcolor: '#55687d',
            borderRadius: '0 99px 99px 0',
          }}
        />
      </Box>
    </Box>
  );
}

function SummaryEventBadge({ eventKind, cardType = '' }) {
  let emoji = '';
  let label = '';

  if (eventKind === 'goal') {
    emoji = getIconEmoji('goal');
    label = 'Goal';
  }
  if (eventKind === 'assist') {
    emoji = getIconEmoji('assist');
    label = 'Assist';
  }
  if (eventKind === 'penalty_goal') {
    emoji = getIconEmoji('penalty_goal');
    label = 'Penalty goal';
  }
  if (eventKind === 'penalty_miss') {
    emoji = getIconEmoji('penalty_miss');
    label = 'Penalty miss';
  }
  if (eventKind === 'substitution') {
    emoji = getIconEmoji('substitution');
    label = 'Substitution';
  }
  if (eventKind === 'card') {
    if (cardType === 'red_card') {
      emoji = getIconEmoji('red_card');
      label = 'Red card';
    } else if (cardType === 'blue_card') {
      emoji = getIconEmoji('blue_card');
      label = 'Blue card';
    } else {
      emoji = getIconEmoji('yellow_card');
      label = 'Yellow card';
    }
  }

  if (!emoji) {
    return null;
  }

  return (
    <Box
      component="span"
      role="img"
      aria-label={label}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        lineHeight: 1,
        minWidth: 20,
      }}
    >
      {emoji}
    </Box>
  );
}

function SummaryTimelineRow({ row }) {
  const isOpponent = row.side === 'opponent';

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ py: 0.72, borderBottom: '1px solid #eceff3' }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!isOpponent ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: SUMMARY_TEXT_MUTED, fontWeight: 700, minWidth: 36 }}>
              {row.minuteLabel}
            </Typography>
            <SummaryEventBadge eventKind={row.eventKind} cardType={row.cardType} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: SUMMARY_TEXT_PRIMARY }} noWrap>
              {row.displayLabel}
            </Typography>
            {row.scoreBadge ? (
              <Chip
                size="small"
                label={row.scoreBadge}
                sx={{
                  height: 22,
                  borderRadius: 1.2,
                  bgcolor: '#f7f9fc',
                  border: '1px solid #d7dde7',
                  color: '#27384c',
                  fontWeight: 700,
                }}
              />
            ) : null}
          </Stack>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {isOpponent ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, justifyContent: 'flex-end' }}>
            {row.scoreBadge ? (
              <Chip
                size="small"
                label={row.scoreBadge}
                sx={{
                  height: 22,
                  borderRadius: 1.2,
                  bgcolor: '#f7f9fc',
                  border: '1px solid #d7dde7',
                  color: '#27384c',
                  fontWeight: 700,
                }}
              />
            ) : null}
            <Typography variant="body2" sx={{ fontWeight: 700, color: SUMMARY_TEXT_PRIMARY }} noWrap>
              {row.displayLabel}
            </Typography>
            <SummaryEventBadge eventKind={row.eventKind} cardType={row.cardType} />
            <Typography variant="body2" sx={{ color: SUMMARY_TEXT_MUTED, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
              {row.minuteLabel}
            </Typography>
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}

function SummaryHalfSection({ title, score, rows }) {
  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          px: 1.4,
          py: 0.75,
          borderRadius: 1.2,
          borderColor: SUMMARY_BORDER_COLOR,
          bgcolor: '#f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ letterSpacing: '0.08em', color: '#63707f', fontSize: 12, fontWeight: 800 }}
        >
          {title}
        </Typography>
        <Typography variant="subtitle2" sx={{ color: '#445367', fontWeight: 700 }}>
          {score}
        </Typography>
      </Paper>

      <Box sx={{ mt: 0.35 }}>
        {rows.map((row) => (
          <SummaryTimelineRow key={row.id} row={row} />
        ))}
      </Box>
    </Box>
  );
}

function LineupNodeIcon({ type, count = 0 }) {
  const emoji = getIconEmoji(type);
  if (!emoji) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: 18,
        height: 18,
        borderRadius: 0,
        bgcolor: 'transparent',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      <span aria-hidden>{emoji}</span>
      {count > 1 ? (
        <Box
          sx={{
            position: 'absolute',
            right: -3,
            bottom: -2,
            minWidth: 11,
            height: 11,
            px: 0.2,
            borderRadius: 999,
            bgcolor: '#13243c',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 7,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {count}
        </Box>
      ) : null}
    </Box>
  );
}

function LineupPlayerNode({
  displayName,
  photoDataUrl = '',
  rating = 6,
  iconRail = [],
  iconCounts = {},
  isBestPlayer = false,
  placeholder = false,
}) {
  const badgeStyles = getRatingBadgeStyles(rating, isBestPlayer);
  const avatarSize = placeholder ? 42 : 48;
  const ratingLabel = rating.toFixed(1);

  return (
    <Box
      sx={{
        width: { xs: 98, sm: 106 },
        minHeight: { xs: 84, sm: 92 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: isBestPlayer ? 8 : 4,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          boxShadow: isBestPlayer ? '0 0 0 2px rgba(31, 92, 255, 0.28), 0 0 14px rgba(31, 92, 255, 0.34)' : 'none',
        }}
      >
        <Avatar
          src={photoDataUrl || undefined}
          alt={displayName}
          sx={{
            width: avatarSize,
            height: avatarSize,
            bgcolor: placeholder ? '#e9eef5' : '#edf2f7',
            border: '1px solid #d1d9e4',
          }}
        >
          <PersonRoundedIcon sx={{ color: '#8899ad', fontSize: 21 }} />
        </Avatar>

        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: -6,
            px: isBestPlayer ? 0.65 : 0.55,
            minWidth: isBestPlayer ? 34 : 30,
            height: isBestPlayer ? 20 : 18,
            ...badgeStyles,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isBestPlayer ? 10.5 : 9.5,
            letterSpacing: '0.01em',
          }}
        >
          {ratingLabel}
        </Box>

        {iconRail.length ? (
          <Stack
            direction="column"
            spacing={0.1}
            sx={{
              position: 'absolute',
              top: -5,
              right: isBestPlayer ? 40 : 36,
            }}
          >
            {iconRail.map((iconType) => (
              <LineupNodeIcon key={iconType} type={iconType} count={Number(iconCounts[iconType]) || 0} />
            ))}
          </Stack>
        ) : null}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 0.05,
          px: 0.6,
          py: 0.2,
          borderRadius: 1.05,
          border: '1px solid #d3dce7',
          bgcolor: 'rgba(255,255,255,0.97)',
          maxWidth: { xs: 88, sm: 94 },
          width: 'fit-content',
          mx: 'auto',
          boxShadow: '0 1px 3px rgba(13, 23, 35, 0.12)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontSize: 11,
            color: '#13283f',
            fontWeight: 800,
            lineHeight: 1.2,
            textAlign: 'center',
          }}
          noWrap
        >
          {displayName}
        </Typography>
      </Paper>
    </Box>
  );
}

export default function StatsView({
  matches,
  players,
  allEvents,
  lineupsByMatch = {},
  activeMatchId = '',
  activeMatchElapsedSeconds = 0,
  statsScope,
  onStatsScopeChange,
  teamName = 'Our Team',
  teamLogoUrl = '',
}) {
  const statsShareFrameRef = useRef(null);
  const igStoryFrameRef = useRef(null);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState('summary');
  const [activeStatsSection, setActiveStatsSection] = useState('top_stats');
  const [statsPeriodTab, setStatsPeriodTab] = useState('match');
  const [activePlayerStatsTab, setActivePlayerStatsTab] = useState('top_stats');
  const [detailPlayerId, setDetailPlayerId] = useState('');
  const [isStatsExporting, setIsStatsExporting] = useState(false);
  const [isIgStoryExporting, setIsIgStoryExporting] = useState(false);
  const [statsExportNotice, setStatsExportNotice] = useState(null);
  const [igStoryGeneratedAt, setIgStoryGeneratedAt] = useState(() => new Date().toISOString());

  const selectedMatch = useMemo(
    () => (statsScope === 'all' ? null : matches.find((match) => match.id === statsScope) || null),
    [matches, statsScope],
  );

  const fallbackMatch = matches[0] || null;
  const matchesById = useMemo(
    () =>
      matches.reduce((lookup, match) => {
        lookup[match.id] = match;
        return lookup;
      }, {}),
    [matches],
  );
  const statsTimeContext = useMemo(() => {
    const activeClockSecondsById =
      activeMatchId && Number.isFinite(activeMatchElapsedSeconds)
        ? { [activeMatchId]: Math.max(0, Number(activeMatchElapsedSeconds) || 0) }
        : {};

    return {
      matchesById,
      activeMatchClockSecondsById: activeClockSecondsById,
    };
  }, [activeMatchElapsedSeconds, activeMatchId, matchesById]);

  const metrics = useMemo(
    () => buildDashboardMetrics(allEvents, players, lineupsByMatch, statsScope, 'our', statsTimeContext),
    [allEvents, lineupsByMatch, players, statsScope, statsTimeContext],
  );
  const periodEvents = useMemo(
    () => filterEventsByPeriod(allEvents, statsPeriodTab),
    [allEvents, statsPeriodTab],
  );
  const periodOurMetrics = useMemo(
    () => buildDashboardMetrics(periodEvents, players, lineupsByMatch, statsScope, 'our', statsTimeContext),
    [lineupsByMatch, periodEvents, players, statsScope, statsTimeContext],
  );
  const periodOpponentMetrics = useMemo(
    () => buildDashboardMetrics(periodEvents, players, lineupsByMatch, statsScope, 'opponent', statsTimeContext),
    [lineupsByMatch, periodEvents, players, statsScope, statsTimeContext],
  );
  const periodCombinedMetrics = useMemo(
    () => buildDashboardMetrics(periodEvents, players, lineupsByMatch, statsScope, 'combined', statsTimeContext),
    [lineupsByMatch, periodEvents, players, statsScope, statsTimeContext],
  );
  const playersById = useMemo(
    () =>
      players.reduce((lookup, player) => {
        lookup[player.id] = player;
        return lookup;
      }, {}),
    [players],
  );
  const storyOurMetrics = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }
    return buildDashboardMetrics(allEvents, players, lineupsByMatch, selectedMatch.id, 'our', statsTimeContext);
  }, [allEvents, lineupsByMatch, players, selectedMatch, statsTimeContext]);
  const storyOpponentMetrics = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }
    return buildDashboardMetrics(allEvents, players, lineupsByMatch, selectedMatch.id, 'opponent', statsTimeContext);
  }, [allEvents, lineupsByMatch, players, selectedMatch, statsTimeContext]);
  const storyCombinedMetrics = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }
    return buildDashboardMetrics(allEvents, players, lineupsByMatch, selectedMatch.id, 'combined', statsTimeContext);
  }, [allEvents, lineupsByMatch, players, selectedMatch, statsTimeContext]);
  const igStoryTopRows = useMemo(() => {
    if (!storyOurMetrics || !storyOpponentMetrics || !storyCombinedMetrics) {
      return [];
    }
    const rows = buildTopStatsRows(storyOurMetrics, storyOpponentMetrics, storyCombinedMetrics);
    const keepIds = new Set(IG_STORY_METRIC_ROWS.map((row) => row.id));
    return rows.filter((row) => keepIds.has(row.id));
  }, [storyCombinedMetrics, storyOpponentMetrics, storyOurMetrics]);
  const igStoryDisplayRows = useMemo(() => {
    const rowById = new Map(igStoryTopRows.map((row) => [row.id, row]));
    return IG_STORY_METRIC_ROWS.map((metricRow) => {
      const row = rowById.get(metricRow.id);
      if (row) {
        return row;
      }
      return {
        id: metricRow.id,
        label: metricRow.label,
        ourDisplay: '-',
        oppDisplay: '-',
      };
    });
  }, [igStoryTopRows]);

  const effectiveStatsSection = STATS_COMPARISON_TABS.some((tab) => tab.id === activeStatsSection)
    ? activeStatsSection
    : 'top_stats';
  const activeComparisonRows = useMemo(() => {
    if (effectiveStatsSection === 'top_stats') {
      return buildTopStatsRows(periodOurMetrics, periodOpponentMetrics, periodCombinedMetrics);
    }

    return buildSectionComparisonRows(effectiveStatsSection, periodOurMetrics, periodOpponentMetrics);
  }, [effectiveStatsSection, periodCombinedMetrics, periodOpponentMetrics, periodOurMetrics]);

  const effectivePlayerStatsTab = metrics.playerStats.byTab[activePlayerStatsTab]
    ? activePlayerStatsTab
    : metrics.playerStats.tabs[0]?.id || 'top_stats';
  const activePlayerStatsModel = metrics.playerStats.byTab[effectivePlayerStatsTab] || {
    columns: [],
    rows: [],
  };

  const scopeDateTimeLabel = formatDateTimeLabel(selectedMatch || fallbackMatch, statsScope);
  const breadcrumbParts = useMemo(
    () => formatBreadcrumb(selectedMatch || fallbackMatch, statsScope),
    [fallbackMatch, selectedMatch, statsScope],
  );

  const leftTeamLogo = selectedMatch?.team_logo_url || fallbackMatch?.team_logo_url || teamLogoUrl || '';
  const rightTeamLogo =
    selectedMatch?.opponent_logo_data_url ||
    selectedMatch?.opponent_logo_url ||
    fallbackMatch?.opponent_logo_data_url ||
    fallbackMatch?.opponent_logo_url ||
    '';

  const statusLabel =
    statsScope === 'all'
      ? 'AGGREGATED'
      : selectedMatch?.status === 'completed'
      ? 'FINISHED'
      : 'DRAFT';

  const opponentLabel = selectedMatch?.opponent || (statsScope === 'all' ? 'All Opponents' : 'Opponent');
  const storyScoreOur = Number(storyOurMetrics?.totals?.goals) || 0;
  const storyScoreOpponent = Number(storyOpponentMetrics?.totals?.goals) || 0;
  const storyStatusLabel = selectedMatch?.status === 'completed' ? 'FINISHED' : 'DRAFT';
  const storyGeneratedAtLabel = useMemo(() => formatGeneratedAtLabel(igStoryGeneratedAt), [igStoryGeneratedAt]);
  const selectedMatchLineups = useMemo(
    () => (selectedMatch ? lineupsByMatch[selectedMatch.id] || [] : []),
    [lineupsByMatch, selectedMatch],
  );
  const selectedLineupSplit = useMemo(
    () => splitLineupsByRole(selectedMatchLineups),
    [selectedMatchLineups],
  );
  const ourLineupFormation = useMemo(() => {
    const preferred = normalizeFormationKey(selectedMatch?.formation, '');
    if (preferred) {
      return preferred;
    }
    return detectFormationFromStarterSlots(selectedLineupSplit.starters, OUR_LINEUP_FALLBACK_FORMATION);
  }, [selectedLineupSplit.starters, selectedMatch?.formation]);
  const opponentLineupFormation = useMemo(
    () => normalizeFormationKey(selectedMatch?.opponent_formation, OPPONENT_LINEUP_FALLBACK_FORMATION),
    [selectedMatch?.opponent_formation],
  );
  const selectedMatchOurEvents = useMemo(() => {
    if (!selectedMatch) {
      return [];
    }
    return allEvents.filter(
      (event) =>
        event.match_id === selectedMatch.id &&
        !event.mirror_generated &&
        (event.side || 'our') === 'our',
    );
  }, [allEvents, selectedMatch]);
  const selectedMatchOpponentEvents = useMemo(() => {
    if (!selectedMatch) {
      return [];
    }
    return allEvents.filter(
      (event) =>
        event.match_id === selectedMatch.id &&
        !event.mirror_generated &&
        (event.side || 'our') === 'opponent',
    );
  }, [allEvents, selectedMatch]);
  const ourLineupSlots = useMemo(
    () =>
      bindStartersToFormation(ourLineupFormation, selectedLineupSplit.starters).filter((slot) =>
        Boolean(slot.player_id),
      ),
    [ourLineupFormation, selectedLineupSplit.starters],
  );
  const opponentLineupSlots = useMemo(
    () => createSlotsForFormation(opponentLineupFormation),
    [opponentLineupFormation],
  );
  const ourPlayerRowsForLineup = useMemo(() => {
    if (!selectedMatch) {
      return [];
    }
    return buildPlayerStatsRows(
      allEvents,
      players,
      lineupsByMatch,
      selectedMatch.id,
      'our',
      statsTimeContext,
    );
  }, [allEvents, lineupsByMatch, players, selectedMatch, statsTimeContext]);
  const ourRatingsByPlayerId = useMemo(
    () =>
      ourPlayerRowsForLineup.reduce((lookup, row) => {
        lookup[row.player_id] = normalizeDisplayRating(row.rating, 6);
        return lookup;
      }, {}),
    [ourPlayerRowsForLineup],
  );
  const ourPlayerRowsByIdForLineup = useMemo(
    () =>
      ourPlayerRowsForLineup.reduce((lookup, row) => {
        lookup[row.player_id] = row;
        return lookup;
      }, {}),
    [ourPlayerRowsForLineup],
  );
  const ourIconCountsByPlayer = useMemo(
    () => buildOurIconCounts(selectedMatchOurEvents),
    [selectedMatchOurEvents],
  );
  const ourLineupNodesBase = useMemo(
    () =>
      buildFormationPitchPositions(ourLineupSlots, 'our').map((slot) => {
        const player = playersById[slot.player_id] || null;
        const rating = normalizeDisplayRating(ourRatingsByPlayerId[slot.player_id], 6);
        const iconCounts = ourIconCountsByPlayer[slot.player_id] || createEmptyIconCountMap();

        return {
          id: `our-${slot.slot_id}`,
          side: 'our',
          pitchX: slot.pitchX,
          pitchY: slot.pitchY,
          displayName: buildPlayerLabel(player, 'Unassigned'),
          photoDataUrl: String(player?.photo_data_url || ''),
          rating,
          iconCounts,
          iconRail: buildIconRailFromCounts(iconCounts),
        };
      }),
    [ourIconCountsByPlayer, ourLineupSlots, ourRatingsByPlayerId, playersById],
  );
  const opponentEventTotals = useMemo(
    () => buildOpponentEventTotals(selectedMatchOpponentEvents),
    [selectedMatchOpponentEvents],
  );
  const opponentBaseRating = useMemo(() => {
    if (!selectedMatchOpponentEvents.length) {
      return 6.2;
    }
    const totalPoints = selectedMatchOpponentEvents.reduce(
      (sum, event) => sum + (Number(event.points) || 0),
      0,
    );
    const averagePoints = totalPoints / Math.max(selectedMatchOpponentEvents.length, 1);
    return normalizeDisplayRating(6.2 + averagePoints, 6.2);
  }, [selectedMatchOpponentEvents]);
  const opponentSyntheticIconCountsBySlot = useMemo(
    () => distributeSyntheticOpponentIcons(opponentLineupSlots, opponentEventTotals),
    [opponentEventTotals, opponentLineupSlots],
  );
  const opponentLineupNodesBase = useMemo(
    () =>
      buildFormationPitchPositions(opponentLineupSlots, 'opponent').map((slot, index) => {
        const variance = LINEUP_RATING_VARIANCE_PATTERN[index % LINEUP_RATING_VARIANCE_PATTERN.length];
        const rating = normalizeDisplayRating(opponentBaseRating + variance, 6.2);
        const iconCounts = opponentSyntheticIconCountsBySlot[slot.slot_id] || createEmptyIconCountMap();

        return {
          id: `opp-${slot.slot_id}`,
          side: 'opponent',
          pitchX: slot.pitchX,
          pitchY: slot.pitchY,
          displayName: `Opp #${slot.slot_order}`,
          photoDataUrl: '',
          rating,
          iconCounts,
          iconRail: buildIconRailFromCounts(iconCounts),
        };
      }),
    [opponentBaseRating, opponentLineupSlots, opponentSyntheticIconCountsBySlot],
  );
  const lineupNodes = useMemo(() => {
    const merged = [...ourLineupNodesBase, ...opponentLineupNodesBase];
    if (!merged.length) {
      return merged;
    }

    const bestRating = merged.reduce((maxValue, node) => Math.max(maxValue, node.rating), -Infinity);
    let bestAssigned = false;

    return merged.map((node) => {
      const isBest = !bestAssigned && node.rating === bestRating;
      if (isBest) {
        bestAssigned = true;
      }
      return {
        ...node,
        isBestPlayer: isBest,
      };
    });
  }, [opponentLineupNodesBase, ourLineupNodesBase]);
  const ourLineupNodes = useMemo(
    () => lineupNodes.filter((node) => node.side === 'our'),
    [lineupNodes],
  );
  const opponentLineupNodes = useMemo(
    () => lineupNodes.filter((node) => node.side === 'opponent'),
    [lineupNodes],
  );
  const ourTeamAverageRating = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }

    const starterIds = ourLineupSlots.map((slot) => slot.player_id).filter(Boolean);
    const playedSubIds = selectedLineupSplit.bench
      .map((slot) => slot.player_id)
      .filter(Boolean)
      .filter((playerId) => {
        const row = ourPlayerRowsByIdForLineup[playerId];
        return Boolean(row && ((Number(row.subApps) || 0) > 0 || (Number(row.minutes) || 0) > 0));
      });

    const includedPlayerIds = Array.from(new Set([...starterIds, ...playedSubIds]));
    if (!includedPlayerIds.length) {
      return null;
    }

    const totalRating = includedPlayerIds.reduce(
      (sum, playerId) => sum + normalizeDisplayRating(ourRatingsByPlayerId[playerId], 6),
      0,
    );
    return Number((totalRating / includedPlayerIds.length).toFixed(1));
  }, [
    ourLineupSlots,
    ourPlayerRowsByIdForLineup,
    ourRatingsByPlayerId,
    selectedLineupSplit.bench,
    selectedMatch,
  ]);
  const opponentTeamAverageRating = useMemo(() => {
    const firstEleven = opponentLineupNodes.slice(0, 11);
    if (!firstEleven.length) {
      return null;
    }

    const totalRating = firstEleven.reduce(
      (sum, node) => sum + normalizeDisplayRating(node.rating, 6.2),
      0,
    );
    return Number((totalRating / firstEleven.length).toFixed(1));
  }, [opponentLineupNodes]);
  const summaryCards = useMemo(
    () => [
      { label: 'Goals', value: metrics.totals.goals },
      { label: 'Successful Shots', value: metrics.totals.successfulShots },
      { label: 'Big Chances', value: metrics.totals.bigChancesDetailed },
      { label: 'Big Chances Scored', value: metrics.totals.bigChancesScored },
      { label: 'Big Chances Missed', value: metrics.totals.bigChancesMissed },
      { label: 'Penalties Won', value: metrics.totals.penaltiesWon },
      { label: 'Substitutions', value: metrics.totals.substitutions },
      { label: 'Penalties Scored', value: metrics.totals.penaltiesScored },
      { label: 'Penalties Missed', value: metrics.totals.penaltiesMissed },
      { label: 'Passes', value: metrics.totals.passesAS },
      { label: 'Crosses', value: metrics.totals.crossesAS },
      { label: 'Dribbles', value: metrics.totals.dribblesAS },
      { label: 'Aerial Duels', value: metrics.totals.aerialAS },
      { label: 'Free Kicks', value: metrics.totals.freeKicksWon },
      { label: 'Offsides', value: metrics.totals.offsides },
    ],
    [metrics.totals],
  );
  const summaryTimeline = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }

    return buildMatchSummaryTimeline(allEvents, playersById, selectedMatch.id);
  }, [allEvents, playersById, selectedMatch]);

  const playerDetailData = useMemo(() => {
    if (!detailPlayerId) {
      return null;
    }

    return buildPlayerDetailModalData(
      detailPlayerId,
      allEvents,
      players,
      lineupsByMatch,
      statsScope,
      'our',
      statsTimeContext,
    );
  }, [allEvents, detailPlayerId, lineupsByMatch, players, statsScope, statsTimeContext]);

  const handleExportStatsImage = async () => {
    const frameElement = statsShareFrameRef.current;
    if (!frameElement) {
      setStatsExportNotice({ type: 'error', message: 'Export frame not ready.' });
      return;
    }

    setStatsExportNotice(null);
    setIsStatsExporting(true);

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const dataUrl = await toPng(frameElement, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => !(node instanceof Element && node.dataset.exportIgnore === 'true'),
      });

      const matchDatePart = sanitizeFilenameSegment(selectedMatch?.date || 'all-matches', 'all-matches');
      const opponentPart = sanitizeFilenameSegment(selectedMatch?.opponent || 'all-opponents', 'all-opponents');
      const periodPart = sanitizeFilenameSegment(statsPeriodTab, 'match');
      const sectionPart = sanitizeFilenameSegment(effectiveStatsSection, 'top-stats');
      const fileName = `stats-${matchDatePart}-${opponentPart}-${periodPart}-${sectionPart}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not export image.';
      setStatsExportNotice({ type: 'error', message });
    } finally {
      setIsStatsExporting(false);
    }
  };

  const handleExportIgStory = async () => {
    if (!selectedMatch || statsScope === 'all') {
      setStatsExportNotice({ type: 'error', message: 'Select a single match to export IG Story.' });
      return;
    }

    const frameElement = igStoryFrameRef.current;
    if (!frameElement) {
      setStatsExportNotice({ type: 'error', message: 'IG Story template not ready.' });
      return;
    }

    setStatsExportNotice(null);
    setIsIgStoryExporting(true);
    setIgStoryGeneratedAt(new Date().toISOString());

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const dataUrl = await toPng(frameElement, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      const matchDatePart = sanitizeFilenameSegment(selectedMatch?.date || 'match', 'match');
      const opponentPart = sanitizeFilenameSegment(selectedMatch?.opponent || 'opponent', 'opponent');
      const fileName = `ig-story-${matchDatePart}-${opponentPart}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not export IG Story.';
      setStatsExportNotice({ type: 'error', message });
    } finally {
      setIsIgStoryExporting(false);
    }
  };

  return (
    <Box
      ref={statsShareFrameRef}
      data-export-mode={isStatsExporting ? 'true' : 'false'}
      sx={{
        width: '100%',
        maxWidth: STATS_SHELL_MAX_WIDTH,
        mx: 'auto',
        px: { xs: 1, sm: 1.4, md: 1.8 },
        display: 'grid',
        gap: 1.1,
        '&[data-export-mode="true"]': {
          bgcolor: '#ffffff',
        },
        '&[data-export-mode="true"] .panel-enter': {
          boxShadow: 'none !important',
          animation: 'none !important',
        },
        '&[data-export-mode="true"] .MuiPaper-root': {
          boxShadow: 'none !important',
        },
      }}
    >
      <Paper className="panel-enter" sx={{ p: 0, overflow: 'hidden', border: `1px solid ${SUMMARY_BORDER_COLOR}` }}>
        <Box sx={{ p: { xs: 1.05, md: 1.3 }, backgroundColor: PANEL_BG }}>
          <Stack spacing={1.15}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Stack direction="row" alignItems="center" spacing={0.25} flexWrap="wrap" useFlexGap>
                {breadcrumbParts.map((part, index) => (
                  <Stack key={`${part}-${index}`} direction="row" alignItems="center" spacing={0.25}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: index === breadcrumbParts.length - 1 ? '#334053' : '#7a8390',
                      }}
                    >
                      {part}
                    </Typography>
                    {index < breadcrumbParts.length - 1 ? <ChevronRightRoundedIcon sx={{ fontSize: 16, color: '#98a1ad' }} /> : null}
                  </Stack>
                ))}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} sx={{ width: { xs: '100%', md: 'auto' } }}>
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 } }}>
                  <InputLabel id="stats-scope-select-label">Match Scope</InputLabel>
                  <Select
                    labelId="stats-scope-select-label"
                    value={statsScope}
                    label="Match Scope"
                    onChange={(event) => onStatsScopeChange(event.target.value)}
                  >
                    <MenuItem value="all">All Matches</MenuItem>
                    {matches.map((match) => (
                      <MenuItem key={match.id} value={match.id}>
                        {formatScopeLabel(match)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 1.2, md: 2.2 }}
              alignItems="center"
              justifyContent="space-between"
            >
              <TeamBadge label={teamName} logoUrl={leftTeamLogo} />

              <Stack spacing={0.25} alignItems="center" sx={{ minWidth: { xs: 'auto', md: 280 } }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: '#5f6978',
                    fontSize: { xs: 14, md: 22 },
                  }}
                >
                  {scopeDateTimeLabel}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Bebas Neue", "Archivo", sans-serif',
                    fontSize: { xs: 78, md: 112 },
                    lineHeight: 0.78,
                    letterSpacing: '0.03em',
                    color: '#071f33',
                  }}
                >
                  {metrics.totals.goals}-{metrics.totals.goalsConceded}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: '#172636', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase' }}
                >
                  {statusLabel}
                </Typography>
              </Stack>

              <TeamBadge label={opponentLabel} logoUrl={rightTeamLogo} />
            </Stack>

            <Divider />

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {PRIMARY_NAV_TABS.map((tab) => {
                const active = tab.id === 'match';
                return (
                  <Box
                    key={tab.id}
                    sx={{
                      pt: 0.15,
                      pb: 0.65,
                      borderBottom: `3px solid ${active ? ACCENT_COLOR : 'transparent'}`,
                      color: active ? ACCENT_COLOR : '#6e7784',
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      opacity: tab.enabled ? 1 : 0.82,
                    }}
                  >
                    {tab.label}
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Paper className="panel-enter" sx={{ p: 1, border: `1px solid ${SUMMARY_BORDER_COLOR}` }}>
        <Stack direction="row" spacing={0.85} flexWrap="wrap" useFlexGap>
          {SECONDARY_TABS.map((tab) => {
            const active = activeSecondaryTab === tab.id;

            return (
              <Tooltip key={tab.id} title={tab.enabled ? '' : 'Coming soon'} disableHoverListener={tab.enabled}>
                <span>
                  <Button
                    variant={active ? 'contained' : 'outlined'}
                    disabled={!tab.enabled}
                    onClick={() => {
                      if (tab.enabled) {
                        setActiveSecondaryTab(tab.id);
                      }
                    }}
                    sx={{
                      minHeight: 38,
                      borderRadius: 2.5,
                      minWidth: 124,
                      fontWeight: 800,
                      letterSpacing: '0.03em',
                      borderColor: active ? '#ff1d66' : '#d9dde3',
                      color: active ? '#ffffff' : '#5a6674',
                      bgcolor: active ? '#ff1d66' : '#eceff2',
                      boxShadow: active ? '0 4px 10px rgba(255, 29, 102, 0.24)' : 'none',
                      '&:hover': {
                        borderColor: active ? '#ff1d66' : '#cdd3dd',
                        bgcolor: active ? '#ff1d66' : '#e6eaef',
                      },
                      '&.Mui-disabled': {
                        color: '#a0a7b1',
                        borderColor: '#dbdee4',
                        bgcolor: '#f3f4f7',
                      },
                    }}
                  >
                    {tab.label}
                  </Button>
                </span>
              </Tooltip>
            );
          })}
        </Stack>
      </Paper>

      {activeSecondaryTab === 'summary' ? (
        <Paper className="panel-enter" sx={{ p: { xs: 1.05, md: 1.2 }, border: `1px solid ${SUMMARY_BORDER_COLOR}` }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.05, color: '#6c7583', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase' }}
          >
            Match Summary
          </Typography>

          {statsScope !== 'all' ? (
            !summaryTimeline?.totalEvents ? (
              <Alert severity="info">No summary events found for this match yet.</Alert>
            ) : (
              <Stack spacing={1.2}>
                <SummaryHalfSection
                  title="1ST HALF"
                  score={summaryTimeline.firstHalfScore}
                  rows={summaryTimeline.firstHalfEvents}
                />
                <SummaryHalfSection
                  title="2ND HALF"
                  score={summaryTimeline.secondHalfScore}
                  rows={summaryTimeline.secondHalfEvents}
                />
              </Stack>
            )
          ) : (
            <>
              {!metrics.totals.totalEvents ? <Alert severity="info">No events found in this scope yet.</Alert> : null}

              <Box
                sx={{
                  mt: 0.6,
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                }}
              >
                {summaryCards.map((card) => (
                  <Paper key={card.label} variant="outlined" sx={{ p: 1.05, borderColor: SUMMARY_BORDER_COLOR, bgcolor: '#f9fafc' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.02em' }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: SUMMARY_TEXT_PRIMARY }}>
                      {card.value}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              <Paper variant="outlined" sx={{ mt: 1.2, p: 1.05, borderColor: SUMMARY_BORDER_COLOR, bgcolor: '#f9fafc' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.8 }}>
                  Estimated Metrics
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Chip label={`xG: ${metrics.estimated.xg}`} />
                  <Chip label={`Possession: Our ${metrics.estimated.possessionOurPct}% • Opp ${metrics.estimated.possessionOppPct}%`} />
                  <Chip label={`Conversion: ${metrics.estimated.conversionPct}%`} />
                </Stack>
              </Paper>
            </>
          )}
        </Paper>
      ) : null}

      {activeSecondaryTab === 'stats' ? (
        <Paper className="panel-enter" sx={{ p: { xs: 1.05, md: 1.2 }, border: `1px solid ${SUMMARY_BORDER_COLOR}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.85 }}>
            <Typography variant="subtitle2" sx={{ color: '#5b6574', letterSpacing: '0.06em', fontWeight: 800 }}>
              STATS
            </Typography>
            <Stack direction="row" spacing={0.65} data-export-ignore="true">
              <Button
                size="small"
                variant="outlined"
                onClick={handleExportStatsImage}
                disabled={isStatsExporting || isIgStoryExporting}
                startIcon={<FileDownloadRoundedIcon fontSize="small" />}
                sx={{
                  minHeight: 30,
                  borderRadius: 1.35,
                  fontWeight: 700,
                  borderColor: '#d7dde6',
                  color: '#4f5d70',
                  bgcolor: '#f8fafd',
                  '&:hover': { borderColor: '#cfd7e2', bgcolor: '#f2f6fb' },
                }}
              >
                {isStatsExporting ? 'Exporting...' : 'Export Image'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleExportIgStory}
                disabled={isIgStoryExporting || isStatsExporting || statsScope === 'all' || !selectedMatch}
                startIcon={<ImageRoundedIcon fontSize="small" />}
                sx={{
                  minHeight: 30,
                  borderRadius: 1.35,
                  fontWeight: 700,
                  borderColor: '#d7dde6',
                  color: '#4f5d70',
                  bgcolor: '#f8fafd',
                  '&:hover': { borderColor: '#cfd7e2', bgcolor: '#f2f6fb' },
                  '&.Mui-disabled': {
                    color: '#9aa3b0',
                    borderColor: '#dee3ea',
                    bgcolor: '#f4f6f9',
                  },
                }}
              >
                {isIgStoryExporting ? 'Exporting...' : 'Export IG Story'}
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mb: 0.95 }}>
            {STATS_PERIOD_TABS.map((periodTab) => {
              const active = periodTab.id === statsPeriodTab;
              return (
                <Button
                  key={periodTab.id}
                  variant={active ? 'contained' : 'outlined'}
                  onClick={() => setStatsPeriodTab(periodTab.id)}
                  sx={{
                    minHeight: 32,
                    minWidth: 108,
                    borderRadius: 1.45,
                    px: 1.2,
                    fontWeight: active ? 800 : 700,
                    letterSpacing: '0.03em',
                    borderWidth: active ? 0 : 1,
                    borderColor: '#d8dde6',
                    color: active ? '#ffffff' : '#5d6978',
                    bgcolor: active ? ACCENT_COLOR : '#f2f4f7',
                    boxShadow: active ? '0 2px 8px rgba(255, 42, 99, 0.22)' : 'none',
                  }}
                >
                  {periodTab.label}
                </Button>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mb: 1.1 }}>
            {STATS_COMPARISON_TABS.map((sectionTab) => {
              const active = sectionTab.id === effectiveStatsSection;

              return (
                <Button
                  key={sectionTab.id}
                  variant={active ? 'contained' : 'outlined'}
                  onClick={() => setActiveStatsSection(sectionTab.id)}
                  sx={{
                    minHeight: 32,
                    borderRadius: 1.45,
                    px: 1.2,
                    fontWeight: active ? 800 : 700,
                    letterSpacing: '0.02em',
                    borderWidth: active ? 0 : 1,
                    borderColor: '#d8dde6',
                    color: active ? '#ffffff' : '#5d6978',
                    bgcolor: active ? ACCENT_COLOR : '#f2f4f7',
                    boxShadow: active ? '0 2px 8px rgba(255, 42, 99, 0.22)' : 'none',
                  }}
                >
                  {sectionTab.label}
                </Button>
              );
            })}
          </Stack>

          {!periodOurMetrics.totals.totalEvents && !periodOpponentMetrics.totals.totalEvents ? (
            <Alert severity="info">No events found in this scope yet.</Alert>
          ) : null}

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.05, md: 1.25 },
              mt: 0.35,
              borderRadius: 2,
              borderColor: '#d9dee6',
              bgcolor: '#f6f8fb',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                mb: 0.9,
                color: '#586271',
                letterSpacing: '0.06em',
                fontWeight: 800,
              }}
            >
              {STATS_COMPARISON_TABS.find((tab) => tab.id === effectiveStatsSection)?.label || 'TOP STATS'}
            </Typography>

            <Divider sx={{ mb: 0.35, borderColor: '#e3e7ee' }} />

            <Box>
              {activeComparisonRows.map((row) => (
                <Box key={row.id} sx={{ borderBottom: '1px solid #e7ebf1' }}>
                  <ComparisonStatRow row={row} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Paper>
      ) : null}

      {activeSecondaryTab === 'lineups' ? (
        <Paper className="panel-enter" sx={{ p: { xs: 1.05, md: 1.2 }, border: `1px solid ${SUMMARY_BORDER_COLOR}` }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            LINEUPS
          </Typography>

          {statsScope === 'all' ? (
            <Alert severity="info">Select a single match to view lineups on the pitch.</Alert>
          ) : !selectedMatch ? (
            <Alert severity="info">Match not found for the selected scope.</Alert>
          ) : !ourLineupNodes.length ? (
            <Alert severity="info">No starting lineup saved for this match yet.</Alert>
          ) : (
            <Stack spacing={1}>
              <Paper
                variant="outlined"
                sx={{
                  px: 1.15,
                  py: 0.72,
                  borderRadius: 1.45,
                  borderColor: '#d7dde6',
                  bgcolor: '#f4f6f9',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                    alignItems: 'center',
                    columnGap: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#22364d' }}>
                    {formatFormationLabel(ourLineupFormation)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: '#607386', fontWeight: 900 }}
                  >
                    Formation
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#22364d', textAlign: 'right' }}>
                    {formatFormationLabel(opponentLineupFormation)}
                  </Typography>
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 0.75, md: 0.95 },
                  borderRadius: 2,
                  borderColor: '#d3dae4',
                  bgcolor: '#f8fafc',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: { xs: LINEUP_PITCH_HEIGHT - 110, md: LINEUP_PITCH_HEIGHT },
                    width: { xs: '98%', md: '94%' },
                    mx: 'auto',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #cfd8e4',
                    background: 'linear-gradient(180deg, #edf1f5 0%, #e9edf2 100%)',
                  }}
                >
                  {ourTeamAverageRating !== null ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        px: 0.7,
                        minWidth: 34,
                        height: 22,
                        zIndex: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        letterSpacing: '0.01em',
                        ...getRatingBadgeStyles(ourTeamAverageRating, false),
                      }}
                    >
                      {ourTeamAverageRating.toFixed(1)}
                    </Box>
                  ) : null}
                  {opponentTeamAverageRating !== null ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        px: 0.7,
                        minWidth: 34,
                        height: 22,
                        zIndex: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        letterSpacing: '0.01em',
                        ...getRatingBadgeStyles(opponentTeamAverageRating, false),
                      }}
                    >
                      {opponentTeamAverageRating.toFixed(1)}
                    </Box>
                  ) : null}
                  <Box sx={{ position: 'absolute', inset: 9, border: '2px solid rgba(255,255,255,0.95)' }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 9,
                      bottom: 9,
                      left: '50%',
                      width: 2,
                      bgcolor: 'rgba(255,255,255,0.95)',
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 130,
                      height: 130,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.95)',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  <Box sx={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.95)', transform: 'translate(-50%, -50%)' }} />

                  <Box sx={{ position: 'absolute', left: 9, top: '23%', width: '16%', height: '54%', border: '2px solid rgba(255,255,255,0.95)' }} />
                  <Box sx={{ position: 'absolute', left: 9, top: '35%', width: '6%', height: '30%', border: '2px solid rgba(255,255,255,0.95)' }} />
                  <Box sx={{ position: 'absolute', right: 9, top: '23%', width: '16%', height: '54%', border: '2px solid rgba(255,255,255,0.95)' }} />
                  <Box sx={{ position: 'absolute', right: 9, top: '35%', width: '6%', height: '30%', border: '2px solid rgba(255,255,255,0.95)' }} />

                  {ourLineupNodes.map((node) => (
                    <Box
                      key={node.id}
                      sx={{
                        position: 'absolute',
                        left: `${node.pitchX}%`,
                        top: `${node.pitchY}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: node.isBestPlayer ? 12 : 5,
                      }}
                    >
                      <LineupPlayerNode
                        displayName={node.displayName}
                        photoDataUrl={node.photoDataUrl}
                        rating={node.rating}
                        iconRail={node.iconRail}
                        iconCounts={node.iconCounts}
                        isBestPlayer={node.isBestPlayer}
                      />
                    </Box>
                  ))}

                  {opponentLineupNodes.map((node) => (
                    <Box
                      key={node.id}
                      sx={{
                        position: 'absolute',
                        left: `${node.pitchX}%`,
                        top: `${node.pitchY}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: node.isBestPlayer ? 12 : 5,
                      }}
                    >
                      <LineupPlayerNode
                        displayName={node.displayName}
                        rating={node.rating}
                        iconRail={node.iconRail}
                        iconCounts={node.iconCounts}
                        isBestPlayer={node.isBestPlayer}
                        placeholder
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Stack>
          )}
        </Paper>
      ) : null}

      {activeSecondaryTab === 'player_stats' ? (
        <Paper
          className="panel-enter"
          sx={{
            p: { xs: 1.05, md: 1.2 },
            border: `1px solid ${SUMMARY_BORDER_COLOR}`,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            PLAYER STATS
          </Typography>

          <>
            <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mb: 1.1 }}>
              {metrics.playerStats.tabs.map((tab) => {
                const active = tab.id === effectivePlayerStatsTab;

                return (
                  <Button
                    key={tab.id}
                    variant={active ? 'contained' : 'outlined'}
                    onClick={() => setActivePlayerStatsTab(tab.id)}
                    sx={{
                      minHeight: 31,
                      px: 1.2,
                      borderRadius: 1.4,
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      borderWidth: active ? 0 : 1,
                      borderColor: '#d8dce3',
                      color: active ? '#ffffff' : '#5b6574',
                      bgcolor: active ? ACCENT_COLOR : '#f2f4f7',
                      boxShadow: active ? '0 2px 8px rgba(255, 42, 99, 0.22)' : 'none',
                    }}
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </Stack>

            {!activePlayerStatsModel.rows.length ? (
              <Alert severity="info">No players with data in this category.</Alert>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderColor: '#d8dbe0',
                  bgcolor: '#fbfcfd',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: { xs: 540, md: 640 },
                }}
              >
                <Table
                  size="small"
                  stickyHeader
                  sx={{
                    width: 'max-content',
                    minWidth: '100%',
                    tableLayout: 'auto',
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {activePlayerStatsModel.columns.map((column) => {
                        const isPlayerColumn = column.id === 'player';
                        return (
                          <TableCell
                            key={column.id}
                            align={isPlayerColumn ? 'left' : 'center'}
                            sx={{
                              py: 0.75,
                              fontWeight: 800,
                              fontSize: 11,
                              letterSpacing: '0.01em',
                              color: '#5e6978',
                              bgcolor: '#f4f6f9',
                              borderBottom: '1px solid #dfe5ed',
                              minWidth: PLAYER_STATS_COLUMN_WIDTHS[column.id] || 108,
                              whiteSpace: 'nowrap',
                              position: isPlayerColumn ? 'sticky' : 'static',
                              left: isPlayerColumn ? 0 : 'auto',
                              zIndex: isPlayerColumn ? 6 : 5,
                              borderRight: isPlayerColumn ? '1px solid #e1e7ef' : undefined,
                            }}
                          >
                            {column.label}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activePlayerStatsModel.rows.map((row) => (
                      <TableRow
                        key={`${effectivePlayerStatsTab}-${row.player_id}`}
                        hover
                        onClick={() => setDetailPlayerId(row.player_id)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover td': { bgcolor: '#f9fbff' },
                        }}
                      >
                        {activePlayerStatsModel.columns.map((column) => {
                          const isPlayerColumn = column.id === 'player';
                          const isRatingColumn = column.id === 'rating';

                          if (column.id === 'player') {
                            const player = playersById[row.player_id];
                            const position = player?.primary_position || player?.position || row.positionLabel || '-';
                            return (
                              <TableCell
                                key={`${row.player_id}-${column.id}`}
                                sx={{
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 4,
                                  bgcolor: '#f8fafc',
                                  borderRight: '1px solid #e1e7ef',
                                  minWidth: PLAYER_STATS_COLUMN_WIDTHS.player,
                                  maxWidth: PLAYER_STATS_COLUMN_WIDTHS.player,
                                  py: 0.58,
                                }}
                              >
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  <Avatar
                                    src={player?.photo_data_url || undefined}
                                    alt={player?.name || row.cells[column.id]}
                                    sx={{ width: 27, height: 27 }}
                                  />
                                  <Stack spacing={0}>
                                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 12 }} noWrap>
                                      {player?.name || row.cells[column.id]}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                      {position}
                                    </Typography>
                                  </Stack>
                                </Stack>
                              </TableCell>
                            );
                          }

                          if (isRatingColumn) {
                            const numericRating = Number(row.cells[column.id]);
                            return (
                              <TableCell
                                key={`${row.player_id}-${column.id}`}
                                align="center"
                                sx={{
                                  py: 0.58,
                                  minWidth: PLAYER_STATS_COLUMN_WIDTHS[column.id] || 88,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {Number.isFinite(numericRating) ? (
                                  <Box
                                    sx={{
                                      px: 0.55,
                                      minWidth: 30,
                                      height: 18,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 10.5,
                                      lineHeight: 1,
                                      ...getRatingBadgeStyles(numericRating, false),
                                    }}
                                  >
                                    {numericRating.toFixed(1)}
                                  </Box>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell
                              key={`${row.player_id}-${column.id}`}
                              align={isPlayerColumn ? 'left' : 'center'}
                              sx={{
                                py: 0.58,
                                px: 0.9,
                                minWidth: PLAYER_STATS_COLUMN_WIDTHS[column.id] || 108,
                                whiteSpace: 'nowrap',
                                color: '#2b3748',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {row.cells[column.id]}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        </Paper>
      ) : null}

      <Box
        data-export-ignore="true"
        aria-hidden="true"
        sx={{
          position: 'fixed',
          left: '-20000px',
          top: 0,
          width: '1080px',
          height: '1920px',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <Box
          ref={igStoryFrameRef}
          sx={{
            width: '1080px',
            height: '1920px',
            boxSizing: 'border-box',
            px: '66px',
            py: '76px',
            display: 'flex',
            flexDirection: 'column',
            gap: '26px',
            color: '#ffffff',
            bgcolor: '#0f1725',
            backgroundImage:
              'radial-gradient(circle at 8% 4%, rgba(255, 42, 99, 0.22), transparent 42%), radial-gradient(circle at 92% 96%, rgba(31, 125, 255, 0.2), transparent 40%)',
            fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: '28px',
              px: '28px',
              py: '24px',
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack spacing={0.8} alignItems="center" sx={{ minWidth: 190 }}>
                <Avatar
                  src={leftTeamLogo || undefined}
                  alt={teamName}
                  variant="rounded"
                  sx={{ width: 86, height: 86, bgcolor: '#ffffff', border: '1px solid rgba(255,255,255,0.26)' }}
                >
                  <SportsSoccerRoundedIcon sx={{ color: '#6c7686', fontSize: 36 }} />
                </Avatar>
                <Typography sx={{ fontSize: 32, fontWeight: 800, lineHeight: 1.05, textAlign: 'center', maxWidth: 240 }}>
                  {teamName || 'Our Team'}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                  {formatFormationLabel(ourLineupFormation)}
                </Typography>
              </Stack>

              <Stack spacing={0.5} alignItems="center">
                <Typography sx={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
                  {scopeDateTimeLabel}
                </Typography>
                <Typography sx={{ fontSize: 18, letterSpacing: '0.14em', fontWeight: 800, opacity: 0.8 }}>
                  MATCH SUMMARY
                </Typography>
              </Stack>

              <Stack spacing={0.8} alignItems="center" sx={{ minWidth: 190 }}>
                <Avatar
                  src={rightTeamLogo || undefined}
                  alt={opponentLabel}
                  variant="rounded"
                  sx={{ width: 86, height: 86, bgcolor: '#ffffff', border: '1px solid rgba(255,255,255,0.26)' }}
                >
                  <SportsSoccerRoundedIcon sx={{ color: '#6c7686', fontSize: 36 }} />
                </Avatar>
                <Typography sx={{ fontSize: 32, fontWeight: 800, lineHeight: 1.05, textAlign: 'center', maxWidth: 240 }}>
                  {opponentLabel}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                  {formatFormationLabel(opponentLineupFormation)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: '28px',
              px: '24px',
              py: '18px',
              bgcolor: 'rgba(12, 19, 32, 0.82)',
              border: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Typography sx={{ fontSize: 126, lineHeight: 0.95, fontWeight: 900, minWidth: 156, textAlign: 'center' }}>
                {storyScoreOur}
              </Typography>
              <Stack spacing={1.1} alignItems="center" sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 27, fontWeight: 800, letterSpacing: '0.18em' }}>FULL TIME</Typography>
                <Box
                  sx={{
                    px: '18px',
                    py: '8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.24)',
                    bgcolor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.12em' }}>
                    {storyStatusLabel}
                  </Typography>
                </Box>
              </Stack>
              <Typography sx={{ fontSize: 126, lineHeight: 0.95, fontWeight: 900, minWidth: 156, textAlign: 'center' }}>
                {storyScoreOpponent}
              </Typography>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: '28px',
              p: '30px 28px',
              bgcolor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.16)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography sx={{ fontSize: 30, fontWeight: 800, letterSpacing: '0.08em', mb: 2.2 }}>TOP 5 METRICS</Typography>
            <Stack spacing={1.55}>
              {igStoryDisplayRows.map((row) => (
                <Box key={row.id}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, auto) minmax(0, 1fr)',
                      alignItems: 'center',
                      columnGap: '18px',
                    }}
                  >
                    <Typography sx={{ fontSize: 34, fontWeight: 800, textAlign: 'left' }}>{row.ourDisplay}</Typography>
                    <Typography
                      sx={{
                        fontSize: 23,
                        fontWeight: 700,
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.86)',
                        lineHeight: 1.15,
                      }}
                    >
                      {row.label}
                    </Typography>
                    <Typography sx={{ fontSize: 34, fontWeight: 800, textAlign: 'right' }}>{row.oppDisplay}</Typography>
                  </Box>
                  <Box
                    sx={{
                      mt: 1.15,
                      height: 1,
                      bgcolor: 'rgba(255,255,255,0.14)',
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              pt: '4px',
              borderTop: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', opacity: 0.85 }}>
              Football Event Tracker
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 600, opacity: 0.7 }}>
              Generated {storyGeneratedAtLabel}
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Snackbar
        open={Boolean(statsExportNotice)}
        autoHideDuration={2800}
        onClose={() => setStatsExportNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={statsExportNotice?.type || 'error'}
          onClose={() => setStatsExportNotice(null)}
          sx={{ width: '100%' }}
        >
          {statsExportNotice?.message || ''}
        </Alert>
      </Snackbar>

      <Dialog open={Boolean(playerDetailData)} onClose={() => setDetailPlayerId('')} fullWidth maxWidth="sm">
        <DialogTitle>
          {playerDetailData ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                src={playerDetailData.player.photo_data_url || undefined}
                alt={playerDetailData.player.name}
                sx={{ width: 34, height: 34 }}
              />
              <span>
                {playerDetailData.player.name} - {playerDetailData.player.primary_position || playerDetailData.player.position || '-'}
              </span>
            </Stack>
          ) : (
            'Player Detail'
          )}
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.2, pt: 0.7 }}>
          {playerDetailData ? (
            <>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  p: 1.1,
                  borderRadius: 2,
                  bgcolor: '#f5f7fa',
                  border: '1px solid #dbe0e8',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Minutes
                  </Typography>
                  <Typography variant="h6">{playerDetailData.summary.minutes}'</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Starts
                  </Typography>
                  <Typography variant="h6">{playerDetailData.summary.starts}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sub Apps
                  </Typography>
                  <Typography variant="h6">{playerDetailData.summary.subApps}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Events
                  </Typography>
                  <Typography variant="h6">{playerDetailData.summary.totalEvents}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Rating
                  </Typography>
                  <Typography variant="h6">
                    {formatRating(playerDetailData.summary.rating, playerDetailData.summary.totalEvents)}
                  </Typography>
                </Box>
              </Stack>

              <Paper variant="outlined" sx={{ p: 0.8, borderColor: '#dbe0e8' }}>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Passes</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.passesAS}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Pass Accuracy</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.passAccuracyPct}%
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Crosses</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.crossesAS}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Dribbles</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.dribblesAS}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Aerial</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.aerialAS}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Cards (B/Y/R)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.cardsSummary}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                  <Typography variant="body2">Penalties (W/S/M)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {playerDetailData.summary.penaltiesSummary}
                  </Typography>
                </Stack>
              </Paper>

              {playerDetailData.categories.map((category) => (
                <Box key={category.label}>
                  <Typography variant="subtitle2" sx={{ mb: 0.4 }}>
                    {category.label}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 0.8, borderColor: '#e0e4ea' }}>
                    {category.items.map((item) => (
                      <Stack key={item.label} direction="row" justifyContent="space-between" sx={{ py: 0.55 }}>
                        <Typography variant="body2">{item.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Paper>
                </Box>
              ))}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
