import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import './App.css';
import {
  DEFAULT_ZONE,
  EVENT_KEY_BINDINGS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_POINTS,
  EVENT_TYPES,
  ZONES,
} from './domain/constants';
import { createEventCardViewModel, createInitialUIState } from './domain/ui';
import { ROLES, can } from './domain/permissions';
import {
  createCompetition,
  createPlayer as createPlayerRecord,
  createOpponent,
  createDraftMatch,
  createEvent,
  downloadBackupFile,
  deleteDraftMatchCascade,
  deleteEvent,
  exportDatabaseBackup,
  getTeamProfile,
  importDatabaseBackup,
  listCompetitions,
  getLatestDraftMatch,
  initDatabase,
  listEventsByMatch,
  listLineupsByMatch,
  listMatches,
  listOpponents,
  listPlayers,
  replaceLineup,
  saveTeamProfile,
  saveEvent,
  sortEvents,
  sortMatches,
  toggleOpponentActive,
  togglePlayerActive,
  updateCompetition,
  updateMatch,
  updateOpponent,
  updatePlayer as updatePlayerRecord,
} from './data/db';
import {
  DEFAULT_FORMATION,
  FORMATION_LAYOUTS,
  createSlotsForFormation,
  groupSlotsByRow,
} from './domain/formations';
import StatsView from './components/StatsView';
import TeamView from './components/TeamView';
import { buildTimelinePossession } from './domain/dashboardStats';

const ACTIVE_ROLE = ROLES.admin;
const STORAGE_KEYS = { playerId: 'football_tracker_active_player', zone: 'football_tracker_active_zone' };
const ZONE_HOTKEYS = {
  '1': 'defense',
  '2': 'midfield',
  '3': 'final_third',
  '4': 'box',
};
const HALF_MINUTES = 25;
const FULL_TIME_MINUTES = 50;
const HALF_SECONDS = HALF_MINUTES * 60;
const FULL_TIME_SECONDS = FULL_TIME_MINUTES * 60;
const MATCH_PHASES = {
  firstHalf: 'first_half',
  halfTime: 'half_time',
  secondHalf: 'second_half',
  fullTime: 'full_time',
};
const MAX_SUBSTITUTIONS_PER_MATCH = 5;
const DERIVED_EVENT_TYPES = {
  key_pass: ['pass_success'],
};
const SHOT_OUTCOME_TYPES = new Set(['shot_on', 'shot_off', 'shot_blocked', 'goal']);
const SHOT_CONTEXT_OPTIONS = [
  { id: 'inside_box', label: 'Inside Box' },
  { id: 'outside_box', label: 'Outside Box' },
];
const GOAL_SOURCE_TYPE_OPTIONS = [
  { id: 'open_play', label: 'Open Play' },
  { id: 'freekick', label: 'Freekick' },
  { id: 'own_goal', label: 'Own Goal' },
];
const SHOT_OUTCOME_OPTIONS = [
  { id: 'shot_on', label: 'Shot On Target' },
  { id: 'shot_off', label: 'Shot Off Target' },
  { id: 'shot_blocked', label: 'Shot Blocked' },
  { id: 'goal', label: 'Goal' },
];
const PENALTY_OUTCOME_OPTIONS = [
  { id: 'made', label: 'Made' },
  { id: 'missed', label: 'Missed' },
];
const BIG_CHANCE_RESULT_OPTIONS = [
  { id: 'goal', label: 'Goal' },
  { id: 'miss', label: 'Miss' },
];
const BIG_CHANCE_TYPE_OPTIONS = [
  { id: 'shot', label: 'Shot' },
  { id: 'pass', label: 'Pass' },
  { id: 'ball_loss', label: 'Ball Loss' },
];
const BIG_CHANCE_PASS_TYPE_OPTIONS = [
  { id: 'pass_success', label: 'Pass Success' },
  { id: 'pass_fail', label: 'Pass Fail' },
];
const BIG_CHANCE_MISS_SHOT_OUTCOME_OPTIONS = SHOT_OUTCOME_OPTIONS.filter((option) => option.id !== 'goal');
const BALL_LOSS_MIRROR_OPTIONS = [
  { id: 'interception', label: 'Interception' },
  { id: 'tackle_win', label: 'Tackle Win' },
  { id: 'throw_in_won', label: 'Throw ins' },
  { id: 'no_mirror', label: 'No Mirror' },
];
const BALL_LOSS_MIRROR_RULE_BY_CHOICE = {
  interception: 'ball_loss_to_interception',
  tackle_win: 'ball_loss_to_tackle_win',
  throw_in_won: 'ball_loss_to_throw_in_won',
  no_mirror: 'ball_loss_no_mirror',
};
const BALL_LOSS_MIRROR_TYPE_BY_CHOICE = {
  interception: 'interception',
  tackle_win: 'tackle_win',
  throw_in_won: 'throw_in_won',
  no_mirror: '',
};
const QUICK_ACTION_ROWS = [
  ['pass_success', 'pass_fail', 'key_pass', 'long_pass_success'],
  ['long_pass_fail', 'throw_in_won', 'shot_on', 'shot_off'],
  ['shot_blocked', 'goal'],
  ['cross', 'cross_fail', 'dribble_success', 'dribble_fail'],
  ['clearance', 'block', 'tackle_win', 'interception'],
  ['aerial_win', 'aerial_fail', 'foul_won', 'foul_committed'],
  ['big_chance_won', 'create_big_chance', 'error_leads_shot', 'error_leads_goal'],
  ['offside', 'corner_taken', 'penalty_won', 'substitution'],
  ['blue_card', 'yellow_card', 'red_card'],
];
const EVENT_SIDE_OPTIONS = [
  { id: 'our', label: 'Our Team' },
  { id: 'opponent', label: 'Opponent' },
];
const FEED_SIDE_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'our', label: 'Our Team' },
  { id: 'opponent', label: 'Opponent' },
];
const HIDDEN_FEED_EVENT_TYPES = new Set();
const MIRROR_GK_AUTO_EVENT_TYPES = new Set(['save', 'goal_conceded']);
const QUICK_EVENT_CREATE_STATUS = {
  created: 'created',
  deferredMirrorPlayerPick: 'deferred_mirror_player_pick',
  blockedOrError: 'blocked_or_error',
};
const POSSESSION_SWITCH_EVENT_TYPES = new Set([
  'pass_fail',
  'long_pass_fail',
  'cross_fail',
  'dribble_fail',
  'aerial_fail',
  'offside',
  'foul_committed',
]);
const ATTRIBUTION_EVENT_TYPES = new Set([
  'goal',
  'assist',
  'shot_on',
  'shot_off',
  'shot_blocked',
  'create_big_chance',
  'blue_card',
  'yellow_card',
  'red_card',
  'big_chance_won',
  'error_leads_shot',
  'error_leads_goal',
]);
const SLOT_POSITION_PREFERENCES = {
  GK: ['GK'],
  LB: ['LB'],
  RB: ['RB'],
  LW: ['LW'],
  RW: ['RW'],
  LM: ['LW', 'CM'],
  RM: ['RW', 'CM'],
};
const BENCH_SLOT_LABEL = 'BENCH';
const BENCH_SLOT_ORDER_BASE = 100;
const DEFAULT_TEAM_PROFILE = {
  id: 'team_profile',
  name: 'Moda Old Boys',
  logo_url: '',
  primary_color: '#1f6a3a',
};
const LIVE_UI_TOKENS = {
  liveBg: '#f2f7f1',
  surface: '#fbfdf9',
  surfaceAlt: '#f1f6ef',
  border: '#c7d6c8',
  textPrimary: '#183125',
  textSecondary: '#567063',
  accentGreen: '#2b9a5f',
  accentAmber: '#c48628',
  danger: '#d05d53',
};
const LIVE_POPUP_PAPER_SX = {
  backgroundColor: LIVE_UI_TOKENS.surface,
  border: `1px solid ${LIVE_UI_TOKENS.border}`,
  boxShadow: '0 20px 36px rgba(20, 42, 30, 0.16)',
  color: LIVE_UI_TOKENS.textPrimary,
};
const LIVE_POPUP_TITLE_SX = {
  color: LIVE_UI_TOKENS.textPrimary,
  borderBottom: `1px solid ${LIVE_UI_TOKENS.border}`,
  pb: 1.1,
};
const LIVE_POPUP_CONTENT_SX = {
  color: LIVE_UI_TOKENS.textPrimary,
  '& .MuiTypography-caption': { color: LIVE_UI_TOKENS.textSecondary },
  '& .MuiAlert-root': {
    backgroundColor: 'rgba(47, 179, 106, 0.12)',
    border: `1px solid ${LIVE_UI_TOKENS.border}`,
    color: LIVE_UI_TOKENS.textPrimary,
  },
  '& .MuiChip-root': {
    backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
    color: LIVE_UI_TOKENS.textSecondary,
    border: `1px solid ${LIVE_UI_TOKENS.border}`,
  },
  '& .MuiButton-root': {
    textTransform: 'none',
  },
  '& .MuiButton-outlined': {
    borderColor: LIVE_UI_TOKENS.border,
    color: LIVE_UI_TOKENS.textPrimary,
    backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
    '&:hover': {
      borderColor: LIVE_UI_TOKENS.accentGreen,
      backgroundColor: 'rgba(47, 179, 106, 0.16)',
    },
  },
  '& .MuiButton-contained': {
    backgroundColor: LIVE_UI_TOKENS.accentGreen,
    color: '#072313',
    '&:hover': {
      backgroundColor: '#34c274',
    },
  },
};
const LIVE_POPUP_ACTIONS_SX = {
  px: 3,
  pb: 2.5,
  borderTop: `1px solid ${LIVE_UI_TOKENS.border}`,
  backgroundColor: '#f7fbf6',
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredState(key, fallbackValue) {
  try {
    return localStorage.getItem(key) || fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeStoredState(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in private browsing contexts.
  }
}

function formatMinuteSecond(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(Math.max(0, totalSeconds % 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatClock(totalSeconds, matchPhase) {
  if (matchPhase === MATCH_PHASES.halfTime) {
    return `${HALF_MINUTES}:00`;
  }

  if (matchPhase === MATCH_PHASES.firstHalf && totalSeconds > HALF_SECONDS) {
    return `${HALF_MINUTES}+${formatMinuteSecond(totalSeconds - HALF_SECONDS)}`;
  }

  if (matchPhase === MATCH_PHASES.secondHalf && totalSeconds > FULL_TIME_SECONDS) {
    return `${FULL_TIME_MINUTES}+${formatMinuteSecond(totalSeconds - FULL_TIME_SECONDS)}`;
  }

  if (matchPhase === MATCH_PHASES.fullTime && totalSeconds > FULL_TIME_SECONDS) {
    return `${FULL_TIME_MINUTES}+${formatMinuteSecond(totalSeconds - FULL_TIME_SECONDS)}`;
  }

  return formatMinuteSecond(totalSeconds);
}

function inferElapsedFromEvents(events) {
  return events.reduce((maxValue, event) => Math.max(maxValue, event.minute * 60 + event.second), 0);
}

function inferMatchPhase(match, elapsedSeconds) {
  if (!match) {
    return MATCH_PHASES.firstHalf;
  }

  if (match.phase && Object.values(MATCH_PHASES).includes(match.phase)) {
    return match.phase;
  }

  if (match.status === 'completed') {
    return MATCH_PHASES.fullTime;
  }

  if (elapsedSeconds > HALF_SECONDS) {
    return MATCH_PHASES.secondHalf;
  }

  return MATCH_PHASES.firstHalf;
}

function createActionGroupId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `action_${crypto.randomUUID()}`;
  }

  return `action_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isTimerActivePhase(matchPhase) {
  return matchPhase === MATCH_PHASES.firstHalf || matchPhase === MATCH_PHASES.secondHalf;
}

function resolveEventPeriod(matchPhase, minuteValue = 0) {
  if (matchPhase === MATCH_PHASES.firstHalf) {
    return MATCH_PHASES.firstHalf;
  }

  if (matchPhase === MATCH_PHASES.secondHalf || matchPhase === MATCH_PHASES.fullTime) {
    return MATCH_PHASES.secondHalf;
  }

  return minuteValue < HALF_MINUTES ? MATCH_PHASES.firstHalf : MATCH_PHASES.secondHalf;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getOppositeSide(side) {
  return side === 'opponent' ? 'our' : 'opponent';
}

function mapZoneForPossessionSwitch(sourceZone) {
  if (sourceZone === 'defense') {
    return 'final_third';
  }
  if (sourceZone === 'midfield') {
    return 'midfield';
  }
  return 'defense';
}

function normalizeBallLossMirrorChoice(choice) {
  const normalized = String(choice || '').trim();
  return Object.prototype.hasOwnProperty.call(BALL_LOSS_MIRROR_RULE_BY_CHOICE, normalized)
    ? normalized
    : 'interception';
}

function getBallLossChoiceFromMirrorRule(mirrorRule) {
  const entry = Object.entries(BALL_LOSS_MIRROR_RULE_BY_CHOICE).find(([, ruleValue]) => ruleValue === mirrorRule);
  return entry?.[0] || 'interception';
}

function buildMirrorDescriptor(eventType, options = {}) {
  if (eventType === 'aerial_win') {
    return {
      rule: 'aerial_win_to_aerial_fail',
      mirrorType: 'aerial_fail',
      shouldSwitchContext: false,
      mirrorZone: 'same',
      contextZone: 'defense',
    };
  }

  if (eventType === 'aerial_fail') {
    return {
      rule: 'aerial_fail_to_aerial_win',
      mirrorType: 'aerial_win',
      shouldSwitchContext: true,
      mirrorZone: 'same',
      contextZone: 'mapped',
    };
  }

  if (eventType === 'foul_won') {
    return {
      rule: 'foul_won_to_foul_committed',
      mirrorType: 'foul_committed',
      shouldSwitchContext: false,
      mirrorZone: 'same',
      contextZone: 'defense',
    };
  }

  if (eventType === 'foul_committed') {
    return {
      rule: 'foul_committed_to_foul_won',
      mirrorType: 'foul_won',
      shouldSwitchContext: true,
      mirrorZone: 'same',
      contextZone: 'mapped',
    };
  }

  if (eventType === 'penalty_won') {
    return {
      rule: 'penalty_won_to_foul_committed',
      mirrorType: 'foul_committed',
      shouldSwitchContext: false,
      mirrorZone: 'same',
      contextZone: 'defense',
    };
  }

  if (eventType === 'ball_loss') {
    const choice = normalizeBallLossMirrorChoice(
      options.ballLossChoice || getBallLossChoiceFromMirrorRule(options.mirrorRuleHint),
    );
    return {
      rule: BALL_LOSS_MIRROR_RULE_BY_CHOICE[choice],
      mirrorType: BALL_LOSS_MIRROR_TYPE_BY_CHOICE[choice],
      shouldSwitchContext: true,
      mirrorZone: 'defense',
      ballLossChoice: choice,
    };
  }

  if (eventType === 'shot_blocked') {
    return {
      rule: 'shot_blocked_to_block',
      mirrorType: 'block',
      shouldSwitchContext: true,
      mirrorZone: 'defense',
      contextZone: 'defense',
    };
  }

  if (eventType === 'shot_on') {
    return {
      rule: 'shot_on_to_save',
      mirrorType: 'save',
      shouldSwitchContext: true,
      mirrorZone: 'defense',
      contextZone: 'defense',
    };
  }

  if (eventType === 'shot_off') {
    return {
      rule: 'shot_off_to_possession_switch',
      mirrorType: '',
      shouldSwitchContext: true,
      mirrorZone: 'defense',
      contextZone: 'defense',
    };
  }

  if (eventType === 'goal') {
    return {
      rule: 'goal_to_goal_conceded',
      mirrorType: 'goal_conceded',
      shouldSwitchContext: false,
      mirrorZone: 'same',
      contextZone: 'defense',
    };
  }

  return null;
}

function normalizeSeasonTag(value) {
  return String(value || '').trim();
}

function normalizePosition(value) {
  return String(value || '').trim().toUpperCase();
}

function getPlayerPrimaryPosition(player) {
  return normalizePosition(player?.primary_position || player?.position || '');
}

function getPlayerPositions(player) {
  const primaryPosition = getPlayerPrimaryPosition(player);
  const extraPositions = Array.isArray(player?.extra_positions)
    ? player.extra_positions.map((position) => normalizePosition(position)).filter(Boolean)
    : [];
  return [...new Set([primaryPosition, ...extraPositions].filter(Boolean))];
}

function getCanonicalRoleFromSlotLabel(slotLabel = '') {
  const normalizedLabel = String(slotLabel || '').trim().toUpperCase();
  if (!normalizedLabel) {
    return '';
  }

  const prefixes = ['GK', 'CB', 'RB', 'LB', 'CM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  for (const prefix of prefixes) {
    if (normalizedLabel === prefix || normalizedLabel.startsWith(`${prefix}-`) || normalizedLabel.startsWith(prefix)) {
      return prefix;
    }
  }

  return '';
}

function splitLineupsByRole(lineups = []) {
  const starters = [];
  const bench = [];

  lineups.forEach((lineup) => {
    if (!lineup?.player_id) {
      return;
    }

    const isBenchEntry = lineup.role === 'bench' || lineup.slot_label === BENCH_SLOT_LABEL;

    if (isBenchEntry) {
      bench.push(lineup);
      return;
    }

    starters.push(lineup);
  });

  const bySlotOrder = (a, b) => {
    const aOrder = Number.isFinite(a.slot_order) ? a.slot_order : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.slot_order) ? b.slot_order : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return (a.created_at || '').localeCompare(b.created_at || '');
  };

  starters.sort(bySlotOrder);
  bench.sort(bySlotOrder);

  return { starters, bench };
}

function detectFormationFromLineups(lineups) {
  const { starters } = splitLineupsByRole(lineups);
  const lineupFormation = starters[0]?.slot_id?.split('_r')[0];

  if (lineupFormation && FORMATION_LAYOUTS[lineupFormation]) {
    return lineupFormation;
  }

  return DEFAULT_FORMATION;
}

function resolveOpponentFormation(match, fallbackFormation = DEFAULT_FORMATION) {
  const preferredOpponentFormation = String(match?.opponent_formation || '').trim();
  if (preferredOpponentFormation && FORMATION_LAYOUTS[preferredOpponentFormation]) {
    return preferredOpponentFormation;
  }

  const fallbackCandidate = String(match?.formation || fallbackFormation || '').trim();
  if (fallbackCandidate && FORMATION_LAYOUTS[fallbackCandidate]) {
    return fallbackCandidate;
  }

  return DEFAULT_FORMATION;
}

function getPreferredPositionsForSlot(slotLabel = '') {
  const normalizedLabel = slotLabel.toUpperCase();

  if (SLOT_POSITION_PREFERENCES[normalizedLabel]) {
    return SLOT_POSITION_PREFERENCES[normalizedLabel];
  }

  if (normalizedLabel.startsWith('CB')) {
    return ['CB'];
  }

  if (normalizedLabel.startsWith('CM')) {
    return ['CM'];
  }

  if (normalizedLabel.startsWith('ST')) {
    return ['ST'];
  }

  return [];
}

function sortPlayersForSlot(slotLabel, players, selectedState = {}) {
  const preferredPositions = getPreferredPositionsForSlot(slotLabel);
  const preferredLookup = preferredPositions.reduce((lookup, position, index) => {
    lookup[position] = index;
    return lookup;
  }, {});
  const selectedPlayerIds = selectedState.selectedPlayerIds || new Set();
  const currentPlayerId = selectedState.currentPlayerId || '';

  return [...players].sort((playerA, playerB) => {
    const aPositions = getPlayerPositions(playerA);
    const bPositions = getPlayerPositions(playerB);
    const aPreference = aPositions.reduce((minValue, position) => {
      if (Object.prototype.hasOwnProperty.call(preferredLookup, position)) {
        return Math.min(minValue, preferredLookup[position]);
      }
      return minValue;
    }, Number.MAX_SAFE_INTEGER);
    const bPreference = bPositions.reduce((minValue, position) => {
      if (Object.prototype.hasOwnProperty.call(preferredLookup, position)) {
        return Math.min(minValue, preferredLookup[position]);
      }
      return minValue;
    }, Number.MAX_SAFE_INTEGER);

    if (aPreference !== bPreference) {
      return aPreference - bPreference;
    }

    const aIsSelectedElsewhere = selectedPlayerIds.has(playerA.id) && playerA.id !== currentPlayerId ? 1 : 0;
    const bIsSelectedElsewhere = selectedPlayerIds.has(playerB.id) && playerB.id !== currentPlayerId ? 1 : 0;
    if (aIsSelectedElsewhere !== bIsSelectedElsewhere) {
      return aIsSelectedElsewhere - bIsSelectedElsewhere;
    }

    if ((playerA.order ?? 0) !== (playerB.order ?? 0)) {
      return (playerA.order ?? 0) - (playerB.order ?? 0);
    }

    return playerA.name.localeCompare(playerB.name);
  });
}

function sortEventsByTimeline(events = []) {
  return [...events].sort((eventA, eventB) => {
    if ((eventA.minute || 0) !== (eventB.minute || 0)) {
      return (eventA.minute || 0) - (eventB.minute || 0);
    }

    if ((eventA.second || 0) !== (eventB.second || 0)) {
      return (eventA.second || 0) - (eventB.second || 0);
    }

    return (eventA.created_at || '').localeCompare(eventB.created_at || '');
  });
}

function deriveLiveLineupState(baseStarterSlots = [], baseBenchPlayerIds = [], events = []) {
  const liveSlots = baseStarterSlots.map((slot) => ({ ...slot }));
  const pitchPlayerBySlotId = new Map();
  const slotIdByPlayerId = new Map();
  const dismissedPlayerIds = new Set();

  liveSlots.forEach((slot) => {
    if (!slot.player_id) {
      return;
    }

    pitchPlayerBySlotId.set(slot.slot_id, slot.player_id);
    slotIdByPlayerId.set(slot.player_id, slot.slot_id);
  });

  const liveBench = [];
  const pushBenchUnique = (playerId) => {
    if (
      !playerId ||
      dismissedPlayerIds.has(playerId) ||
      slotIdByPlayerId.has(playerId) ||
      liveBench.includes(playerId)
    ) {
      return;
    }
    liveBench.push(playerId);
  };

  baseBenchPlayerIds.forEach(pushBenchUnique);

  const timelineEvents = sortEventsByTimeline(
    events.filter(
      (event) => !event.is_derived && (event.type === 'substitution' || event.type === 'red_card'),
    ),
  );

  timelineEvents.forEach((event) => {
    if (event.type === 'red_card') {
      const dismissedPlayerId = event.player_id;
      if (!dismissedPlayerId) {
        return;
      }

      dismissedPlayerIds.add(dismissedPlayerId);

      const slotId = slotIdByPlayerId.get(dismissedPlayerId);
      if (slotId) {
        slotIdByPlayerId.delete(dismissedPlayerId);
        pitchPlayerBySlotId.delete(slotId);
      }

      const benchIndex = liveBench.indexOf(dismissedPlayerId);
      if (benchIndex !== -1) {
        liveBench.splice(benchIndex, 1);
      }
      return;
    }

    const playerOutId = event.player_out_id || event.player_id;
    const playerInId = event.player_in_id;
    if (!playerOutId || !playerInId || playerOutId === playerInId) {
      return;
    }

    const slotId = slotIdByPlayerId.get(playerOutId);
    if (!slotId || slotIdByPlayerId.has(playerInId) || dismissedPlayerIds.has(playerInId)) {
      return;
    }

    const benchIndex = liveBench.indexOf(playerInId);
    if (benchIndex === -1) {
      return;
    }

    liveBench.splice(benchIndex, 1);
    pushBenchUnique(playerOutId);

    slotIdByPlayerId.delete(playerOutId);
    slotIdByPlayerId.set(playerInId, slotId);
    pitchPlayerBySlotId.set(slotId, playerInId);
  });

  const starters = liveSlots.map((slot) => ({
    ...slot,
    player_id: pitchPlayerBySlotId.get(slot.slot_id) || '',
  }));

  return {
    starters,
    benchPlayerIds: liveBench,
    dismissedPlayerIds: [...dismissedPlayerIds],
  };
}

function buildPlayedRolesByPlayer(lineups = [], events = []) {
  const { starters } = splitLineupsByRole(lineups);
  const slotRoleBySlotId = new Map();
  const slotIdByPlayerId = new Map();
  const rolesByPlayerId = new Map();

  const addRole = (playerId, role) => {
    if (!playerId || !role) {
      return;
    }

    if (!rolesByPlayerId.has(playerId)) {
      rolesByPlayerId.set(playerId, new Set());
    }
    rolesByPlayerId.get(playerId).add(role);
  };

  starters.forEach((slot) => {
    const role = getCanonicalRoleFromSlotLabel(slot.slot_label);
    slotRoleBySlotId.set(slot.slot_id, role);
    if (!slot.player_id) {
      return;
    }

    slotIdByPlayerId.set(slot.player_id, slot.slot_id);
    addRole(slot.player_id, role);
  });

  const substitutionEvents = sortEventsByTimeline(
    events.filter((event) => event.type === 'substitution' && !event.is_derived),
  );

  substitutionEvents.forEach((event) => {
    const playerOutId = event.player_out_id || event.player_id;
    const playerInId = event.player_in_id;
    if (!playerOutId || !playerInId || playerOutId === playerInId) {
      return;
    }

    const slotId = slotIdByPlayerId.get(playerOutId);
    if (!slotId || slotIdByPlayerId.has(playerInId)) {
      return;
    }

    slotIdByPlayerId.delete(playerOutId);
    slotIdByPlayerId.set(playerInId, slotId);
    addRole(playerInId, slotRoleBySlotId.get(slotId));
  });

  return rolesByPlayerId;
}

function formatImportSummary(result) {
  if (!result) {
    return 'Import completed.';
  }

  return `Import complete: +${result.inserted} added, ${result.updated} updated, ${result.skipped} skipped.`;
}

function App() {
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState('');
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [uiView, setUiView] = useState('live');
  const [statsScope, setStatsScope] = useState('all');
  const [teamScope, setTeamScope] = useState('all');
  const [teamProfile, setTeamProfile] = useState(DEFAULT_TEAM_PROFILE);
  const [dataSafetyStatus, setDataSafetyStatus] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(() => readStoredState(STORAGE_KEYS.playerId, ''));
  const [liveEventSide, setLiveEventSide] = useState('our');
  const [selectedZone, setSelectedZone] = useState(() => readStoredState(STORAGE_KEYS.zone, DEFAULT_ZONE));
  const [matchControlDialogOpen, setMatchControlDialogOpen] = useState(false);
  const [playersHeaderExpanded, setPlayersHeaderExpanded] = useState(false);
  const [matchDateInput, setMatchDateInput] = useState(todayDate());
  const [competitionIdInput, setCompetitionIdInput] = useState('');
  const [competitionRoundInput, setCompetitionRoundInput] = useState('1');
  const [opponentIdInput, setOpponentIdInput] = useState('');
  const [opponentFormationInput, setOpponentFormationInput] = useState(DEFAULT_FORMATION);
  const [competitionDialogOpen, setCompetitionDialogOpen] = useState(false);
  const [newCompetitionTypeInput, setNewCompetitionTypeInput] = useState('league');
  const [newCompetitionNameInput, setNewCompetitionNameInput] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [matchPhase, setMatchPhase] = useState(MATCH_PHASES.firstHalf);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEditMode, setTimerEditMode] = useState(false);
  const [timerMinuteInput, setTimerMinuteInput] = useState('0');
  const [timerSecondInput, setTimerSecondInput] = useState('00');
  const [pendingShotType, setPendingShotType] = useState('');
  const [pendingShotPlayerId, setPendingShotPlayerId] = useState('');
  const [pendingShotSide, setPendingShotSide] = useState('our');
  const [pendingBallLossSide, setPendingBallLossSide] = useState('');
  const [pendingBallLossPlayerId, setPendingBallLossPlayerId] = useState('');
  const [ballLossMirrorChoiceInput, setBallLossMirrorChoiceInput] = useState('interception');
  const [isSubmittingBallLoss, setIsSubmittingBallLoss] = useState(false);
  const [shotOutcomeInput, setShotOutcomeInput] = useState('shot_on');
  const [shotOutcomeOptionsInput, setShotOutcomeOptionsInput] = useState(SHOT_OUTCOME_OPTIONS);
  const [shotOutcomeSelectable, setShotOutcomeSelectable] = useState(false);
  const [shotContextInput, setShotContextInput] = useState('');
  const [shotIsHeaderInput, setShotIsHeaderInput] = useState(false);
  const [shotHitWoodworkInput, setShotHitWoodworkInput] = useState(false);
  const [shotGoalSourceTypeInput, setShotGoalSourceTypeInput] = useState('');
  const [shotAssistPlayerIdInput, setShotAssistPlayerIdInput] = useState('');
  const [isSubmittingShot, setIsSubmittingShot] = useState(false);
  const [pendingBigChanceShotContext, setPendingBigChanceShotContext] = useState(null);
  const [pendingPenaltySide, setPendingPenaltySide] = useState('our');
  const [pendingPenaltyFouledPlayerId, setPendingPenaltyFouledPlayerId] = useState(null);
  const [penaltyTakerInput, setPenaltyTakerInput] = useState('');
  const [penaltyFoulCommittedPlayerInput, setPenaltyFoulCommittedPlayerInput] = useState('');
  const [penaltyOutcomeInput, setPenaltyOutcomeInput] = useState('');
  const [isSubmittingPenalty, setIsSubmittingPenalty] = useState(false);
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [substitutionPlayerOutInput, setSubstitutionPlayerOutInput] = useState('');
  const [substitutionPlayerInInput, setSubstitutionPlayerInInput] = useState('');
  const [isSubmittingSubstitution, setIsSubmittingSubstitution] = useState(false);
  const [pendingBigChancePlayerId, setPendingBigChancePlayerId] = useState(null);
  const [pendingBigChanceMissPlayerId, setPendingBigChanceMissPlayerId] = useState(null);
  const [bigChanceResultInput, setBigChanceResultInput] = useState('goal');
  const [bigChanceTypeInput, setBigChanceTypeInput] = useState('shot');
  const [bigChancePassTypeInput, setBigChancePassTypeInput] = useState('');
  const [isSubmittingBigChanceStep, setIsSubmittingBigChanceStep] = useState(false);
  const [playerPickerDialogOpen, setPlayerPickerDialogOpen] = useState(false);
  const [pendingPlayerEventType, setPendingPlayerEventType] = useState('');
  const [pendingPlayerEventSide, setPendingPlayerEventSide] = useState('our');
  const [pendingPlayerEventContext, setPendingPlayerEventContext] = useState(null);
  const [pendingPlayerMirrorTargetType, setPendingPlayerMirrorTargetType] = useState('');
  const [pendingPlayerSelectionInput, setPendingPlayerSelectionInput] = useState('');
  const [isSubmittingPlayerPick, setIsSubmittingPlayerPick] = useState(false);
  const [uiState, setUiState] = useState(() => createInitialUIState());
  const [lineupDialogOpen, setLineupDialogOpen] = useState(false);
  const [lineupSetupError, setLineupSetupError] = useState('');
  const [lineupFormation, setLineupFormation] = useState(DEFAULT_FORMATION);
  const [lineupSlots, setLineupSlots] = useState(() => createSlotsForFormation(DEFAULT_FORMATION));
  const [lineupBenchPlayerIds, setLineupBenchPlayerIds] = useState([]);
  const [lineupFocusedSlotId, setLineupFocusedSlotId] = useState(() => createSlotsForFormation(DEFAULT_FORMATION)[0]?.slot_id || '');
  const [activeLineupSlots, setActiveLineupSlots] = useState([]);
  const [activeBenchPlayerIds, setActiveBenchPlayerIds] = useState([]);
  const [lineupsByMatch, setLineupsByMatch] = useState({});
  const [startAfterLineupSetup, setStartAfterLineupSetup] = useState(false);

  const canCreateEvent = can(ACTIVE_ROLE, 'create_event');
  const canEditEvent = can(ACTIVE_ROLE, 'edit_event');
  const canDeleteEvent = can(ACTIVE_ROLE, 'delete_event');
  const canCompleteMatch = can(ACTIVE_ROLE, 'complete_match');

  const activeMatch = useMemo(() => matches.find((match) => match.id === activeMatchId) ?? null, [matches, activeMatchId]);
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? null, [events, selectedEventId]);

  const playersById = useMemo(() => {
    const lookup = {};
    players.forEach((player) => {
      lookup[player.id] = player;
    });
    return lookup;
  }, [players]);
  const activePlayers = useMemo(
    () => players.filter((player) => player.is_active !== false),
    [players],
  );
  const competitionsById = useMemo(() => {
    return competitions.reduce((lookup, competition) => {
      lookup[competition.id] = competition;
      return lookup;
    }, {});
  }, [competitions]);
  const selectedCompetition = competitionIdInput ? competitionsById[competitionIdInput] || null : null;
  const filteredOpponents = useMemo(() => {
    if (!competitionIdInput) {
      return opponents.filter((opponent) => opponent.is_active !== false);
    }

    return opponents.filter(
      (opponent) =>
        opponent.is_active !== false &&
        Array.isArray(opponent.competition_ids) &&
        opponent.competition_ids.includes(competitionIdInput),
    );
  }, [competitionIdInput, opponents]);
  const selectedOpponent = useMemo(
    () => filteredOpponents.find((opponent) => opponent.id === opponentIdInput) || null,
    [filteredOpponents, opponentIdInput],
  );
  const competitionRoundLabel = selectedCompetition?.type === 'cup' ? 'Round' : 'Week';

  const eventById = useMemo(() => {
    const lookup = {};
    events.forEach((event) => {
      lookup[event.id] = event;
    });
    return lookup;
  }, [events]);
  const eventsByActionGroupId = useMemo(() => {
    const groups = {};
    events.forEach((event) => {
      if (!event.action_group_id) {
        return;
      }

      if (!groups[event.action_group_id]) {
        groups[event.action_group_id] = [];
      }

      groups[event.action_group_id].push(event);
    });
    return groups;
  }, [events]);

  const eventViewModels = useMemo(
    () => [...events].reverse().map((event) => createEventCardViewModel(event, playersById, event.id === selectedEventId)),
    [events, playersById, selectedEventId],
  );
  const filteredEventViewModels = useMemo(() => {
    return eventViewModels.filter((eventView) => {
      const sourceEvent = eventById[eventView.id];
      if (!sourceEvent) {
        return false;
      }

      if (HIDDEN_FEED_EVENT_TYPES.has(sourceEvent.type)) {
        return false;
      }

      if (uiState.feedFilter === 'our') {
        if (sourceEvent.side === 'opponent') {
          return false;
        }
      }

      if (uiState.feedFilter === 'opponent') {
        if (sourceEvent.side !== 'opponent') {
          return false;
        }
      }

      return true;
    });
  }, [eventById, eventViewModels, uiState.feedFilter]);
  const visibleEventFeedTotal = useMemo(
    () => events.reduce((total, event) => (HIDDEN_FEED_EVENT_TYPES.has(event.type) ? total : total + 1), 0),
    [events],
  );
  const attributionQueueEvents = useMemo(() => {
    return sortEvents(
      events.filter(
        (event) =>
          event.side !== 'opponent' &&
          !event.player_id &&
          ATTRIBUTION_EVENT_TYPES.has(event.type) &&
          (!event.is_derived || event.source_action === 'big_chance_won'),
      ),
    );
  }, [events]);

  const isDraftMatch = activeMatch?.status === 'draft';
  const eventFeedCountLabel = `${filteredEventViewModels.length}/${visibleEventFeedTotal}`;
  const actionHotkeyByType = useMemo(() => {
    return Object.entries(EVENT_KEY_BINDINGS).reduce((lookup, [hotkey, eventType]) => {
      if (!lookup[eventType]) {
        lookup[eventType] = hotkey.toUpperCase();
      }
      return lookup;
    }, {});
  }, []);
  const quickActionRows = useMemo(() => {
    return QUICK_ACTION_ROWS.map((row, rowIndex) =>
      row.map((entry, columnIndex) => {
        return {
          key: `${entry}-${rowIndex}-${columnIndex}`,
          eventType: entry,
          label: EVENT_TYPE_LABELS[entry] || entry,
          hotkey: actionHotkeyByType[entry] || '',
        };
      }),
    );
  }, [actionHotkeyByType]);
  const zoneSelectorOptions = useMemo(
    () => (liveEventSide === 'our' ? ZONES : [...ZONES].reverse()),
    [liveEventSide],
  );
  const livePossession = useMemo(() => {
    if (elapsedSeconds <= 0) {
      return { ourPct: 0, oppPct: 0 };
    }

    return buildTimelinePossession(events, {
      endSeconds: elapsedSeconds,
      kickoffSide: 'our',
    });
  }, [elapsedSeconds, events]);
  const liveLineupState = useMemo(
    () => deriveLiveLineupState(activeLineupSlots, activeBenchPlayerIds, events),
    [activeBenchPlayerIds, activeLineupSlots, events],
  );
  const liveStarterSlots = liveLineupState.starters;
  const liveBenchPlayerIds = liveLineupState.benchPlayerIds;
  const dismissedOurPlayerIds = useMemo(
    () => new Set((liveLineupState.dismissedPlayerIds || []).filter(Boolean)),
    [liveLineupState.dismissedPlayerIds],
  );
  const liveGoalkeeperId = useMemo(() => {
    const keeperSlot = liveStarterSlots.find(
      (slot) => slot.player_id && getCanonicalRoleFromSlotLabel(slot.slot_label) === 'GK',
    );
    if (keeperSlot?.player_id) {
      return keeperSlot.player_id;
    }

    const fallbackKeeper = liveStarterSlots.find((slot) => {
      if (!slot.player_id) {
        return false;
      }
      const player = playersById[slot.player_id];
      return getPlayerPrimaryPosition(player) === 'GK';
    });

    return fallbackKeeper?.player_id || '';
  }, [liveStarterSlots, playersById]);
  const liveStarterPlayerIds = useMemo(
    () => new Set(liveStarterSlots.map((slot) => slot.player_id).filter(Boolean)),
    [liveStarterSlots],
  );
  const substitutionCount = useMemo(
    () => events.filter((event) => event.type === 'substitution' && !event.is_derived).length,
    [events],
  );
  const canAddSubstitution = substitutionCount < MAX_SUBSTITUTIONS_PER_MATCH;
  const substitutionOutPlayers = useMemo(
    () =>
      liveStarterSlots
        .map((slot) => slot.player_id)
        .filter((playerId) => Boolean(playerId) && !dismissedOurPlayerIds.has(playerId))
        .map((playerId) => playersById[playerId])
        .filter(Boolean),
    [dismissedOurPlayerIds, liveStarterSlots, playersById],
  );
  const ourPlayerPickerRows = useMemo(() => {
    return groupSlotsByRow(liveStarterSlots)
      .map((row) =>
        row
          .filter((slot) => slot.player_id && !dismissedOurPlayerIds.has(slot.player_id))
          .map((slot) => ({
            ...slot,
            player: playersById[slot.player_id] || null,
          }))
          .filter((slot) => Boolean(slot.player)),
      )
      .filter((row) => row.length > 0);
  }, [dismissedOurPlayerIds, liveStarterSlots, playersById]);
  const hasEligibleOnPitchPlayer = useMemo(
    () => ourPlayerPickerRows.some((row) => row.length > 0),
    [ourPlayerPickerRows],
  );
  const shotAssistPickerRows = useMemo(() => {
    return ourPlayerPickerRows
      .map((row) => row.filter((slot) => slot.player_id !== pendingShotPlayerId))
      .filter((row) => row.length > 0);
  }, [ourPlayerPickerRows, pendingShotPlayerId]);
  const substitutionInPlayers = useMemo(
    () =>
      liveBenchPlayerIds
        .filter((playerId) => !dismissedOurPlayerIds.has(playerId))
        .map((playerId) => playersById[playerId])
        .filter(Boolean),
    [dismissedOurPlayerIds, liveBenchPlayerIds, playersById],
  );
  const benchPlayers = useMemo(() => {
    return liveBenchPlayerIds.map((playerId) => playersById[playerId]).filter(Boolean);
  }, [liveBenchPlayerIds, playersById]);
  const livePlayerPickerOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    [...liveStarterSlots.map((slot) => slot.player_id), ...liveBenchPlayerIds]
      .filter(Boolean)
      .forEach((playerId) => {
        if (dismissedOurPlayerIds.has(playerId)) {
          return;
        }
        if (seen.has(playerId)) {
          return;
        }
        seen.add(playerId);
        const player = playersById[playerId];
        if (player) {
          options.push(player);
        }
      });
    return options;
  }, [dismissedOurPlayerIds, liveBenchPlayerIds, liveStarterSlots, playersById]);
  const activeMatchLineupPlayerIds = useMemo(
    () =>
      new Set([
        ...activeLineupSlots.map((slot) => slot.player_id).filter(Boolean),
        ...activeBenchPlayerIds.filter(Boolean),
        ...liveStarterSlots.map((slot) => slot.player_id).filter(Boolean),
        ...liveBenchPlayerIds.filter(Boolean),
      ]),
    [activeBenchPlayerIds, activeLineupSlots, liveBenchPlayerIds, liveStarterSlots],
  );
  const lineupSetupRows = useMemo(() => groupSlotsByRow(lineupSlots), [lineupSlots]);
  const lineupSelectedSlot = useMemo(
    () => lineupSlots.find((slot) => slot.slot_id === lineupFocusedSlotId) || lineupSlots[0] || null,
    [lineupFocusedSlotId, lineupSlots],
  );
  const lineupSelectedStarterIds = useMemo(
    () => new Set(lineupSlots.map((slot) => slot.player_id).filter(Boolean)),
    [lineupSlots],
  );
  const lineupSlotPlayerOptions = useMemo(() => {
    if (!lineupSelectedSlot) {
      return [];
    }

    const currentSlotPlayer = lineupSelectedSlot.player_id ? playersById[lineupSelectedSlot.player_id] : null;
    const sourcePlayers =
      currentSlotPlayer && currentSlotPlayer.is_active === false
        ? [...activePlayers, currentSlotPlayer]
        : activePlayers;
    const selectedPlayerIds = new Set([...lineupSelectedStarterIds, ...lineupBenchPlayerIds]);
    return sortPlayersForSlot(lineupSelectedSlot.slot_label, sourcePlayers, {
      selectedPlayerIds,
      currentPlayerId: lineupSelectedSlot.player_id || '',
    });
  }, [activePlayers, lineupBenchPlayerIds, lineupSelectedSlot, lineupSelectedStarterIds, playersById]);
  const lineupBenchOptions = useMemo(
    () => activePlayers.filter((player) => !lineupSelectedStarterIds.has(player.id)),
    [activePlayers, lineupSelectedStarterIds],
  );
  const hasStartingLineup = activeLineupSlots.filter((slot) => slot.player_id).length === 11;
  const effectiveStatsScope =
    statsScope !== 'all' && !matches.some((match) => match.id === statsScope) ? 'all' : statsScope;

  const getSuggestedRoundForCompetition = useCallback(
    (competitionId) => {
      if (!competitionId) {
        return 1;
      }

      const rounds = matches
        .filter((match) => match.competition_id === competitionId)
        .map((match) => Number(match.round_number))
        .filter((roundNumber) => Number.isFinite(roundNumber) && roundNumber > 0);

      const maxRound = rounds.length ? Math.max(...rounds) : 0;
      return maxRound + 1;
    },
    [matches],
  );

  const loadEventsForMatch = useCallback(async (matchId, matchHint = null) => {
    const loadedEvents = await listEventsByMatch(matchId);
    const inferredElapsed = inferElapsedFromEvents(loadedEvents);
    setEvents(loadedEvents);
    setSelectedEventId('');
    setEditingEvent(null);
    setElapsedSeconds(inferredElapsed);
    setMatchPhase(inferMatchPhase(matchHint, inferredElapsed));
  }, []);

  const loadAllEventsForMatches = useCallback(async (matchesToLoad) => {
    if (!matchesToLoad.length) {
      return [];
    }

    const groupedEvents = await Promise.all(matchesToLoad.map((match) => listEventsByMatch(match.id)));
    return groupedEvents.flat();
  }, []);
  const normalizeOpponentPlayerAssignments = useCallback(async (eventsToNormalize) => {
    if (!eventsToNormalize?.length) {
      return { events: [], normalizedById: new Map() };
    }

    const normalizedById = new Map();
    const eventsNeedingUpdate = [];
    const normalizedEvents = eventsToNormalize.map((event) => {
      if (event.side === 'opponent' && event.player_id) {
        const normalizedEvent = {
          ...event,
          player_id: '',
        };
        normalizedById.set(event.id, normalizedEvent);
        eventsNeedingUpdate.push(normalizedEvent);
        return normalizedEvent;
      }

      return event;
    });

    if (eventsNeedingUpdate.length) {
      await Promise.all(eventsNeedingUpdate.map((event) => saveEvent(event)));
    }

    return {
      events: normalizedEvents,
      normalizedById,
    };
  }, []);
  const loadAllLineupsForMatches = useCallback(async (matchesToLoad) => {
    if (!matchesToLoad.length) {
      return {};
    }

    const groupedLineups = await Promise.all(
      matchesToLoad.map(async (match) => [match.id, await listLineupsByMatch(match.id)]),
    );
    return Object.fromEntries(groupedLineups);
  }, []);

  const syncPlayerExtraPositionsFromTimeline = useCallback(async () => {
    if (!players.length) {
      return;
    }

    const aggregateRolesByPlayerId = new Map();

    Object.entries(lineupsByMatch).forEach(([matchId, matchLineups]) => {
      const matchEvents = allEvents.filter((event) => event.match_id === matchId);
      const rolesByPlayer = buildPlayedRolesByPlayer(matchLineups, matchEvents);
      rolesByPlayer.forEach((roles, playerId) => {
        if (!aggregateRolesByPlayerId.has(playerId)) {
          aggregateRolesByPlayerId.set(playerId, new Set());
        }

        roles.forEach((role) => aggregateRolesByPlayerId.get(playerId).add(role));
      });
    });

    const pendingUpdates = [];
    players.forEach((player) => {
      const primaryPosition = getPlayerPrimaryPosition(player);
      const nextExtraPositions = [...(aggregateRolesByPlayerId.get(player.id) || new Set())]
        .map((role) => normalizePosition(role))
        .filter(Boolean)
        .filter((role) => role !== primaryPosition)
        .sort((roleA, roleB) => roleA.localeCompare(roleB));
      const currentExtraPositions = Array.isArray(player.extra_positions)
        ? [...new Set(player.extra_positions.map((role) => normalizePosition(role)).filter(Boolean))]
            .filter((role) => role !== primaryPosition)
            .sort((roleA, roleB) => roleA.localeCompare(roleB))
        : [];

      if (nextExtraPositions.join('|') !== currentExtraPositions.join('|')) {
        pendingUpdates.push(
          updatePlayerRecord(player.id, {
            extra_positions: nextExtraPositions,
            primary_position: primaryPosition,
          }),
        );
      }
    });

    if (!pendingUpdates.length) {
      return;
    }

    await Promise.all(pendingUpdates);
    const refreshedPlayers = await listPlayers();
    setPlayers(refreshedPlayers);
  }, [allEvents, lineupsByMatch, players]);

  const loadLineupForMatch = useCallback(async (matchId, formationHint = DEFAULT_FORMATION) => {
    const loadedLineups = await listLineupsByMatch(matchId);
    const { starters, bench } = splitLineupsByRole(loadedLineups);
    const resolvedFormation =
      (formationHint && FORMATION_LAYOUTS[formationHint] && formationHint) || detectFormationFromLineups(loadedLineups);
    const setupSlots = createSlotsForFormation(resolvedFormation, starters);
    const starterPlayerIds = new Set(starters.map((slot) => slot.player_id).filter(Boolean));
    const benchPlayerIds = bench
      .map((lineup) => lineup.player_id)
      .filter((playerId) => playerId && !starterPlayerIds.has(playerId));
    const squadPlayerIds = [...new Set([...starterPlayerIds, ...benchPlayerIds])];

    setActiveLineupSlots(starters);
    setActiveBenchPlayerIds(benchPlayerIds);
    setLineupsByMatch((current) => ({ ...current, [matchId]: loadedLineups }));
    setLineupFormation(resolvedFormation);
    setLineupSlots(setupSlots);
    setLineupFocusedSlotId((currentSlotId) =>
      currentSlotId && setupSlots.some((slot) => slot.slot_id === currentSlotId)
        ? currentSlotId
        : setupSlots[0]?.slot_id || '',
    );
    setLineupBenchPlayerIds(benchPlayerIds);
    setSelectedPlayerId((currentPlayerId) => {
      if (currentPlayerId && squadPlayerIds.includes(currentPlayerId)) {
        return currentPlayerId;
      }

      return squadPlayerIds[0] || currentPlayerId;
    });
    setLineupSetupError('');
    return loadedLineups;
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await initDatabase();
        const loadedPlayers = await listPlayers();
        const loadedTeamProfile = await getTeamProfile();
        const loadedCompetitions = await listCompetitions();
        const loadedOpponents = await listOpponents();
        const loadedMatches = await listMatches();
        if (!active) return;
        setPlayers(loadedPlayers);
        setTeamProfile(loadedTeamProfile);
        setCompetitions(loadedCompetitions);
        setOpponents(loadedOpponents);

        let updatedMatches = [...loadedMatches];
        let draftMatch = await getLatestDraftMatch();

        if (!draftMatch) {
          draftMatch = await createDraftMatch({ date: todayDate(), opponent: 'TBD' }, []);
          updatedMatches = sortMatches([draftMatch, ...updatedMatches]);
        }

        if (!active) return;
        const rawDraftEvents = await listEventsByMatch(draftMatch.id);
        const rawAllLoadedEvents = await loadAllEventsForMatches(updatedMatches);
        const { events: allLoadedEvents, normalizedById } = await normalizeOpponentPlayerAssignments(rawAllLoadedEvents);
        const draftEvents = rawDraftEvents.map((event) => normalizedById.get(event.id) || event);
        const allLoadedLineups = await loadAllLineupsForMatches(updatedMatches);
        const draftLineups = allLoadedLineups[draftMatch.id] || [];
        const { starters: draftStarterLineups, bench: draftBenchLineups } = splitLineupsByRole(draftLineups);
        const initialFormation =
          (draftMatch.formation && FORMATION_LAYOUTS[draftMatch.formation] && draftMatch.formation) ||
          detectFormationFromLineups(draftLineups);
        const draftSetupSlots = createSlotsForFormation(initialFormation, draftStarterLineups);
        const draftStarterPlayerIds = new Set(draftStarterLineups.map((slot) => slot.player_id).filter(Boolean));
        const draftBenchPlayerIds = draftBenchLineups
          .map((lineup) => lineup.player_id)
          .filter((playerId) => playerId && !draftStarterPlayerIds.has(playerId));
        const draftSquadPlayerIds = [
          ...new Set([
            ...draftStarterPlayerIds,
            ...draftBenchPlayerIds,
          ]),
        ];
        if (!active) return;

        setMatches(sortMatches(updatedMatches));
        setMatchControlDialogOpen(false);
        setMatchDateInput(draftMatch.date);
        setCompetitionIdInput(draftMatch.competition_id || '');
        setCompetitionRoundInput(String(Number(draftMatch.round_number) > 0 ? Number(draftMatch.round_number) : 1));
        setOpponentIdInput(draftMatch.opponent_id || '');
        setOpponentFormationInput(resolveOpponentFormation(draftMatch, initialFormation));
        setNewCompetitionNameInput('');
        setActiveMatchId(draftMatch.id);
        setSelectedPlayerId((currentValue) => {
          if (currentValue && draftSquadPlayerIds.includes(currentValue)) {
            return currentValue;
          }

          return draftSquadPlayerIds[0] || currentValue || loadedPlayers[0]?.id || '';
        });
        setEvents(draftEvents);
        setAllEvents(allLoadedEvents);
        setLineupsByMatch(allLoadedLineups);
        setSelectedEventId('');
        setEditingEvent(null);
        const inferredElapsed = inferElapsedFromEvents(draftEvents);
        setElapsedSeconds(inferredElapsed);
        setMatchPhase(inferMatchPhase(draftMatch, inferredElapsed));
        setActiveLineupSlots(draftStarterLineups);
        setActiveBenchPlayerIds(draftBenchPlayerIds);
        setLineupFormation(initialFormation);
        setLineupSlots(draftSetupSlots);
        setLineupFocusedSlotId(draftSetupSlots[0]?.slot_id || '');
        setLineupBenchPlayerIds(draftBenchPlayerIds);
        setReady(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize app');
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadAllEventsForMatches, loadAllLineupsForMatches, normalizeOpponentPlayerAssignments]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const intervalId = window.setInterval(() => setElapsedSeconds((currentSeconds) => currentSeconds + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    if (selectedPlayerId) writeStoredState(STORAGE_KEYS.playerId, selectedPlayerId);
  }, [selectedPlayerId]);

  useEffect(() => {
    if (selectedZone) writeStoredState(STORAGE_KEYS.zone, selectedZone);
  }, [selectedZone]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    void syncPlayerExtraPositionsFromTimeline();
  }, [ready, syncPlayerExtraPositionsFromTimeline]);

  const resolveEditableEvent = useCallback(
    (eventEntry) => {
      if (!eventEntry) {
        return null;
      }

      if (!eventEntry.action_group_id) {
        return eventEntry;
      }

      const groupedEvents = eventsByActionGroupId[eventEntry.action_group_id] || [];
      if (!groupedEvents.length) {
        return eventEntry;
      }

      if (eventEntry.mirror_generated) {
        return (
          groupedEvents.find((entry) => entry.mirror_anchor) ||
          groupedEvents.find((entry) => !entry.is_derived && !entry.mirror_generated) ||
          eventEntry
        );
      }

      if (eventEntry.is_derived) {
        return groupedEvents.find((entry) => !entry.is_derived && !entry.mirror_generated) || eventEntry;
      }

      return eventEntry;
    },
    [eventsByActionGroupId],
  );

  const buildActionEventPayloads = useCallback((eventType, basePayload, options = {}) => {
    const groupId = options.groupId || createActionGroupId();
    const derivedTypes = DERIVED_EVENT_TYPES[eventType] || [];

    const payloads = derivedTypes.map((derivedType) => ({
      ...basePayload,
      type: derivedType,
      points: EVENT_TYPE_POINTS[derivedType] ?? 0,
      action_group_id: groupId,
      is_derived: true,
      source_action: eventType,
    }));

    const assistPlayerId =
      eventType === 'goal' &&
      basePayload.side !== 'opponent' &&
      basePayload.assist_player_id &&
      basePayload.assist_player_id !== basePayload.player_id
        ? basePayload.assist_player_id
        : '';

    if (assistPlayerId) {
      payloads.push({
        ...basePayload,
        player_id: assistPlayerId,
        type: 'pass_success',
        points: EVENT_TYPE_POINTS.pass_success ?? 0,
        action_group_id: groupId,
        is_derived: true,
        source_action: 'goal_assist',
        assist_player_id: undefined,
        goal_source_type: undefined,
        shot_context: undefined,
        is_header: undefined,
        hit_woodwork: undefined,
      });
    }

    payloads.push({
      ...basePayload,
      type: eventType,
      points: options.primaryPoints ?? EVENT_TYPE_POINTS[eventType] ?? 0,
      action_group_id: groupId,
      is_derived: false,
      source_action: eventType,
    });

    return payloads;
  }, []);
  const buildPenaltyActionPayloads = useCallback(
    ({
      matchId,
      fouledPlayerId,
      penaltyTakerId,
      foulCommittedPlayerId = '',
      goalConcededPlayerId = '',
      penaltyOutcome,
      minute,
      second,
      eventPeriod = '',
      side = 'our',
      actionGroupId = createActionGroupId(),
      primaryPoints = EVENT_TYPE_POINTS.penalty_won ?? 0,
    }) => {
      const normalizedSide = side === 'opponent' ? 'opponent' : 'our';
      const normalizedOutcome = penaltyOutcome === 'missed' ? 'missed' : 'made';
      const normalizedEventPeriod = eventPeriod || resolveEventPeriod('', minute);
      const normalizedPenaltyTakerId =
        normalizedSide === 'our' ? penaltyTakerId || fouledPlayerId || '' : '';
      const normalizedFouledPlayerId = normalizedSide === 'our' ? fouledPlayerId || '' : '';
      const normalizedFoulCommittedPlayerId =
        normalizedSide === 'opponent' ? foulCommittedPlayerId || '' : '';
      const goalConcededSide = getOppositeSide(normalizedSide);
      const normalizedGoalConcededPlayerId = goalConcededSide === 'our' ? goalConcededPlayerId || '' : '';
      const penaltyMeta = {
        action_group_id: actionGroupId,
        source_action: 'penalty_won',
        penalty_taker_id: normalizedPenaltyTakerId,
        penalty_outcome: normalizedOutcome,
        foul_committed_player_id: normalizedFoulCommittedPlayerId,
      };

      return [
        {
          match_id: matchId,
          player_id: normalizedFouledPlayerId,
          zone: 'box',
          minute,
          second,
          event_period: normalizedEventPeriod,
          side: normalizedSide,
          type: 'foul_won',
          points: EVENT_TYPE_POINTS.foul_won ?? 0,
          is_derived: true,
          ...penaltyMeta,
        },
        {
          match_id: matchId,
          player_id: normalizedFouledPlayerId,
          zone: 'box',
          minute,
          second,
          event_period: normalizedEventPeriod,
          side: normalizedSide,
          type: 'penalty_won',
          points: primaryPoints,
          is_derived: false,
          ...penaltyMeta,
        },
        ...(normalizedOutcome === 'made'
          ? [
              {
                match_id: matchId,
                player_id: normalizedPenaltyTakerId,
                zone: 'box',
                minute,
                second,
                event_period: normalizedEventPeriod,
                side: normalizedSide,
                type: 'goal',
                points: EVENT_TYPE_POINTS.goal ?? 0,
                shot_context: 'inside_box',
                is_header: false,
                is_derived: true,
                ...penaltyMeta,
              },
              {
                match_id: matchId,
                player_id: normalizedGoalConcededPlayerId,
                zone: 'box',
                minute,
                second,
                event_period: normalizedEventPeriod,
                side: goalConcededSide,
                type: 'goal_conceded',
                points: EVENT_TYPE_POINTS.goal_conceded ?? 0,
                is_derived: true,
                ...penaltyMeta,
              },
            ]
          : [
              {
                match_id: matchId,
                player_id: normalizedPenaltyTakerId,
                zone: 'box',
                minute,
                second,
                event_period: normalizedEventPeriod,
                side: normalizedSide,
                type: 'shot_off',
                points: EVENT_TYPE_POINTS.shot_off ?? 0,
                shot_context: 'inside_box',
                is_header: false,
                is_derived: true,
                ...penaltyMeta,
              },
            ]),
      ];
    },
    [],
  );
  const buildBigChanceActionPayloads = useCallback(
    ({
      matchId,
      playerId,
      zone,
      result,
      type,
      shotType,
      passType,
      shotContext,
      isHeader = false,
      hitWoodwork = false,
      goalSourceType = 'open_play',
      assistPlayerId = '',
      goalConcededPlayerId = '',
      minute,
      second,
      eventPeriod = '',
      side = 'our',
      actionGroupId = createActionGroupId(),
      primaryPoints,
    }) => {
      const normalizedResult = result === 'miss' ? 'miss' : 'goal';
      const normalizedType =
        normalizedResult === 'goal' ? 'shot' : type === 'pass' || type === 'ball_loss' ? type : 'shot';
      const normalizedShotType =
        normalizedResult === 'goal'
          ? 'goal'
          : shotType === 'shot_on' || shotType === 'shot_blocked' || shotType === 'shot_off'
          ? shotType
          : 'shot_off';
      const normalizedPassType = passType === 'pass_success' ? 'pass_success' : 'pass_fail';
      const normalizedShotContext =
        normalizedType === 'shot' ? (shotContext === 'inside_box' ? 'inside_box' : 'outside_box') : undefined;
      const normalizedIsHeader = normalizedType === 'shot' ? Boolean(isHeader) : undefined;
      const normalizedHitWoodwork =
        normalizedType === 'shot' && normalizedShotType === 'shot_off'
          ? Boolean(hitWoodwork)
          : undefined;
      const shotZone = normalizedShotContext === 'inside_box' ? 'box' : zone;
      const primaryZone = normalizedType === 'shot' ? shotZone : zone;
      const derivedType =
        normalizedType === 'shot' ? normalizedShotType : normalizedType === 'pass' ? normalizedPassType : 'ball_loss';
      const resolvedPrimaryPoints =
        typeof primaryPoints === 'number'
          ? primaryPoints
          : normalizedResult === 'miss'
          ? EVENT_TYPE_POINTS.big_chance_missed ?? -2
          : EVENT_TYPE_POINTS.big_chance_won ?? 0;
      const normalizedEventPeriod = eventPeriod || resolveEventPeriod('', minute);
      const normalizedAssistPlayerId =
        normalizedResult === 'goal' &&
        side !== 'opponent' &&
        assistPlayerId &&
        assistPlayerId !== playerId &&
        derivedType === 'goal'
          ? assistPlayerId
          : '';
      const bigChanceMeta = {
        action_group_id: actionGroupId,
        source_action: 'big_chance_won',
        big_chance_result: normalizedResult,
        big_chance_type: normalizedType,
        big_chance_shot_type: normalizedType === 'shot' ? normalizedShotType : undefined,
        big_chance_pass_type: normalizedType === 'pass' ? normalizedPassType : undefined,
        shot_context: normalizedShotContext,
        is_header: normalizedIsHeader,
        goal_source_type: normalizedResult === 'goal' ? goalSourceType : undefined,
        assist_player_id: normalizedAssistPlayerId || undefined,
        hit_woodwork: normalizedHitWoodwork,
      };

      const payloads = [
        {
          match_id: matchId,
          player_id: playerId,
          zone: primaryZone,
          minute,
          second,
          event_period: normalizedEventPeriod,
          side,
          type: 'big_chance_won',
          points: resolvedPrimaryPoints,
          is_derived: false,
          ...bigChanceMeta,
        },
      ];
      payloads.push({
        match_id: matchId,
        player_id: playerId,
        zone: normalizedType === 'shot' ? shotZone : zone,
        minute,
        second,
        event_period: normalizedEventPeriod,
        side,
        type: derivedType,
        points: EVENT_TYPE_POINTS[derivedType] ?? 0,
        shot_context: normalizedType === 'shot' ? normalizedShotContext : undefined,
        is_header: normalizedType === 'shot' ? normalizedIsHeader : undefined,
        hit_woodwork: normalizedType === 'shot' ? normalizedHitWoodwork : undefined,
        goal_source_type: derivedType === 'goal' ? goalSourceType : undefined,
        assist_player_id: derivedType === 'goal' ? normalizedAssistPlayerId || undefined : undefined,
        is_derived: true,
        ...bigChanceMeta,
      });

      if (derivedType === 'goal') {
        const goalConcededSide = getOppositeSide(side);
        payloads.push({
          match_id: matchId,
          player_id: goalConcededSide === 'our' ? goalConcededPlayerId || '' : '',
          zone: normalizedType === 'shot' ? shotZone : zone,
          minute,
          second,
          event_period: normalizedEventPeriod,
          side: goalConcededSide,
          type: 'goal_conceded',
          points: EVENT_TYPE_POINTS.goal_conceded ?? 0,
          is_derived: true,
          ...bigChanceMeta,
        });
      }

      if (normalizedAssistPlayerId) {
        payloads.push({
          match_id: matchId,
          player_id: normalizedAssistPlayerId,
          zone,
          minute,
          second,
          event_period: normalizedEventPeriod,
          side,
          type: 'pass_success',
          points: EVENT_TYPE_POINTS.pass_success ?? 0,
          is_derived: true,
          source_action: 'goal_assist',
          action_group_id: actionGroupId,
        });
      }

      return payloads;
    },
    [],
  );

  const buildDangerousFoulActionPayloads = useCallback(
    ({
      matchId,
      fouledPlayerId,
      takerPlayerId,
      zone,
      setPieceAction,
      shotType = 'shot_on',
      shotContext,
      isHeader = false,
      goalSourceType = 'open_play',
      minute,
      second,
      eventPeriod = '',
      side = 'our',
      actionGroupId = createActionGroupId(),
      primaryPoints = EVENT_TYPE_POINTS.foul_won ?? 0,
    }) => {
      const normalizedEventPeriod = eventPeriod || resolveEventPeriod('', minute);
      const metadata = {
        action_group_id: actionGroupId,
        source_action: 'foul_won',
        foul_flow: true,
        is_dangerous_area: true,
        set_piece_taker_id: takerPlayerId,
        set_piece_action: setPieceAction,
        set_piece_shot_type: setPieceAction === 'shot' ? shotType : undefined,
        goal_source_type: setPieceAction === 'shot' && shotType === 'goal' ? goalSourceType : undefined,
      };

      const payloads = [
        {
          match_id: matchId,
          player_id: fouledPlayerId,
          zone,
          minute,
          second,
          event_period: normalizedEventPeriod,
          side,
          type: 'foul_won',
          points: primaryPoints,
          is_derived: false,
          ...metadata,
        },
      ];

      if (setPieceAction === 'cross') {
        payloads.push({
          match_id: matchId,
          player_id: takerPlayerId,
          zone,
          minute,
          second,
          event_period: normalizedEventPeriod,
          side,
          type: 'cross',
          points: EVENT_TYPE_POINTS.cross ?? 0,
          is_derived: true,
          ...metadata,
        });

        return payloads;
      }

      const setPieceShotZone = shotType === 'goal' && shotContext === 'inside_box' ? 'box' : zone;
      payloads.push({
        match_id: matchId,
        player_id: takerPlayerId,
        zone: setPieceShotZone,
        minute,
        second,
        event_period: normalizedEventPeriod,
        side,
        type: shotType,
        points: EVENT_TYPE_POINTS[shotType] ?? 0,
        shot_context: shotContext,
        is_header: SHOT_OUTCOME_TYPES.has(shotType) ? Boolean(isHeader) : undefined,
        goal_source_type: shotType === 'goal' ? goalSourceType : undefined,
        is_derived: true,
        ...metadata,
      });

      return payloads;
    },
    [],
  );

  const handleOpenShotDialog = useCallback((eventType, options = {}) => {
    const allowedOutcomeIds = options.outcomeOptions || SHOT_OUTCOME_OPTIONS.map((option) => option.id);
    const resolvedOutcomeOptions = SHOT_OUTCOME_OPTIONS.filter((option) => allowedOutcomeIds.includes(option.id));
    const defaultOutcome =
      resolvedOutcomeOptions.find((option) => option.id === eventType)?.id || resolvedOutcomeOptions[0]?.id || eventType;
    const resolvedShotSide = options.side || options.bigChanceContext?.side || 'our';
    const resolvedShotPlayerId = options.playerId ?? options.bigChanceContext?.playerId ?? '';

    setPendingShotType(eventType);
    setPendingShotSide(resolvedShotSide);
    setPendingShotPlayerId(resolvedShotSide === 'opponent' ? '' : resolvedShotPlayerId);
    setShotOutcomeInput(options.allowOutcomeSelection ? '' : defaultOutcome);
    setShotOutcomeOptionsInput(resolvedOutcomeOptions);
    setShotOutcomeSelectable(Boolean(options.allowOutcomeSelection));
    setShotContextInput('');
    setShotIsHeaderInput(false);
    setShotHitWoodworkInput(false);
    setShotGoalSourceTypeInput('');
    setShotAssistPlayerIdInput('');
    setPendingBigChanceShotContext(options.bigChanceContext || null);
    setIsSubmittingShot(false);
  }, []);

  const handleCloseShotDialog = useCallback(() => {
    setPendingShotType('');
    setPendingShotPlayerId('');
    setPendingShotSide('our');
    setShotOutcomeInput('shot_on');
    setShotOutcomeOptionsInput(SHOT_OUTCOME_OPTIONS);
    setShotOutcomeSelectable(false);
    setShotContextInput('');
    setShotIsHeaderInput(false);
    setShotHitWoodworkInput(false);
    setShotGoalSourceTypeInput('');
    setShotAssistPlayerIdInput('');
    setPendingBigChanceShotContext(null);
    setIsSubmittingShot(false);
  }, []);

  const handleOpenBallLossDialog = useCallback((side = 'our', playerId = '') => {
    const normalizedSide = side === 'opponent' ? 'opponent' : 'our';
    setPendingBallLossSide(normalizedSide);
    setPendingBallLossPlayerId(normalizedSide === 'opponent' ? '' : playerId || '');
    setBallLossMirrorChoiceInput('interception');
    setIsSubmittingBallLoss(false);
  }, []);

  const handleCloseBallLossDialog = useCallback(() => {
    setPendingBallLossSide('');
    setPendingBallLossPlayerId('');
    setBallLossMirrorChoiceInput('interception');
    setIsSubmittingBallLoss(false);
  }, []);

  const handleOpenPenaltyDialog = useCallback((fouledPlayerId, side = 'our') => {
    const normalizedSide = side === 'opponent' ? 'opponent' : 'our';
    const defaultMirrorPlayerId =
      selectedPlayerId && liveStarterPlayerIds.has(selectedPlayerId)
        ? selectedPlayerId
        : substitutionOutPlayers[0]?.id || '';

    setPendingPenaltySide(normalizedSide);
    setPendingPenaltyFouledPlayerId(normalizedSide === 'our' ? fouledPlayerId || '' : '');
    setPenaltyTakerInput(normalizedSide === 'our' ? fouledPlayerId || '' : '');
    setPenaltyFoulCommittedPlayerInput(normalizedSide === 'opponent' ? defaultMirrorPlayerId : '');
    setPenaltyOutcomeInput('');
    setIsSubmittingPenalty(false);
  }, [liveStarterPlayerIds, selectedPlayerId, substitutionOutPlayers]);

  const handleClosePenaltyDialog = useCallback(() => {
    setPendingPenaltySide('our');
    setPendingPenaltyFouledPlayerId(null);
    setPenaltyTakerInput('');
    setPenaltyFoulCommittedPlayerInput('');
    setPenaltyOutcomeInput('');
    setIsSubmittingPenalty(false);
  }, []);

  const handleOpenSubstitutionDialog = useCallback(() => {
    if (!canAddSubstitution) {
      setErrorMessage(`Maximum ${MAX_SUBSTITUTIONS_PER_MATCH} substitutions reached for this match.`);
      return;
    }

    if (!substitutionOutPlayers.length) {
      setErrorMessage('No eligible player on pitch to substitute out.');
      return;
    }

    if (!substitutionInPlayers.length) {
      setErrorMessage('No bench player available to substitute in.');
      return;
    }

    setSubstitutionPlayerOutInput('');
    setSubstitutionPlayerInInput('');
    setIsSubmittingSubstitution(false);
    setSubstitutionDialogOpen(true);
  }, [
    canAddSubstitution,
    substitutionInPlayers,
    substitutionOutPlayers,
  ]);

  const handleCloseSubstitutionDialog = useCallback(() => {
    setSubstitutionDialogOpen(false);
    setSubstitutionPlayerOutInput('');
    setSubstitutionPlayerInInput('');
    setIsSubmittingSubstitution(false);
  }, []);

  const handleOpenBigChanceDialog = useCallback((playerId) => {
    setPendingBigChancePlayerId(playerId || '');
    setPendingBigChanceMissPlayerId(null);
    setBigChanceResultInput('goal');
    setBigChanceTypeInput('shot');
    setBigChancePassTypeInput('');
    setIsSubmittingBigChanceStep(false);
  }, []);

  const handleCloseBigChanceDialog = useCallback(() => {
    setPendingBigChancePlayerId(null);
    setPendingBigChanceMissPlayerId(null);
    setBigChanceResultInput('goal');
    setBigChanceTypeInput('shot');
    setBigChancePassTypeInput('');
    setIsSubmittingBigChanceStep(false);
  }, []);

  const handleOpenBigChanceMissDialog = useCallback((playerId) => {
    setPendingBigChanceMissPlayerId(playerId || '');
    setBigChanceTypeInput('');
    setBigChancePassTypeInput('');
    setIsSubmittingBigChanceStep(false);
  }, []);

  const handleCloseBigChanceMissDialog = useCallback(() => {
    setPendingBigChanceMissPlayerId(null);
    setBigChanceTypeInput('');
    setBigChancePassTypeInput('');
    setIsSubmittingBigChanceStep(false);
  }, []);
  const handleOpenOurPlayerEventDialog = useCallback(
    (eventType, options = {}, dialogMeta = {}) => {
      if (!hasStartingLineup || !hasEligibleOnPitchPlayer) {
        setErrorMessage('Lineup setup is required before recording our team events.');
        const formationFromMatch =
          (activeMatch?.formation && FORMATION_LAYOUTS[activeMatch.formation] && activeMatch.formation) ||
          detectFormationFromLineups(activeLineupSlots);
        const setupSlots = createSlotsForFormation(formationFromMatch, activeLineupSlots);
        setLineupFormation(formationFromMatch);
        setLineupSlots(setupSlots);
        setLineupFocusedSlotId(setupSlots[0]?.slot_id || '');
        setLineupBenchPlayerIds(activeBenchPlayerIds);
        setLineupSetupError('');
        setStartAfterLineupSetup(false);
        setLineupDialogOpen(true);
        return false;
      }

      const defaultPlayerId =
        selectedPlayerId && liveStarterPlayerIds.has(selectedPlayerId)
          ? selectedPlayerId
          : substitutionOutPlayers[0]?.id || '';
      if (!defaultPlayerId) {
        setErrorMessage('No on-pitch player available for this event.');
        return false;
      }

      setPendingPlayerEventType(eventType);
      setPendingPlayerEventSide(dialogMeta.side === 'opponent' ? 'opponent' : 'our');
      setPendingPlayerEventContext(options);
      setPendingPlayerMirrorTargetType(dialogMeta.mirrorTargetType || '');
      setPendingPlayerSelectionInput(defaultPlayerId);
      setIsSubmittingPlayerPick(false);
      return true;
    },
    [
      activeBenchPlayerIds,
      activeLineupSlots,
      activeMatch,
      hasEligibleOnPitchPlayer,
      hasStartingLineup,
      liveStarterPlayerIds,
      selectedPlayerId,
      substitutionOutPlayers,
    ],
  );

  const handleCloseOurPlayerEventDialog = useCallback(() => {
    setPendingPlayerEventType('');
    setPendingPlayerEventSide('our');
    setPendingPlayerEventContext(null);
    setPendingPlayerMirrorTargetType('');
    setPendingPlayerSelectionInput('');
  }, []);

  const handleCreateQuickEvent = useCallback(
    async (eventType, options = {}) => {
      if (!activeMatch || !isDraftMatch || !canCreateEvent) return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      if (!isTimerActivePhase(matchPhase)) {
        setErrorMessage('You can record events only during active halves.');
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }
      const resolvedSide = options.side || (eventType === 'substitution' ? 'our' : liveEventSide);
      const resolvedPlayerId = resolvedSide === 'opponent' ? '' : options.playerId ?? '';

      if (resolvedSide === 'our' && eventType !== 'substitution' && !options.skipOurPlayerPicker) {
        handleOpenOurPlayerEventDialog(eventType, options);
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      if (eventType === 'penalty_won' && !options.skipPenaltyPrompt) {
        if (resolvedSide === 'opponent' && (!hasStartingLineup || !hasEligibleOnPitchPlayer)) {
          setErrorMessage('Lineup setup is required before recording opponent penalties.');
          handleOpenOurPlayerEventDialog('foul_committed', {}, { side: 'opponent' });
          return QUICK_EVENT_CREATE_STATUS.blockedOrError;
        }
        handleOpenPenaltyDialog(resolvedPlayerId, resolvedSide);
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      if (eventType === 'substitution' && !options.skipSubstitutionPrompt) {
        handleOpenSubstitutionDialog();
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      if (eventType === 'big_chance_won' && !options.skipBigChancePrompt) {
        handleOpenBigChanceDialog(resolvedPlayerId);
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      if (eventType === 'ball_loss' && !options.skipBallLossPrompt) {
        handleOpenBallLossDialog(resolvedSide, resolvedPlayerId);
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      if (SHOT_OUTCOME_TYPES.has(eventType) && !options.skipShotPrompt) {
        handleOpenShotDialog(eventType, {
          side: resolvedSide,
          playerId: resolvedPlayerId,
        });
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      if (SHOT_OUTCOME_TYPES.has(eventType) && !options.shotContext) {
        setErrorMessage('Select shot location before saving the event.');
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }

      const minuteValue = Math.floor(elapsedSeconds / 60);
      const secondValue = elapsedSeconds % 60;
      const eventPeriod = options.eventPeriod || resolveEventPeriod(matchPhase, minuteValue);
      const mirrorDescriptor = options.skipMirrorRules
        ? null
        : buildMirrorDescriptor(eventType, {
            ballLossChoice: options.ballLossMirrorChoice,
          });
      const mirrorSide = mirrorDescriptor?.mirrorType ? getOppositeSide(resolvedSide) : '';
      const requiresMirrorPlayerPicker =
        !options.skipMirrorPlayerPicker &&
        resolvedSide === 'opponent' &&
        mirrorSide === 'our' &&
        Boolean(mirrorDescriptor?.mirrorType) &&
        !MIRROR_GK_AUTO_EVENT_TYPES.has(mirrorDescriptor.mirrorType);

      if (requiresMirrorPlayerPicker) {
        handleOpenOurPlayerEventDialog(
          eventType,
          {
            ...options,
            side: resolvedSide,
            skipMirrorPlayerPicker: true,
          },
          {
            side: resolvedSide,
            mirrorTargetType: mirrorDescriptor.mirrorType,
          },
        );
        return QUICK_EVENT_CREATE_STATUS.deferredMirrorPlayerPick;
      }

      const shouldSwitchPossessionManually =
        !options.skipAutoContextTransition &&
        POSSESSION_SWITCH_EVENT_TYPES.has(eventType);

      try {
        let actionPayloads = [];

        if (eventType === 'penalty_won' && options.skipPenaltyPrompt) {
          const fouledPlayerId = options.fouledPlayerId ?? resolvedPlayerId;
          const penaltyTakerId = options.penaltyTakerId;
          const penaltyOutcome = options.penaltyOutcome === 'missed' ? 'missed' : 'made';

          actionPayloads = buildPenaltyActionPayloads({
            matchId: activeMatch.id,
            fouledPlayerId,
            penaltyTakerId,
            foulCommittedPlayerId: options.foulCommittedPlayerId || '',
            goalConcededPlayerId: liveGoalkeeperId || '',
            penaltyOutcome,
            minute: minuteValue,
            second: secondValue,
            eventPeriod,
            side: resolvedSide,
          });
        } else if (eventType === 'substitution') {
          const playerOutId = options.playerOutId || '';
          const playerInId = options.playerInId || '';
          const starterIds = new Set(liveStarterSlots.map((slot) => slot.player_id).filter(Boolean));
          const benchIds = new Set(liveBenchPlayerIds.filter(Boolean));

          if (!canAddSubstitution) {
            setErrorMessage(`Maximum ${MAX_SUBSTITUTIONS_PER_MATCH} substitutions reached for this match.`);
            return QUICK_EVENT_CREATE_STATUS.blockedOrError;
          }

          if (!playerOutId || !starterIds.has(playerOutId)) {
            setErrorMessage('Select a valid player to substitute out.');
            return QUICK_EVENT_CREATE_STATUS.blockedOrError;
          }

          if (!playerInId || !benchIds.has(playerInId)) {
            setErrorMessage('Select a valid bench player to substitute in.');
            return QUICK_EVENT_CREATE_STATUS.blockedOrError;
          }

          if (playerOutId === playerInId) {
            setErrorMessage('Player Out and Player In must be different.');
            return QUICK_EVENT_CREATE_STATUS.blockedOrError;
          }

          actionPayloads = buildActionEventPayloads(
            'substitution',
            {
              match_id: activeMatch.id,
              player_id: playerOutId,
              zone: selectedZone,
              minute: minuteValue,
              second: secondValue,
              event_period: eventPeriod,
              side: 'our',
              player_out_id: playerOutId,
              player_in_id: playerInId,
            },
            {
              primaryPoints: EVENT_TYPE_POINTS.substitution ?? 0,
            },
          );
        } else if (eventType === 'big_chance_won' && options.skipBigChancePrompt) {
          const playerId = options.playerId ?? resolvedPlayerId;
          const bigChanceResult = options.bigChanceResult === 'miss' ? 'miss' : 'goal';
          const bigChanceType =
            bigChanceResult === 'goal'
              ? 'shot'
              : options.bigChanceType === 'pass' || options.bigChanceType === 'ball_loss'
              ? options.bigChanceType
              : 'shot';
          const bigChanceShotType =
            bigChanceResult === 'goal'
              ? 'goal'
              : options.bigChanceShotType === 'shot_on' ||
                options.bigChanceShotType === 'shot_off' ||
                options.bigChanceShotType === 'shot_blocked'
              ? options.bigChanceShotType
              : 'shot_off';
          const bigChancePassType = options.bigChancePassType === 'pass_success' ? 'pass_success' : 'pass_fail';
          if (bigChanceType === 'shot' && !options.shotContext) {
            setErrorMessage('Select shot location before saving big chance.');
            return QUICK_EVENT_CREATE_STATUS.blockedOrError;
          }

          actionPayloads = buildBigChanceActionPayloads({
            matchId: activeMatch.id,
            playerId,
            zone: selectedZone,
            result: bigChanceResult,
            type: bigChanceType,
            shotType: bigChanceShotType,
            passType: bigChancePassType,
            shotContext: options.shotContext,
            isHeader: options.isHeader,
            hitWoodwork: options.hitWoodwork,
            goalSourceType: options.goalSourceType || 'open_play',
            minute: minuteValue,
            second: secondValue,
            eventPeriod,
            side: resolvedSide,
            goalConcededPlayerId: liveGoalkeeperId || '',
            primaryPoints:
              bigChanceResult === 'miss'
                ? EVENT_TYPE_POINTS.big_chance_missed ?? -2
                : EVENT_TYPE_POINTS.big_chance_won ?? 0,
          });
        } else {
          const resolvedZone =
            eventType === 'goal' && options.shotContext === 'inside_box' ? 'box' : selectedZone;
          const resolvedShotContext = options.shotContext;
          const basePayload = {
            match_id: activeMatch.id,
            player_id: resolvedPlayerId,
            zone: resolvedZone,
            minute: minuteValue,
            second: secondValue,
            event_period: eventPeriod,
            side: resolvedSide,
            shot_context: resolvedShotContext,
            is_header: SHOT_OUTCOME_TYPES.has(eventType) ? Boolean(options.isHeader) : undefined,
            hit_woodwork: eventType === 'shot_off' ? Boolean(options.hitWoodwork) : undefined,
            goal_source_type: eventType === 'goal' ? options.goalSourceType || 'open_play' : undefined,
            assist_player_id:
              eventType === 'goal' &&
              options.assistPlayerId &&
              options.assistPlayerId !== resolvedPlayerId
                ? options.assistPlayerId
                : undefined,
          };

          actionPayloads = buildActionEventPayloads(eventType, basePayload);
        }

        const anchorIndex = actionPayloads.findIndex((payload) => !payload.is_derived && !payload.mirror_generated);
        let contextTransition = shouldSwitchPossessionManually
          ? {
              side: getOppositeSide(resolvedSide),
              zone: mapZoneForPossessionSwitch(selectedZone),
            }
          : null;

        if (anchorIndex >= 0) {
          let anchorPayload = {
            ...actionPayloads[anchorIndex],
          };

          if (mirrorDescriptor) {
            anchorPayload.mirror_anchor = true;
            anchorPayload.mirror_rule = mirrorDescriptor.rule;

            if (mirrorDescriptor.shouldSwitchContext) {
              const nextContextZone =
                mirrorDescriptor.contextZone === 'mapped'
                  ? mapZoneForPossessionSwitch(anchorPayload.zone)
                  : 'defense';
              contextTransition = {
                side: getOppositeSide(resolvedSide),
                zone: nextContextZone,
              };
            }

            if (mirrorDescriptor.mirrorType) {
              const mirrorSide = getOppositeSide(resolvedSide);
              const mirrorPlayerId =
                MIRROR_GK_AUTO_EVENT_TYPES.has(mirrorDescriptor.mirrorType) && mirrorSide === 'our'
                  ? liveGoalkeeperId || ''
                  : mirrorSide === 'our'
                  ? options.mirrorPlayerId || ''
                  : '';
              actionPayloads.push({
                match_id: anchorPayload.match_id,
                player_id: mirrorPlayerId,
                zone: mirrorDescriptor.mirrorZone === 'defense' ? 'defense' : anchorPayload.zone,
                minute: anchorPayload.minute,
                second: anchorPayload.second,
                event_period: anchorPayload.event_period || eventPeriod,
                side: mirrorSide,
                type: mirrorDescriptor.mirrorType,
                points: EVENT_TYPE_POINTS[mirrorDescriptor.mirrorType] ?? 0,
                action_group_id: anchorPayload.action_group_id,
                is_derived: false,
                source_action: eventType,
                mirror_generated: true,
                mirror_rule: mirrorDescriptor.rule,
              });
            }
          }

          if (contextTransition) {
            anchorPayload.auto_context_transition = true;
            anchorPayload.auto_prev_side = liveEventSide;
            anchorPayload.auto_prev_zone = selectedZone;
          }

          actionPayloads[anchorIndex] = anchorPayload;
        }

        actionPayloads = actionPayloads.map((payload) => ({
          ...payload,
          event_period: payload.event_period || eventPeriod,
        }));

        const savedEvents = [];

        for (const payload of actionPayloads) {
          // Save sequentially so created_at ordering follows action hierarchy.
          const savedEvent = await createEvent(payload);
          savedEvents.push(savedEvent);
        }

        const primaryEvent = savedEvents.find((entry) => !entry.is_derived) || savedEvents[savedEvents.length - 1];

        setEvents((currentEvents) => sortEvents([...currentEvents, ...savedEvents]));
        setAllEvents((currentEvents) => [...currentEvents, ...savedEvents]);
        setSelectedEventId(primaryEvent?.id || '');
        if (eventType === 'substitution' && options.playerInId) {
          setSelectedPlayerId(options.playerInId);
        }
        if (contextTransition) {
          setLiveEventSide(contextTransition.side);
          setSelectedZone(contextTransition.zone);
        }
        setEditingEvent(null);
        setErrorMessage('');
        return QUICK_EVENT_CREATE_STATUS.created;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not create event');
        return QUICK_EVENT_CREATE_STATUS.blockedOrError;
      }
    },
    [
      activeMatch,
      buildActionEventPayloads,
      buildBigChanceActionPayloads,
      buildPenaltyActionPayloads,
      canCreateEvent,
      handleOpenOurPlayerEventDialog,
      elapsedSeconds,
      handleOpenBigChanceDialog,
      handleOpenBallLossDialog,
      handleOpenSubstitutionDialog,
      handleOpenPenaltyDialog,
      handleOpenShotDialog,
      isDraftMatch,
      hasStartingLineup,
      hasEligibleOnPitchPlayer,
      liveBenchPlayerIds,
      liveEventSide,
      liveGoalkeeperId,
      liveStarterSlots,
      matchPhase,
      selectedZone,
      canAddSubstitution,
    ],
  );
  const handleUndoLastEvent = useCallback(async () => {
    if (!events.length || !canDeleteEvent) return;

    const lastEvent = events[events.length - 1];
    const groupedEvents =
      lastEvent.action_group_id && eventsByActionGroupId[lastEvent.action_group_id]?.length
        ? eventsByActionGroupId[lastEvent.action_group_id]
        : [lastEvent];
    const idsToDelete = new Set(groupedEvents.map((event) => event.id));
    const primaryEvent = groupedEvents.find((event) => !event.is_derived) || lastEvent;
    const shouldRestoreContext = Boolean(primaryEvent?.auto_context_transition);
    const previousSide = primaryEvent?.auto_prev_side === 'opponent' ? 'opponent' : 'our';
    const previousZone = ZONES.some((zone) => zone.id === primaryEvent?.auto_prev_zone)
      ? primaryEvent.auto_prev_zone
      : DEFAULT_ZONE;

    try {
      await Promise.all(groupedEvents.map((event) => deleteEvent(event.id)));
      setEvents((currentEvents) => currentEvents.filter((event) => !idsToDelete.has(event.id)));
      setAllEvents((currentEvents) => currentEvents.filter((event) => !idsToDelete.has(event.id)));
      if (selectedEventId && idsToDelete.has(selectedEventId)) {
        setSelectedEventId('');
        setEditingEvent(null);
      }
      if (shouldRestoreContext) {
        setLiveEventSide(previousSide);
        setSelectedZone(previousZone);
      }
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not undo event');
    }
  }, [canDeleteEvent, events, eventsByActionGroupId, selectedEventId]);

  const handleConfirmShotEvent = useCallback(
    async (overrides = {}) => {
      if (isSubmittingShot) {
        return false;
      }

      const resolvedShotOutcome = overrides.shotOutcome ?? shotOutcomeInput;
      const effectiveShotType = shotOutcomeSelectable ? resolvedShotOutcome : pendingShotType;
      const resolvedShotContext = overrides.shotContext ?? shotContextInput;
      const resolvedIsHeader =
        typeof overrides.isHeader === 'boolean' ? overrides.isHeader : shotIsHeaderInput;
      const resolvedGoalSourceType = overrides.goalSourceType ?? shotGoalSourceTypeInput;
      const resolvedHitWoodwork =
        typeof overrides.hitWoodwork === 'boolean' ? overrides.hitWoodwork : shotHitWoodworkInput;
      const resolvedAssistSelection = overrides.assistPlayerId ?? shotAssistPlayerIdInput;
      const resolvedAssistPlayerId =
        resolvedAssistSelection === 'none' ? '' : resolvedAssistSelection;
      const requiresAssistSelection =
        effectiveShotType === 'goal' &&
        pendingShotSide !== 'opponent' &&
        resolvedGoalSourceType !== 'own_goal';

      if (!effectiveShotType || !resolvedShotContext) {
        return false;
      }

      if (effectiveShotType === 'goal' && !resolvedGoalSourceType) {
        return false;
      }

      if (requiresAssistSelection && !resolvedAssistSelection) {
        return false;
      }

      setIsSubmittingShot(true);
      try {
        const createStatus = pendingBigChanceShotContext
          ? await handleCreateQuickEvent('big_chance_won', {
              skipBigChancePrompt: true,
              skipOurPlayerPicker: true,
              playerId: pendingBigChanceShotContext.playerId,
              side: pendingBigChanceShotContext.side,
              bigChanceResult: pendingBigChanceShotContext.result,
              bigChanceType: 'shot',
              bigChanceShotType: effectiveShotType,
              shotContext: resolvedShotContext,
              isHeader: resolvedIsHeader,
              hitWoodwork: resolvedHitWoodwork,
              goalSourceType: effectiveShotType === 'goal' ? resolvedGoalSourceType : undefined,
              assistPlayerId: resolvedAssistPlayerId,
            })
          : await handleCreateQuickEvent(effectiveShotType, {
              skipShotPrompt: true,
              skipOurPlayerPicker: true,
              side: pendingShotSide,
              playerId: pendingShotSide === 'opponent' ? '' : pendingShotPlayerId || selectedPlayerId,
              shotContext: resolvedShotContext,
              isHeader: resolvedIsHeader,
              hitWoodwork: resolvedHitWoodwork,
              goalSourceType: effectiveShotType === 'goal' ? resolvedGoalSourceType : undefined,
              assistPlayerId: effectiveShotType === 'goal' ? resolvedAssistPlayerId : undefined,
            });

        if (createStatus !== QUICK_EVENT_CREATE_STATUS.blockedOrError) {
          handleCloseShotDialog();
          return true;
        }

        return false;
      } finally {
        setIsSubmittingShot(false);
      }
    },
    [
      handleCloseShotDialog,
      handleCreateQuickEvent,
      isSubmittingShot,
      pendingBigChanceShotContext,
      pendingShotPlayerId,
      pendingShotSide,
      pendingShotType,
      selectedPlayerId,
      shotAssistPlayerIdInput,
      shotContextInput,
      shotGoalSourceTypeInput,
      shotHitWoodworkInput,
      shotIsHeaderInput,
      shotOutcomeInput,
      shotOutcomeSelectable,
    ],
  );

  const maybeSubmitShotFromInputs = useCallback(
    (overrides = {}) => {
      if (isSubmittingShot) {
        return;
      }

      const resolvedShotOutcome = overrides.shotOutcome ?? shotOutcomeInput;
      const effectiveShotType = shotOutcomeSelectable ? resolvedShotOutcome : pendingShotType;
      const resolvedShotContext = overrides.shotContext ?? shotContextInput;
      const resolvedGoalSourceType = overrides.goalSourceType ?? shotGoalSourceTypeInput;
      const resolvedAssistSelection = overrides.assistPlayerId ?? shotAssistPlayerIdInput;
      const requiresAssistSelection =
        effectiveShotType === 'goal' &&
        pendingShotSide !== 'opponent' &&
        resolvedGoalSourceType !== 'own_goal';
      if (!effectiveShotType || !resolvedShotContext) {
        return;
      }
      if (effectiveShotType === 'goal' && !resolvedGoalSourceType) {
        return;
      }
      if (requiresAssistSelection && !resolvedAssistSelection) {
        return;
      }

      void handleConfirmShotEvent(overrides);
    },
    [
      handleConfirmShotEvent,
      isSubmittingShot,
      pendingShotType,
      pendingShotSide,
      shotAssistPlayerIdInput,
      shotContextInput,
      shotGoalSourceTypeInput,
      shotOutcomeInput,
      shotOutcomeSelectable,
    ],
  );

  const handleConfirmPenaltyEvent = useCallback(
    async (overrides = {}) => {
      if (pendingPenaltyFouledPlayerId === null || isSubmittingPenalty) {
        return false;
      }

      const resolvedPenaltyTakerId = overrides.penaltyTakerId ?? penaltyTakerInput;
      const resolvedFoulCommittedPlayerId =
        overrides.foulCommittedPlayerId ?? penaltyFoulCommittedPlayerInput;
      const normalizedOutcomeRaw = overrides.penaltyOutcome ?? penaltyOutcomeInput;
      const resolvedPenaltyOutcome =
        normalizedOutcomeRaw === 'made' || normalizedOutcomeRaw === 'missed' ? normalizedOutcomeRaw : '';

      if (!resolvedPenaltyOutcome) {
        return false;
      }

      if (pendingPenaltySide === 'our' && !resolvedPenaltyTakerId) {
        return false;
      }

      if (pendingPenaltySide === 'opponent' && !resolvedFoulCommittedPlayerId) {
        return false;
      }

      setIsSubmittingPenalty(true);
      try {
        const createStatus = await handleCreateQuickEvent('penalty_won', {
          skipPenaltyPrompt: true,
          skipOurPlayerPicker: true,
          skipMirrorPlayerPicker: true,
          side: pendingPenaltySide,
          fouledPlayerId: pendingPenaltyFouledPlayerId,
          penaltyTakerId: pendingPenaltySide === 'our' ? resolvedPenaltyTakerId : '',
          foulCommittedPlayerId:
            pendingPenaltySide === 'opponent' ? resolvedFoulCommittedPlayerId : '',
          mirrorPlayerId:
            pendingPenaltySide === 'opponent' ? resolvedFoulCommittedPlayerId : '',
          penaltyOutcome: resolvedPenaltyOutcome,
        });

        if (createStatus !== QUICK_EVENT_CREATE_STATUS.blockedOrError) {
          handleClosePenaltyDialog();
          return true;
        }

        return false;
      } finally {
        setIsSubmittingPenalty(false);
      }
    },
    [
      handleClosePenaltyDialog,
      handleCreateQuickEvent,
      isSubmittingPenalty,
      penaltyFoulCommittedPlayerInput,
      pendingPenaltySide,
      pendingPenaltyFouledPlayerId,
      penaltyOutcomeInput,
      penaltyTakerInput,
    ],
  );

  const maybeSubmitPenaltyFromInputs = useCallback(
    (overrides = {}) => {
      const resolvedPenaltyTakerId = overrides.penaltyTakerId ?? penaltyTakerInput;
      const resolvedFoulCommittedPlayerId =
        overrides.foulCommittedPlayerId ?? penaltyFoulCommittedPlayerInput;
      const normalizedOutcomeRaw = overrides.penaltyOutcome ?? penaltyOutcomeInput;
      const resolvedPenaltyOutcome =
        normalizedOutcomeRaw === 'made' || normalizedOutcomeRaw === 'missed' ? normalizedOutcomeRaw : '';
      if (!resolvedPenaltyOutcome) {
        return;
      }

      if (pendingPenaltySide === 'our' && !resolvedPenaltyTakerId) {
        return;
      }

      if (pendingPenaltySide === 'opponent' && !resolvedFoulCommittedPlayerId) {
        return;
      }

      void handleConfirmPenaltyEvent({
        penaltyTakerId: resolvedPenaltyTakerId,
        foulCommittedPlayerId: resolvedFoulCommittedPlayerId,
        penaltyOutcome: resolvedPenaltyOutcome,
      });
    },
    [
      handleConfirmPenaltyEvent,
      penaltyFoulCommittedPlayerInput,
      penaltyOutcomeInput,
      penaltyTakerInput,
      pendingPenaltySide,
    ],
  );

  const handleConfirmBallLossEvent = useCallback(
    async (mirrorChoice = ballLossMirrorChoiceInput) => {
      if (!pendingBallLossSide || isSubmittingBallLoss) {
        return false;
      }

      const resolvedChoice = BALL_LOSS_MIRROR_RULE_BY_CHOICE[mirrorChoice] ? mirrorChoice : 'interception';
      setBallLossMirrorChoiceInput(resolvedChoice);

      setIsSubmittingBallLoss(true);
      try {
        const createStatus = await handleCreateQuickEvent('ball_loss', {
          skipBallLossPrompt: true,
          skipOurPlayerPicker: true,
          side: pendingBallLossSide,
          playerId: pendingBallLossSide === 'opponent' ? '' : pendingBallLossPlayerId || selectedPlayerId,
          ballLossMirrorChoice: resolvedChoice,
        });

        if (createStatus !== QUICK_EVENT_CREATE_STATUS.blockedOrError) {
          handleCloseBallLossDialog();
          return true;
        }

        return false;
      } finally {
        setIsSubmittingBallLoss(false);
      }
    },
    [
      ballLossMirrorChoiceInput,
      handleCloseBallLossDialog,
      handleCreateQuickEvent,
      isSubmittingBallLoss,
      pendingBallLossPlayerId,
      pendingBallLossSide,
      selectedPlayerId,
    ],
  );

  const handleConfirmSubstitutionEvent = useCallback(
    async (overrides = {}) => {
      if (isSubmittingSubstitution) {
        return false;
      }

      const resolvedPlayerOutId = overrides.playerOutId ?? substitutionPlayerOutInput;
      const resolvedPlayerInId = overrides.playerInId ?? substitutionPlayerInInput;
      if (
        !resolvedPlayerOutId ||
        !resolvedPlayerInId ||
        resolvedPlayerOutId === resolvedPlayerInId
      ) {
        return false;
      }

      setIsSubmittingSubstitution(true);
      try {
        const createStatus = await handleCreateQuickEvent('substitution', {
          skipSubstitutionPrompt: true,
          playerOutId: resolvedPlayerOutId,
          playerInId: resolvedPlayerInId,
        });

        if (createStatus !== QUICK_EVENT_CREATE_STATUS.blockedOrError) {
          handleCloseSubstitutionDialog();
          return true;
        }

        return false;
      } finally {
        setIsSubmittingSubstitution(false);
      }
    },
    [
      handleCloseSubstitutionDialog,
      handleCreateQuickEvent,
      isSubmittingSubstitution,
      substitutionPlayerInInput,
      substitutionPlayerOutInput,
    ],
  );

  const maybeSubmitSubstitutionFromInputs = useCallback(
    (overrides = {}) => {
      const resolvedPlayerOutId = overrides.playerOutId ?? substitutionPlayerOutInput;
      const resolvedPlayerInId = overrides.playerInId ?? substitutionPlayerInInput;
      if (
        !resolvedPlayerOutId ||
        !resolvedPlayerInId ||
        resolvedPlayerOutId === resolvedPlayerInId
      ) {
        return;
      }

      void handleConfirmSubstitutionEvent({
        playerOutId: resolvedPlayerOutId,
        playerInId: resolvedPlayerInId,
      });
    },
    [handleConfirmSubstitutionEvent, substitutionPlayerInInput, substitutionPlayerOutInput],
  );

  const handleConfirmOurPlayerEvent = useCallback(async (playerId = '') => {
    const selectedPlayerIdForEvent = playerId || pendingPlayerSelectionInput;
    if (!pendingPlayerEventType || !selectedPlayerIdForEvent || isSubmittingPlayerPick) {
      return;
    }

    const selectedType = pendingPlayerEventType;
    const selectedSide = pendingPlayerEventSide === 'opponent' ? 'opponent' : 'our';
    const selectedId = selectedPlayerIdForEvent;
    const selectedContext = pendingPlayerEventContext || {};

    setIsSubmittingPlayerPick(true);
    setPendingPlayerSelectionInput(selectedId);
    setSelectedPlayerId(selectedId);
    handleCloseOurPlayerEventDialog();

    try {
      await handleCreateQuickEvent(selectedType, {
        ...selectedContext,
        side: selectedSide,
        playerId: selectedId,
        mirrorPlayerId: pendingPlayerMirrorTargetType ? selectedId : selectedContext.mirrorPlayerId,
        skipOurPlayerPicker: true,
        skipMirrorPlayerPicker: true,
      });
    } finally {
      setIsSubmittingPlayerPick(false);
    }
  }, [
    handleCloseOurPlayerEventDialog,
    handleCreateQuickEvent,
    isSubmittingPlayerPick,
    pendingPlayerEventContext,
    pendingPlayerMirrorTargetType,
    pendingPlayerEventSide,
    pendingPlayerEventType,
    pendingPlayerSelectionInput,
  ]);

  const handleConfirmBigChanceResult = useCallback(
    (resultValue = bigChanceResultInput) => {
      if (pendingBigChancePlayerId === null || isSubmittingBigChanceStep) {
        return;
      }

      const playerId = pendingBigChancePlayerId;
      const result = resultValue === 'miss' ? 'miss' : 'goal';
      setBigChanceResultInput(result);
      setIsSubmittingBigChanceStep(true);
      try {
        handleCloseBigChanceDialog();

        if (result === 'goal') {
          handleOpenShotDialog('goal', {
            bigChanceContext: {
              playerId,
              result: 'goal',
              side: liveEventSide,
            },
          });
          return;
        }

        handleOpenBigChanceMissDialog(playerId);
      } finally {
        setIsSubmittingBigChanceStep(false);
      }
    },
    [
      bigChanceResultInput,
      handleCloseBigChanceDialog,
      handleOpenBigChanceMissDialog,
      handleOpenShotDialog,
      isSubmittingBigChanceStep,
      liveEventSide,
      pendingBigChancePlayerId,
    ],
  );

  const handleConfirmBigChanceMissDetails = useCallback(
    async (overrides = {}) => {
      if (pendingBigChanceMissPlayerId === null || isSubmittingBigChanceStep) {
        return false;
      }

      const playerId = pendingBigChanceMissPlayerId;
      const resolvedType = overrides.bigChanceType ?? bigChanceTypeInput;
      if (!resolvedType) {
        return false;
      }

      setBigChanceTypeInput(resolvedType);

      if (resolvedType === 'shot') {
        setIsSubmittingBigChanceStep(true);
        try {
          handleCloseBigChanceMissDialog();
          handleOpenShotDialog('shot_on', {
            allowOutcomeSelection: true,
            outcomeOptions: BIG_CHANCE_MISS_SHOT_OUTCOME_OPTIONS.map((option) => option.id),
            bigChanceContext: {
              playerId,
              result: 'miss',
              side: liveEventSide,
            },
          });
          return true;
        } finally {
          setIsSubmittingBigChanceStep(false);
        }
      }

      const resolvedPassTypeRaw = overrides.bigChancePassType ?? bigChancePassTypeInput;
      const resolvedPassType =
        resolvedPassTypeRaw === 'pass_success' || resolvedPassTypeRaw === 'pass_fail'
          ? resolvedPassTypeRaw
          : '';
      if (resolvedType === 'pass') {
        if (!resolvedPassType) {
          return false;
        }
        setBigChancePassTypeInput(resolvedPassType);
      }

      setIsSubmittingBigChanceStep(true);
      try {
        const createStatus = await handleCreateQuickEvent('big_chance_won', {
          skipBigChancePrompt: true,
          skipOurPlayerPicker: true,
          playerId,
          side: liveEventSide,
          bigChanceResult: 'miss',
          bigChanceType: resolvedType,
          bigChancePassType: resolvedType === 'pass' ? resolvedPassType : undefined,
        });

        if (createStatus !== QUICK_EVENT_CREATE_STATUS.blockedOrError) {
          handleCloseBigChanceMissDialog();
          return true;
        }

        return false;
      } finally {
        setIsSubmittingBigChanceStep(false);
      }
    },
    [
      bigChancePassTypeInput,
      bigChanceTypeInput,
      handleCloseBigChanceMissDialog,
      handleCreateQuickEvent,
      handleOpenShotDialog,
      isSubmittingBigChanceStep,
      liveEventSide,
      pendingBigChanceMissPlayerId,
    ],
  );

  const handleOpenSelectedForEdit = useCallback(() => {
    if (!selectedEvent || !canEditEvent) return;
    const editableEvent = resolveEditableEvent(selectedEvent);
    if (!editableEvent) {
      return;
    }

    setSelectedEventId(editableEvent.id);
    setEditingEvent({ ...editableEvent });
  }, [canEditEvent, resolveEditableEvent, selectedEvent]);

  const handleToggleTimer = useCallback(() => {
    if (!activeMatch) return;
    if (!isTimerActivePhase(matchPhase)) return;

    if (timerRunning) {
      setTimerRunning(false);
      return;
    }

    if (!hasStartingLineup) {
      const formationFromMatch =
        (activeMatch.formation && FORMATION_LAYOUTS[activeMatch.formation] && activeMatch.formation) ||
        detectFormationFromLineups(activeLineupSlots);
      const setupSlots = createSlotsForFormation(formationFromMatch, activeLineupSlots);

      setLineupFormation(formationFromMatch);
      setLineupSlots(setupSlots);
      setLineupFocusedSlotId(setupSlots[0]?.slot_id || '');
      setLineupBenchPlayerIds(activeBenchPlayerIds);
      setLineupSetupError('');
      setStartAfterLineupSetup(true);
      setLineupDialogOpen(true);
      return;
    }

    setTimerRunning(true);
  }, [
    activeBenchPlayerIds,
    activeLineupSlots,
    activeMatch,
    hasStartingLineup,
    matchPhase,
    timerRunning,
  ]);

  const handleMatchSelection = useCallback(
    async (nextMatchId) => {
      const nextMatch = matches.find((match) => match.id === nextMatchId);
      if (nextMatch) {
        setMatchDateInput(nextMatch.date);
        setCompetitionIdInput(nextMatch.competition_id || '');
        setCompetitionRoundInput(String(Number(nextMatch.round_number) > 0 ? Number(nextMatch.round_number) : 1));
        setOpponentIdInput(nextMatch.opponent_id || '');
        setOpponentFormationInput(resolveOpponentFormation(nextMatch));
        setNewCompetitionNameInput('');
      }
      handleCloseShotDialog();
      handleCloseBallLossDialog();
      handleCloseOurPlayerEventDialog();
      handleClosePenaltyDialog();
      handleCloseSubstitutionDialog();
      handleCloseBigChanceDialog();
      handleCloseBigChanceMissDialog();
      setMatchControlDialogOpen(false);
      setTimerRunning(false);
      setTimerEditMode(false);
      setActiveMatchId(nextMatchId);
      await Promise.all([
        loadEventsForMatch(nextMatchId, nextMatch || null),
        loadLineupForMatch(nextMatchId, nextMatch?.formation || DEFAULT_FORMATION),
      ]);
    },
    [
      handleCloseBallLossDialog,
      handleCloseBigChanceDialog,
      handleCloseBigChanceMissDialog,
      handleCloseOurPlayerEventDialog,
      handleClosePenaltyDialog,
      handleCloseSubstitutionDialog,
      handleCloseShotDialog,
      loadEventsForMatch,
      loadLineupForMatch,
      matches,
    ],
  );

  const handleOpenLineupSetup = useCallback(
    (startAfterOpen = false) => {
      const formationFromMatch =
        (activeMatch?.formation && FORMATION_LAYOUTS[activeMatch.formation] && activeMatch.formation) ||
        detectFormationFromLineups(activeLineupSlots);
      const setupSlots = createSlotsForFormation(formationFromMatch, activeLineupSlots);

      setLineupFormation(formationFromMatch);
      setLineupSlots(setupSlots);
      setLineupFocusedSlotId(setupSlots[0]?.slot_id || '');
      setLineupBenchPlayerIds(activeBenchPlayerIds);
      setLineupSetupError('');
      setStartAfterLineupSetup(startAfterOpen);
      setLineupDialogOpen(true);
    },
    [activeBenchPlayerIds, activeLineupSlots, activeMatch],
  );

  const handleFormationChange = (formationKey) => {
    const nextFormation = FORMATION_LAYOUTS[formationKey] ? formationKey : DEFAULT_FORMATION;
    const carriedPlayers = lineupSlots.map((slot) => slot.player_id).filter(Boolean);
    const nextSlots = createSlotsForFormation(nextFormation).map((slot, index) => ({
      ...slot,
      player_id: carriedPlayers[index] || '',
    }));

    setLineupFormation(nextFormation);
    setLineupSlots(nextSlots);
    setLineupFocusedSlotId((currentSlotId) =>
      currentSlotId && nextSlots.some((slot) => slot.slot_id === currentSlotId)
        ? currentSlotId
        : nextSlots[0]?.slot_id || '',
    );
    setLineupSetupError('');
  };

  const handleLineupSlotChange = (slotId, playerId) => {
    setLineupSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (slot.slot_id === slotId) {
          return { ...slot, player_id: playerId };
        }

        if (playerId && slot.player_id === playerId) {
          return { ...slot, player_id: '' };
        }

        return slot;
      }),
    );
    if (playerId) {
      setLineupBenchPlayerIds((currentBenchIds) => currentBenchIds.filter((benchPlayerId) => benchPlayerId !== playerId));
    }
    setLineupFocusedSlotId(slotId);
    setLineupSetupError('');
  };

  const handleLineupBenchChange = (nextValue) => {
    const incomingIds = Array.isArray(nextValue) ? nextValue : String(nextValue).split(',');
    const uniqueIncomingIds = [...new Set(incomingIds.filter(Boolean))];
    const starterIds = new Set(lineupSlots.map((slot) => slot.player_id).filter(Boolean));
    const orderedBenchIds = players
      .filter((player) => uniqueIncomingIds.includes(player.id) && !starterIds.has(player.id))
      .map((player) => player.id);

    setLineupBenchPlayerIds(orderedBenchIds);
    setLineupSetupError('');
  };

  const handleSaveLineupSetup = async () => {
    if (!activeMatch) {
      return;
    }

    const filledSlots = lineupSlots.filter((slot) => slot.player_id);
    const selectedPlayers = new Set(filledSlots.map((slot) => slot.player_id));

    if (filledSlots.length !== 11 || selectedPlayers.size !== 11) {
      setLineupSetupError('Please assign exactly 11 unique players before saving.');
      return;
    }

    try {
      const starterEntries = filledSlots.map((slot) => ({
        ...slot,
        role: 'starter',
      }));
      const benchEntries = lineupBenchPlayerIds.map((playerId, index) => ({
        player_id: playerId,
        role: 'bench',
        slot_id: `bench_${index + 1}`,
        slot_label: BENCH_SLOT_LABEL,
        slot_order: BENCH_SLOT_ORDER_BASE + index,
        row_index: 99,
        column_index: index,
      }));
      const savedLineups = await replaceLineup(
        activeMatch.id,
        [...starterEntries, ...benchEntries],
      );
      const { starters: savedStarterLineups, bench: savedBenchLineups } = splitLineupsByRole(savedLineups);
      const savedBenchPlayerIds = savedBenchLineups.map((lineup) => lineup.player_id).filter(Boolean);
      const savedSquadPlayerIds = [
        ...new Set([
          ...savedStarterLineups.map((slot) => slot.player_id).filter(Boolean),
          ...savedBenchPlayerIds,
        ]),
      ];

      const updatedMatch = await updateMatch(activeMatch.id, { formation: lineupFormation });

      setMatches((currentMatches) =>
        sortMatches(currentMatches.map((match) => (match.id === updatedMatch.id ? updatedMatch : match))),
      );
      setActiveLineupSlots(savedStarterLineups);
      setActiveBenchPlayerIds(savedBenchPlayerIds);
      setLineupBenchPlayerIds(savedBenchPlayerIds);
      setLineupsByMatch((current) => ({ ...current, [activeMatch.id]: savedLineups }));
      setSelectedPlayerId((currentPlayerId) => {
        if (currentPlayerId && savedSquadPlayerIds.includes(currentPlayerId)) {
          return currentPlayerId;
        }

        return savedSquadPlayerIds[0] || currentPlayerId;
      });
      setLineupDialogOpen(false);
      setLineupSetupError('');
      setStartAfterLineupSetup(false);

      if (startAfterLineupSetup) {
        setMatchPhase(MATCH_PHASES.firstHalf);
        setTimerRunning(true);
      }
    } catch (error) {
      setLineupSetupError(error instanceof Error ? error.message : 'Could not save lineup setup');
    }
  };

  const handleStartTimer = () => {
    if (!activeMatch) {
      return;
    }

    if (matchPhase !== MATCH_PHASES.firstHalf) {
      return;
    }

    if (!hasStartingLineup) {
      handleOpenLineupSetup(true);
      return;
    }

    setTimerRunning(true);
    setTimerEditMode(false);
  };
  const handleOpenTimerEditor = () => {
    setTimerRunning(false);
    setTimerMinuteInput(String(Math.floor(elapsedSeconds / 60)));
    setTimerSecondInput(String(elapsedSeconds % 60).padStart(2, '0'));
    setTimerEditMode(true);
  };
  const handleCancelTimerEditor = () => {
    setTimerEditMode(false);
  };
  const handleApplyTimerEdit = () => {
    const minuteValue = Math.max(0, Number.parseInt(timerMinuteInput, 10) || 0);
    const secondValue = clamp(Number.parseInt(timerSecondInput, 10) || 0, 0, 59);
    let nextElapsed = minuteValue * 60 + secondValue;

    if (matchPhase === MATCH_PHASES.halfTime) {
      nextElapsed = HALF_SECONDS;
    }
    if (matchPhase === MATCH_PHASES.secondHalf || matchPhase === MATCH_PHASES.fullTime) {
      nextElapsed = Math.max(HALF_SECONDS, nextElapsed);
    }

    setElapsedSeconds(nextElapsed);
    setTimerEditMode(false);
    setErrorMessage('');
  };

  const handleEndFirstHalf = useCallback(async () => {
    if (!activeMatch || !isDraftMatch) return;

    try {
      setTimerRunning(false);

      const hasHalfTimeMarker = events.some(
        (event) => event.match_id === activeMatch.id && event.type === 'half_time_marker',
      );

      if (!hasHalfTimeMarker) {
        const halfTimeMarkerEvent = await createEvent({
          match_id: activeMatch.id,
          player_id: '',
          zone: DEFAULT_ZONE,
          minute: HALF_MINUTES,
          second: 0,
          event_period: MATCH_PHASES.firstHalf,
          side: 'our',
          type: 'half_time_marker',
          points: EVENT_TYPE_POINTS.half_time_marker ?? 0,
          source_action: 'half_time_marker',
          is_derived: false,
        });
        setEvents((currentEvents) => sortEvents([...currentEvents, halfTimeMarkerEvent]));
        setAllEvents((currentEvents) => [...currentEvents, halfTimeMarkerEvent]);
        setSelectedEventId(halfTimeMarkerEvent.id);
      }

      setElapsedSeconds(HALF_SECONDS);
      setMatchPhase(MATCH_PHASES.secondHalf);
      setTimerEditMode(false);
      const updatedMatch = await updateMatch(activeMatch.id, {
        phase: MATCH_PHASES.secondHalf,
      });
      setMatches((currentMatches) =>
        sortMatches(currentMatches.map((match) => (match.id === updatedMatch.id ? updatedMatch : match))),
      );
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not end first half');
    }
  }, [activeMatch, events, isDraftMatch]);

  const handleStartSecondHalf = useCallback(async () => {
    if (!activeMatch || !isDraftMatch) return;

    if (!hasStartingLineup) {
      handleOpenLineupSetup(false);
      setErrorMessage('Complete lineup setup before starting second half.');
      return;
    }

    try {
      setElapsedSeconds((currentElapsed) => Math.max(currentElapsed, HALF_SECONDS));
      setMatchPhase(MATCH_PHASES.secondHalf);
      setTimerRunning(true);
      setTimerEditMode(false);
      const updatedMatch = await updateMatch(activeMatch.id, {
        phase: MATCH_PHASES.secondHalf,
      });
      setMatches((currentMatches) =>
        sortMatches(currentMatches.map((match) => (match.id === updatedMatch.id ? updatedMatch : match))),
      );
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not start second half');
    }
  }, [activeMatch, handleOpenLineupSetup, hasStartingLineup, isDraftMatch]);

  const handleEndMatch = useCallback(async () => {
    if (!activeMatch || !canCompleteMatch) return;

    try {
      setTimerRunning(false);
      setMatchPhase(MATCH_PHASES.fullTime);
      setTimerEditMode(false);
      const updatedMatch = await updateMatch(activeMatch.id, {
        status: 'completed',
        phase: MATCH_PHASES.fullTime,
      });
      setMatches((currentMatches) =>
        sortMatches(currentMatches.map((match) => (match.id === updatedMatch.id ? updatedMatch : match))),
      );
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not end match');
    }
  }, [activeMatch, canCompleteMatch]);

  const handleCloseLineupDialog = () => {
    setLineupDialogOpen(false);
    setStartAfterLineupSetup(false);
    setLineupSetupError('');
  };

  useEffect(() => {
    function onKeyDown(event) {
      if (uiView !== 'live') {
        return;
      }

      if (
        pendingShotType ||
        pendingBallLossSide ||
        pendingPlayerEventType ||
        isSubmittingPlayerPick ||
        playerPickerDialogOpen ||
        matchControlDialogOpen ||
        competitionDialogOpen ||
        pendingPenaltyFouledPlayerId !== null ||
        substitutionDialogOpen ||
        pendingBigChancePlayerId !== null ||
        pendingBigChanceMissPlayerId !== null
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const target = event.target;
      const isInputTarget =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      if (event.shiftKey && key === 'z') {
        event.preventDefault();
        void handleUndoLastEvent();
        return;
      }

      if (event.ctrlKey && key === 'e') {
        event.preventDefault();
        handleOpenSelectedForEdit();
        return;
      }

      if (event.code === 'Space' && !isInputTarget) {
        event.preventDefault();
        handleToggleTimer();
        return;
      }

      if (event.key === 'Tab' && !isInputTarget && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setLiveEventSide((current) => (current === 'our' ? 'opponent' : 'our'));
        return;
      }

      if (isInputTarget || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

      const zoneFromHotkey = ZONE_HOTKEYS[event.key];
      if (zoneFromHotkey) {
        event.preventDefault();
        setSelectedZone(zoneFromHotkey);
        return;
      }

      const mappedType = EVENT_KEY_BINDINGS[key];
      if (!mappedType) return;

      event.preventDefault();
      void handleCreateQuickEvent(mappedType);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleCreateQuickEvent,
    handleOpenSelectedForEdit,
    handleToggleTimer,
    handleUndoLastEvent,
    pendingBigChancePlayerId,
    pendingBigChanceMissPlayerId,
    pendingBallLossSide,
    pendingPlayerEventType,
    isSubmittingPlayerPick,
    pendingPenaltyFouledPlayerId,
    matchControlDialogOpen,
    competitionDialogOpen,
    playerPickerDialogOpen,
    substitutionDialogOpen,
    pendingShotType,
    setLiveEventSide,
    uiView,
  ]);

  const handleCreateDraftMatch = async () => {
    try {
      const normalizedRound = Number(competitionRoundInput);
      const nextRoundNumber = Number.isFinite(normalizedRound) && normalizedRound > 0 ? normalizedRound : 1;
      const draftMatch = await createDraftMatch(
        {
          date: matchDateInput || todayDate(),
          opponent: selectedOpponent?.name || 'TBD',
          competition_id: selectedCompetition?.id || '',
          competition_type: selectedCompetition?.type || '',
          competition_name: selectedCompetition?.name || '',
          round_number: nextRoundNumber,
          opponent_formation: opponentFormationInput,
          opponent_id: selectedOpponent?.id || '',
          opponent_logo_data_url: selectedOpponent?.logo_data_url || '',
          season_tag: normalizeSeasonTag(selectedCompetition?.name || ''),
          opponent_logo_url: selectedOpponent?.logo_data_url || '',
        },
        [],
      );

      setMatches((currentMatches) => sortMatches([draftMatch, ...currentMatches]));
      setMatchControlDialogOpen(false);
      setMatchDateInput(draftMatch.date);
      setCompetitionIdInput(draftMatch.competition_id || '');
      setCompetitionRoundInput(String(Number(draftMatch.round_number) > 0 ? Number(draftMatch.round_number) : 1));
      setOpponentIdInput(draftMatch.opponent_id || '');
      setOpponentFormationInput(resolveOpponentFormation(draftMatch));
      setNewCompetitionNameInput('');
      setActiveMatchId(draftMatch.id);
      setEvents([]);
      setSelectedEventId('');
      setEditingEvent(null);
      setElapsedSeconds(0);
      setMatchPhase(MATCH_PHASES.firstHalf);
      setTimerRunning(false);
      setTimerEditMode(false);
      handleCloseShotDialog();
      handleCloseBallLossDialog();
      handleCloseOurPlayerEventDialog();
      handleClosePenaltyDialog();
      handleCloseSubstitutionDialog();
      handleCloseBigChanceDialog();
      handleCloseBigChanceMissDialog();
      setActiveLineupSlots([]);
      setActiveBenchPlayerIds([]);
      setLineupsByMatch((current) => ({ ...current, [draftMatch.id]: [] }));
      setLineupFormation(DEFAULT_FORMATION);
      setLineupSlots(createSlotsForFormation(DEFAULT_FORMATION));
      setLineupBenchPlayerIds([]);
      setLineupFocusedSlotId('');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create draft match');
    }
  };

  const handleSaveMatchInfo = async () => {
    if (!activeMatch) return;

    try {
      const normalizedRound = Number(competitionRoundInput);
      const nextRoundNumber = Number.isFinite(normalizedRound) && normalizedRound > 0 ? normalizedRound : 1;
      const updatedMatch = await updateMatch(activeMatch.id, {
        date: matchDateInput || activeMatch.date,
        opponent: selectedOpponent?.name || activeMatch.opponent || 'TBD',
        competition_id: selectedCompetition?.id || '',
        competition_type: selectedCompetition?.type || '',
        competition_name: selectedCompetition?.name || '',
        round_number: nextRoundNumber,
        opponent_formation: opponentFormationInput,
        opponent_id: selectedOpponent?.id || '',
        opponent_logo_data_url: selectedOpponent?.logo_data_url || '',
        season_tag: normalizeSeasonTag(selectedCompetition?.name || ''),
        opponent_logo_url: selectedOpponent?.logo_data_url || '',
      });

      setMatches((currentMatches) =>
        sortMatches(currentMatches.map((match) => (match.id === updatedMatch.id ? updatedMatch : match))),
      );

      setMatchControlDialogOpen(false);
      setMatchDateInput(updatedMatch.date);
      setCompetitionIdInput(updatedMatch.competition_id || '');
      setCompetitionRoundInput(String(Number(updatedMatch.round_number) > 0 ? Number(updatedMatch.round_number) : 1));
      setOpponentIdInput(updatedMatch.opponent_id || '');
      setOpponentFormationInput(resolveOpponentFormation(updatedMatch));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update match info');
    }
  };

  const refreshPlayers = useCallback(async () => {
    const loadedPlayers = await listPlayers();
    setPlayers(loadedPlayers);
    return loadedPlayers;
  }, []);
  const refreshCompetitions = useCallback(async () => {
    const loadedCompetitions = await listCompetitions();
    setCompetitions(loadedCompetitions);
    return loadedCompetitions;
  }, []);
  const refreshOpponents = useCallback(async () => {
    const loadedOpponents = await listOpponents();
    setOpponents(loadedOpponents);
    return loadedOpponents;
  }, []);
  const reloadAppDataFromDatabase = useCallback(
    async (preferredMatchId = '') => {
      const [loadedPlayers, loadedTeamProfile, loadedCompetitions, loadedOpponents, loadedMatches] = await Promise.all([
        listPlayers(),
        getTeamProfile(),
        listCompetitions(),
        listOpponents(),
        listMatches(),
      ]);

      let refreshedMatches = [...loadedMatches];
      let draftMatch = refreshedMatches.find((match) => match.status === 'draft') || null;
      if (!draftMatch) {
        draftMatch = await createDraftMatch({ date: todayDate(), opponent: 'TBD' }, []);
        refreshedMatches = sortMatches([draftMatch, ...refreshedMatches]);
      }

      const sortedMatches = sortMatches(refreshedMatches);
      const targetMatch =
        sortedMatches.find((match) => match.id === preferredMatchId) ||
        sortedMatches.find((match) => match.status === 'draft') ||
        sortedMatches[0] ||
        null;

      if (!targetMatch) {
        throw new Error('Could not resolve active match after refresh');
      }

      const [rawTargetEvents, rawAllEvents, allLoadedLineups] = await Promise.all([
        listEventsByMatch(targetMatch.id),
        loadAllEventsForMatches(sortedMatches),
        loadAllLineupsForMatches(sortedMatches),
      ]);
      const { events: allLoadedEvents, normalizedById } = await normalizeOpponentPlayerAssignments(rawAllEvents);
      const targetEvents = rawTargetEvents.map((event) => normalizedById.get(event.id) || event);
      const targetLineups = allLoadedLineups[targetMatch.id] || [];
      const { starters, bench } = splitLineupsByRole(targetLineups);
      const benchIds = bench.map((lineup) => lineup.player_id).filter(Boolean);
      const lineupFormationValue =
        (targetMatch.formation &&
          FORMATION_LAYOUTS[targetMatch.formation] &&
          targetMatch.formation) ||
        detectFormationFromLineups(targetLineups);
      const setupSlots = createSlotsForFormation(lineupFormationValue, starters);
      const squadPlayerIds = [
        ...new Set([...starters.map((slot) => slot.player_id).filter(Boolean), ...benchIds]),
      ];
      const inferredElapsed = inferElapsedFromEvents(targetEvents);

      setPlayers(loadedPlayers);
      setTeamProfile(loadedTeamProfile);
      setCompetitions(loadedCompetitions);
      setOpponents(loadedOpponents);
      setMatches(sortedMatches);
      setMatchControlDialogOpen(false);
      setActiveMatchId(targetMatch.id);
      setMatchDateInput(targetMatch.date);
      setCompetitionIdInput(targetMatch.competition_id || '');
      setCompetitionRoundInput(String(Number(targetMatch.round_number) > 0 ? Number(targetMatch.round_number) : 1));
      setOpponentIdInput(targetMatch.opponent_id || '');
      setOpponentFormationInput(resolveOpponentFormation(targetMatch, lineupFormationValue));
      setNewCompetitionNameInput('');
      setEvents(targetEvents);
      setAllEvents(allLoadedEvents);
      setLineupsByMatch(allLoadedLineups);
      setSelectedEventId('');
      setEditingEvent(null);
      setElapsedSeconds(inferredElapsed);
      setMatchPhase(inferMatchPhase(targetMatch, inferredElapsed));
      setTimerRunning(false);
      setTimerEditMode(false);
      handleCloseShotDialog();
      handleCloseBallLossDialog();
      handleCloseOurPlayerEventDialog();
      handleClosePenaltyDialog();
      handleCloseSubstitutionDialog();
      handleCloseBigChanceDialog();
      handleCloseBigChanceMissDialog();
      setActiveLineupSlots(starters);
      setActiveBenchPlayerIds(benchIds);
      setLineupFormation(lineupFormationValue);
      setLineupSlots(setupSlots);
      setLineupBenchPlayerIds(benchIds);
      setLineupFocusedSlotId(setupSlots[0]?.slot_id || '');
      setSelectedPlayerId((currentPlayerId) => {
        if (currentPlayerId && squadPlayerIds.includes(currentPlayerId)) {
          return currentPlayerId;
        }

        return squadPlayerIds[0] || currentPlayerId || loadedPlayers[0]?.id || '';
      });
      setReady(true);

      return targetMatch;
    },
    [
      handleCloseBallLossDialog,
      handleCloseBigChanceDialog,
      handleCloseBigChanceMissDialog,
      handleCloseOurPlayerEventDialog,
      handleClosePenaltyDialog,
      handleCloseShotDialog,
      handleCloseSubstitutionDialog,
      loadAllEventsForMatches,
      loadAllLineupsForMatches,
      normalizeOpponentPlayerAssignments,
    ],
  );

  const createPreRiskBackup = useCallback(
    async (reason) => {
      try {
        const payload = await exportDatabaseBackup();
        downloadBackupFile(payload, reason);
        setDataSafetyStatus({
          severity: 'success',
          message: `Backup downloaded (${reason}).`,
          timestamp: new Date().toISOString(),
        });
        return payload;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not create safety backup';
        setDataSafetyStatus({
          severity: 'error',
          message: `Backup failed: ${message}`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(message);
      }
    },
    [],
  );

  const handleDownloadDataBackup = useCallback(async () => {
    const payload = await exportDatabaseBackup();
    downloadBackupFile(payload, 'manual');
    const totalRecords = Object.values(payload.stores || {}).reduce(
      (sum, records) => sum + (Array.isArray(records) ? records.length : 0),
      0,
    );
    setDataSafetyStatus({
      severity: 'success',
      message: `Manual backup downloaded (${totalRecords} records).`,
      timestamp: new Date().toISOString(),
    });
    return payload;
  }, []);

  const handleImportDataBackup = useCallback(
    async (file) => {
      if (!file) {
        throw new Error('Backup file is required');
      }

      await createPreRiskBackup('pre_import');
      const backupText = await file.text();
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(backupText);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Backup file is not valid JSON');
      }

      const importResult = await importDatabaseBackup(parsedPayload, { mode: 'merge' });
      await reloadAppDataFromDatabase(activeMatchId);
      setDataSafetyStatus({
        severity: 'success',
        message: formatImportSummary(importResult),
        timestamp: new Date().toISOString(),
        details: importResult.byStore,
      });
      return importResult;
    },
    [activeMatchId, createPreRiskBackup, reloadAppDataFromDatabase],
  );

  const handleCompetitionSelectionChange = useCallback(
    (nextCompetitionId) => {
      setCompetitionIdInput(nextCompetitionId);
      setOpponentIdInput('');
      setCompetitionRoundInput(String(getSuggestedRoundForCompetition(nextCompetitionId)));
    },
    [getSuggestedRoundForCompetition],
  );

  const handleCreateCompetition = useCallback(async () => {
    const normalizedName = String(newCompetitionNameInput || '').trim();
    if (!normalizedName) {
      setErrorMessage('Competition name is required');
      return;
    }

    try {
      const createdCompetition = await createCompetition({
        type: newCompetitionTypeInput,
        name: normalizedName,
      });
      await refreshCompetitions();
      setCompetitionDialogOpen(false);
      setNewCompetitionNameInput('');
      setNewCompetitionTypeInput('league');
      handleCompetitionSelectionChange(createdCompetition.id);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create competition');
    }
  }, [
    handleCompetitionSelectionChange,
    newCompetitionNameInput,
    newCompetitionTypeInput,
    refreshCompetitions,
  ]);

  const handleDeleteActiveDraftMatch = useCallback(async () => {
    if (!activeMatch || activeMatch.status !== 'draft') {
      return;
    }

    const confirmed = window.confirm('Delete this draft match and all linked events/lineup?');
    if (!confirmed) {
      return;
    }

    try {
      await createPreRiskBackup('pre_delete_draft_match');
      await deleteDraftMatchCascade(activeMatch.id);
      let refreshedMatches = await listMatches();

      let nextDraftMatch = refreshedMatches.find((match) => match.status === 'draft') || null;
      if (!nextDraftMatch) {
        nextDraftMatch = await createDraftMatch({ date: todayDate(), opponent: 'TBD' }, []);
        refreshedMatches = sortMatches([nextDraftMatch, ...refreshedMatches]);
      }

      const [draftEvents, allLoadedEvents, allLoadedLineups] = await Promise.all([
        listEventsByMatch(nextDraftMatch.id),
        loadAllEventsForMatches(refreshedMatches),
        loadAllLineupsForMatches(refreshedMatches),
      ]);

      const nextLineups = allLoadedLineups[nextDraftMatch.id] || [];
      const { starters, bench } = splitLineupsByRole(nextLineups);
      const initialFormation =
        (nextDraftMatch.formation &&
          FORMATION_LAYOUTS[nextDraftMatch.formation] &&
          nextDraftMatch.formation) ||
        detectFormationFromLineups(nextLineups);
      const setupSlots = createSlotsForFormation(initialFormation, starters);
      const starterIds = starters.map((slot) => slot.player_id).filter(Boolean);
      const benchIds = bench.map((lineup) => lineup.player_id).filter(Boolean);
      const squadIds = [...new Set([...starterIds, ...benchIds])];
      const inferredElapsed = inferElapsedFromEvents(draftEvents);

      setMatches(sortMatches(refreshedMatches));
      setMatchControlDialogOpen(false);
      setActiveMatchId(nextDraftMatch.id);
      setMatchDateInput(nextDraftMatch.date);
      setCompetitionIdInput(nextDraftMatch.competition_id || '');
      setCompetitionRoundInput(String(Number(nextDraftMatch.round_number) > 0 ? Number(nextDraftMatch.round_number) : 1));
      setOpponentIdInput(nextDraftMatch.opponent_id || '');
      setOpponentFormationInput(resolveOpponentFormation(nextDraftMatch, initialFormation));
      setEvents(draftEvents);
      setAllEvents(allLoadedEvents);
      setLineupsByMatch(allLoadedLineups);
      setSelectedEventId('');
      setEditingEvent(null);
      setElapsedSeconds(inferredElapsed);
      setMatchPhase(inferMatchPhase(nextDraftMatch, inferredElapsed));
      setTimerRunning(false);
      setTimerEditMode(false);
      handleCloseShotDialog();
      handleCloseBallLossDialog();
      handleCloseOurPlayerEventDialog();
      handleClosePenaltyDialog();
      handleCloseSubstitutionDialog();
      handleCloseBigChanceDialog();
      handleCloseBigChanceMissDialog();
      setActiveLineupSlots(starters);
      setActiveBenchPlayerIds(benchIds);
      setLineupFormation(initialFormation);
      setLineupSlots(setupSlots);
      setLineupBenchPlayerIds(benchIds);
      setLineupFocusedSlotId(setupSlots[0]?.slot_id || '');
      setSelectedPlayerId((currentPlayerId) => {
        if (currentPlayerId && squadIds.includes(currentPlayerId)) {
          return currentPlayerId;
        }
        return squadIds[0] || currentPlayerId || '';
      });
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete draft match');
    }
  }, [
    activeMatch,
    createPreRiskBackup,
    handleCloseBallLossDialog,
    handleCloseBigChanceDialog,
    handleCloseBigChanceMissDialog,
    handleCloseOurPlayerEventDialog,
    handleClosePenaltyDialog,
    handleCloseShotDialog,
    handleCloseSubstitutionDialog,
    loadAllEventsForMatches,
    loadAllLineupsForMatches,
  ]);

  const handleSaveTeamProfile = useCallback(async (profilePatch) => {
    const savedProfile = await saveTeamProfile(profilePatch);
    setTeamProfile(savedProfile);
    return savedProfile;
  }, []);

  const handleCreateTeamPlayer = useCallback(
    async (playerInput) => {
      await createPlayerRecord(playerInput);
      await refreshPlayers();
    },
    [refreshPlayers],
  );

  const handleUpdateTeamPlayer = useCallback(
    async (playerId, patch) => {
      await updatePlayerRecord(playerId, patch);
      await refreshPlayers();
    },
    [refreshPlayers],
  );

  const handleToggleTeamPlayerActive = useCallback(
    async (playerId, nextIsActive) => {
      const targetPlayer = playersById[playerId];
      if (!targetPlayer) {
        throw new Error('Player not found');
      }

      if (!nextIsActive && activeMatchLineupPlayerIds.has(playerId)) {
        throw new Error('This player is in active match XI/bench. Update lineup first.');
      }

      await togglePlayerActive(playerId, nextIsActive);
      await refreshPlayers();
    },
    [activeMatchLineupPlayerIds, playersById, refreshPlayers],
  );

  const handleCreateTeamOpponent = useCallback(
    async (opponentInput) => {
      await createOpponent(opponentInput);
      await refreshOpponents();
    },
    [refreshOpponents],
  );

  const handleUpdateTeamOpponent = useCallback(
    async (opponentId, patch) => {
      await updateOpponent(opponentId, patch);
      await refreshOpponents();
    },
    [refreshOpponents],
  );

  const handleToggleTeamOpponentActive = useCallback(
    async (opponentId, nextIsActive) => {
      await toggleOpponentActive(opponentId, nextIsActive);
      await refreshOpponents();
    },
    [refreshOpponents],
  );

  const handleUpdateTeamCompetition = useCallback(
    async (competitionId, patch) => {
      await updateCompetition(competitionId, patch);
      await refreshCompetitions();
    },
    [refreshCompetitions],
  );

  const handleReopenMatch = useCallback(async () => {
    if (!activeMatch || !canCompleteMatch || activeMatch.status !== 'completed') return;

    const reopenedPhase = elapsedSeconds >= HALF_SECONDS ? MATCH_PHASES.secondHalf : MATCH_PHASES.firstHalf;

    try {
      const updatedMatch = await updateMatch(activeMatch.id, {
        status: 'draft',
        phase: reopenedPhase,
      });
      setMatches((currentMatches) =>
        sortMatches(currentMatches.map((match) => (match.id === activeMatch.id ? updatedMatch : match))),
      );
      setMatchPhase(reopenedPhase);
      setTimerRunning(false);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not reopen match');
    }
  }, [activeMatch, canCompleteMatch, elapsedSeconds]);

  const handleDeleteEvent = async (eventId) => {
    if (!canDeleteEvent) return;

    const targetEvent = eventById[eventId];
    if (!targetEvent) return;

    const editableEvent = resolveEditableEvent(targetEvent);
    const groupId = editableEvent?.action_group_id;
    const groupEvents =
      groupId && eventsByActionGroupId[groupId]?.length ? eventsByActionGroupId[groupId] : [editableEvent];
    const idsToDelete = new Set(groupEvents.filter(Boolean).map((event) => event.id));

    try {
      await Promise.all(groupEvents.filter(Boolean).map((event) => deleteEvent(event.id)));
      setEvents((currentEvents) => currentEvents.filter((event) => !idsToDelete.has(event.id)));
      setAllEvents((currentEvents) => currentEvents.filter((event) => !idsToDelete.has(event.id)));
      if (selectedEventId && idsToDelete.has(selectedEventId)) {
        setSelectedEventId('');
        setEditingEvent(null);
      }
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete event');
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditingEvent((currentEvent) => {
      if (!currentEvent) return currentEvent;
      const sanitizeEditedEventBySide = (nextEvent) =>
        nextEvent.side === 'opponent'
          ? {
              ...nextEvent,
              player_id: '',
            }
          : nextEvent;
      if (field === 'type') {
        if (value === 'substitution') {
          return sanitizeEditedEventBySide({
            ...currentEvent,
            type: value,
            player_id: currentEvent.player_out_id || currentEvent.player_id,
            player_out_id: currentEvent.player_out_id || currentEvent.player_id,
            player_in_id: currentEvent.player_in_id || '',
            side: 'our',
            points: EVENT_TYPE_POINTS.substitution ?? 0,
            shot_context: undefined,
            is_header: undefined,
            hit_woodwork: undefined,
            goal_source_type: undefined,
          });
        }

        if (!SHOT_OUTCOME_TYPES.has(value)) {
          return sanitizeEditedEventBySide({
            ...currentEvent,
            type: value,
            shot_context: undefined,
            is_header: false,
            hit_woodwork: undefined,
            goal_source_type: undefined,
            player_out_id: undefined,
            player_in_id: undefined,
          });
        }

        return sanitizeEditedEventBySide({
          ...currentEvent,
          type: value,
          shot_context: currentEvent.shot_context || '',
          is_header: Boolean(currentEvent.is_header),
          hit_woodwork: value === 'shot_off' ? Boolean(currentEvent.hit_woodwork) : undefined,
          goal_source_type: value === 'goal' ? currentEvent.goal_source_type || 'open_play' : undefined,
          player_out_id: undefined,
          player_in_id: undefined,
        });
      }

      if (field === 'side') {
        return sanitizeEditedEventBySide({
          ...currentEvent,
          side: value === 'opponent' ? 'opponent' : 'our',
        });
      }

      return sanitizeEditedEventBySide({ ...currentEvent, [field]: value });
    });
  };

  const handleAssignEventPlayer = useCallback(
    async (eventId, playerId) => {
      if (!playerId) {
        return;
      }

      const targetEvent = eventById[eventId];
      if (!targetEvent) {
        return;
      }
      if (targetEvent.side === 'opponent') {
        setErrorMessage('Player attribution is only available for our team events.');
        return;
      }

      try {
        const updatedEvent = await saveEvent({
          ...targetEvent,
          player_id: playerId,
        });

        setEvents((currentEvents) =>
          sortEvents(currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))),
        );
        setAllEvents((currentEvents) =>
          currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
        );
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not assign player');
      }
    },
    [eventById],
  );

  const handleSaveEventEdit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editingEvent || !canEditEvent) return;

    const editableEvent = resolveEditableEvent(editingEvent);
    if (!editableEvent) {
      setEditingEvent(null);
      return;
    }

    const normalizedEvent = {
      ...editableEvent,
      minute: Math.max(0, Number.parseInt(editingEvent.minute, 10) || 0),
      second: clamp(Number.parseInt(editingEvent.second, 10) || 0, 0, 59),
      points: Number.parseInt(editingEvent.points, 10) || 0,
      shot_context: editingEvent.shot_context || '',
      is_header: Boolean(editingEvent.is_header),
      hit_woodwork: Boolean(editingEvent.hit_woodwork),
      goal_source_type: editingEvent.goal_source_type || '',
      side: editingEvent.side === 'opponent' ? 'opponent' : 'our',
      player_out_id: editingEvent.player_out_id || editingEvent.player_id || '',
      player_in_id: editingEvent.player_in_id || '',
    };

    if (SHOT_OUTCOME_TYPES.has(normalizedEvent.type) && !normalizedEvent.shot_context) {
      setErrorMessage('Select shot location before saving the event.');
      return;
    }

    if (normalizedEvent.type === 'substitution') {
      const playerOutId = normalizedEvent.player_out_id || normalizedEvent.player_id;
      const playerInId = normalizedEvent.player_in_id;
      const creatingNewSubstitution = editableEvent.type !== 'substitution';
      if (creatingNewSubstitution && substitutionCount >= MAX_SUBSTITUTIONS_PER_MATCH) {
        setErrorMessage(`Maximum ${MAX_SUBSTITUTIONS_PER_MATCH} substitutions reached for this match.`);
        return;
      }
      if (!playerOutId || !playerInId) {
        setErrorMessage('Substitution requires both Player Out and Player In.');
        return;
      }
      if (playerOutId === playerInId) {
        setErrorMessage('Player Out and Player In must be different.');
        return;
      }

      normalizedEvent.player_id = playerOutId;
      normalizedEvent.player_out_id = playerOutId;
      normalizedEvent.player_in_id = playerInId;
      normalizedEvent.side = 'our';
      normalizedEvent.points = EVENT_TYPE_POINTS.substitution ?? 0;
    }

    if (normalizedEvent.type === 'big_chance_won') {
      normalizedEvent.shot_context = normalizedEvent.shot_context || undefined;
      normalizedEvent.is_header =
        normalizedEvent.is_header === undefined ? undefined : Boolean(normalizedEvent.is_header);
      normalizedEvent.hit_woodwork =
        normalizedEvent.big_chance_shot_type === 'shot_off' ? Boolean(normalizedEvent.hit_woodwork) : undefined;
      normalizedEvent.goal_source_type =
        normalizedEvent.big_chance_result === 'goal'
          ? normalizedEvent.goal_source_type || 'open_play'
          : undefined;
    } else if (!SHOT_OUTCOME_TYPES.has(normalizedEvent.type)) {
      normalizedEvent.shot_context = undefined;
      normalizedEvent.is_header = undefined;
      normalizedEvent.hit_woodwork = undefined;
      normalizedEvent.goal_source_type = undefined;
    } else if (normalizedEvent.type !== 'goal') {
      normalizedEvent.goal_source_type = undefined;
      if (normalizedEvent.type !== 'shot_off') {
        normalizedEvent.hit_woodwork = undefined;
      }
    } else {
      normalizedEvent.goal_source_type = normalizedEvent.goal_source_type || 'open_play';
      normalizedEvent.hit_woodwork = undefined;
    }

    if (normalizedEvent.type === 'goal') {
      if (
        normalizedEvent.side === 'opponent' ||
        normalizedEvent.goal_source_type === 'own_goal' ||
        normalizedEvent.assist_player_id === normalizedEvent.player_id
      ) {
        normalizedEvent.assist_player_id = undefined;
      } else {
        normalizedEvent.assist_player_id = normalizedEvent.assist_player_id || undefined;
      }
    } else {
      normalizedEvent.assist_player_id = undefined;
    }

    if (normalizedEvent.type === 'goal' && normalizedEvent.shot_context === 'inside_box') {
      normalizedEvent.zone = 'box';
    }

    try {
      if (normalizedEvent.action_group_id) {
        const groupEvents = eventsByActionGroupId[normalizedEvent.action_group_id] || [normalizedEvent];
        const isPenaltyGroup =
          normalizedEvent.type === 'penalty_won' &&
          groupEvents.some((event) => event.type === 'penalty_won' || event.source_action === 'penalty_won');
        const isBigChanceGroup =
          normalizedEvent.type === 'big_chance_won' &&
          groupEvents.some((event) => event.type === 'big_chance_won' || event.source_action === 'big_chance_won');
        const isDangerousFoulGroup =
          normalizedEvent.type === 'foul_won' &&
          groupEvents.some((event) => event.type === 'foul_won' && event.foul_flow);
        const isMirrorGroup =
          groupEvents.some((event) => event.mirror_anchor || event.mirror_generated) ||
          Boolean(normalizedEvent.mirror_anchor || normalizedEvent.mirror_generated || normalizedEvent.mirror_rule);
        const mirrorRuleHint =
          normalizedEvent.mirror_rule ||
          groupEvents.find((event) => event.mirror_anchor && event.mirror_rule)?.mirror_rule ||
          groupEvents.find((event) => event.mirror_generated && event.mirror_rule)?.mirror_rule ||
          '';
        const idsToReplace = new Set(groupEvents.map((event) => event.id));
        const baseRebuildPayload = {
          match_id: normalizedEvent.match_id,
          player_id: normalizedEvent.player_id,
          zone: normalizedEvent.zone,
          minute: normalizedEvent.minute,
          second: normalizedEvent.second,
          event_period: normalizedEvent.event_period || resolveEventPeriod('', normalizedEvent.minute),
          side: normalizedEvent.side,
          shot_context: normalizedEvent.shot_context,
          is_header: normalizedEvent.is_header,
          hit_woodwork: normalizedEvent.hit_woodwork,
          goal_source_type: normalizedEvent.goal_source_type,
          assist_player_id: normalizedEvent.assist_player_id,
          foul_committed_player_id: normalizedEvent.foul_committed_player_id,
          player_out_id: normalizedEvent.player_out_id,
          player_in_id: normalizedEvent.player_in_id,
          auto_context_transition: normalizedEvent.auto_context_transition,
          auto_prev_side: normalizedEvent.auto_prev_side,
          auto_prev_zone: normalizedEvent.auto_prev_zone,
        };

        await Promise.all(groupEvents.map((event) => deleteEvent(event.id)));

        const rebuiltPayloads =
          isPenaltyGroup
            ? (() => {
                const payloads = buildPenaltyActionPayloads({
                  matchId: normalizedEvent.match_id,
                  fouledPlayerId: normalizedEvent.player_id,
                  penaltyTakerId:
                    normalizedEvent.side === 'opponent'
                      ? ''
                      : normalizedEvent.penalty_taker_id || normalizedEvent.player_id,
                  foulCommittedPlayerId: normalizedEvent.foul_committed_player_id || '',
                  goalConcededPlayerId:
                    groupEvents.find(
                      (event) => event.type === 'goal_conceded' && event.side === 'our' && event.player_id,
                    )?.player_id ||
                    liveGoalkeeperId ||
                    '',
                  penaltyOutcome: normalizedEvent.penalty_outcome || 'made',
                  minute: normalizedEvent.minute,
                  second: normalizedEvent.second,
                  eventPeriod: normalizedEvent.event_period || resolveEventPeriod('', normalizedEvent.minute),
                  side: normalizedEvent.side || 'our',
                  actionGroupId: normalizedEvent.action_group_id,
                  primaryPoints: normalizedEvent.points,
                });

                const anchorIndex = payloads.findIndex(
                  (payload) => payload.type === 'penalty_won' && !payload.is_derived,
                );
                if (anchorIndex < 0) {
                  return payloads;
                }

                const anchorPayload = {
                  ...payloads[anchorIndex],
                  mirror_anchor: true,
                  mirror_rule: 'penalty_won_to_foul_committed',
                };
                payloads[anchorIndex] = anchorPayload;

                const mirrorSide = getOppositeSide(anchorPayload.side);
                const existingMirrorPlayerId =
                  groupEvents.find(
                    (event) =>
                      event.mirror_generated &&
                      event.type === 'foul_committed' &&
                      event.side === mirrorSide,
                  )?.player_id || '';
                const mirrorPlayerId =
                  mirrorSide === 'our'
                    ? normalizedEvent.foul_committed_player_id || existingMirrorPlayerId || ''
                    : '';

                payloads.push({
                  match_id: anchorPayload.match_id,
                  player_id: mirrorPlayerId,
                  zone: anchorPayload.zone,
                  minute: anchorPayload.minute,
                  second: anchorPayload.second,
                  event_period: anchorPayload.event_period,
                  side: mirrorSide,
                  type: 'foul_committed',
                  points: EVENT_TYPE_POINTS.foul_committed ?? 0,
                  action_group_id: anchorPayload.action_group_id,
                  is_derived: false,
                  source_action: 'penalty_won',
                  mirror_generated: true,
                  mirror_rule: 'penalty_won_to_foul_committed',
                });

                return payloads;
              })()
            : isBigChanceGroup
            ? buildBigChanceActionPayloads({
                matchId: normalizedEvent.match_id,
                playerId: normalizedEvent.player_id,
                zone: normalizedEvent.zone,
                result: normalizedEvent.big_chance_result || 'goal',
                type: normalizedEvent.big_chance_type || normalizedEvent.big_chance_miss_type || 'shot',
                shotType:
                  normalizedEvent.big_chance_shot_type ||
                  groupEvents.find((event) =>
                    ['goal', 'shot_on', 'shot_off', 'shot_blocked'].includes(event.type),
                  )?.type,
                passType:
                  normalizedEvent.big_chance_pass_type ||
                  groupEvents.find((event) => ['pass_success', 'pass_fail'].includes(event.type))?.type,
                shotContext:
                  normalizedEvent.shot_context || groupEvents.find((event) => event.shot_context)?.shot_context,
                isHeader:
                  normalizedEvent.is_header ??
                  groupEvents.find((event) => typeof event.is_header === 'boolean')?.is_header,
                hitWoodwork:
                  normalizedEvent.hit_woodwork ??
                  groupEvents.find((event) => typeof event.hit_woodwork === 'boolean')?.hit_woodwork,
                goalSourceType: normalizedEvent.goal_source_type || 'open_play',
                assistPlayerId:
                  normalizedEvent.assist_player_id ||
                  groupEvents.find((event) => event.type === 'goal' && event.assist_player_id)?.assist_player_id ||
                  '',
                minute: normalizedEvent.minute,
                second: normalizedEvent.second,
                eventPeriod: normalizedEvent.event_period || resolveEventPeriod('', normalizedEvent.minute),
                side: normalizedEvent.side || 'our',
                goalConcededPlayerId:
                  groupEvents.find(
                    (event) => event.type === 'goal_conceded' && event.side === 'our' && event.player_id,
                  )?.player_id ||
                  liveGoalkeeperId ||
                  '',
                actionGroupId: normalizedEvent.action_group_id,
                primaryPoints:
                  (normalizedEvent.big_chance_result || 'goal') === 'miss'
                    ? EVENT_TYPE_POINTS.big_chance_missed ?? -2
                    : EVENT_TYPE_POINTS.big_chance_won ?? 0,
              })
            : isDangerousFoulGroup
            ? buildDangerousFoulActionPayloads({
                matchId: normalizedEvent.match_id,
                fouledPlayerId: normalizedEvent.player_id,
                takerPlayerId: normalizedEvent.set_piece_taker_id || normalizedEvent.player_id,
                zone: normalizedEvent.zone,
                setPieceAction: normalizedEvent.set_piece_action || 'cross',
                shotType: normalizedEvent.set_piece_shot_type || 'shot_on',
                shotContext: normalizedEvent.shot_context,
                isHeader: normalizedEvent.is_header,
                goalSourceType: normalizedEvent.goal_source_type || 'open_play',
                minute: normalizedEvent.minute,
                second: normalizedEvent.second,
                eventPeriod: normalizedEvent.event_period || resolveEventPeriod('', normalizedEvent.minute),
                side: normalizedEvent.side || 'our',
                actionGroupId: normalizedEvent.action_group_id,
                primaryPoints: normalizedEvent.points,
              })
            : isMirrorGroup
            ? (() => {
                const payloads = buildActionEventPayloads(normalizedEvent.type, baseRebuildPayload, {
                  groupId: normalizedEvent.action_group_id,
                  primaryPoints: normalizedEvent.points,
                });
                const anchorIndex = payloads.findIndex(
                  (payload) => !payload.is_derived && !payload.mirror_generated,
                );
                if (anchorIndex < 0) {
                  return payloads;
                }

                const mirrorDescriptor = buildMirrorDescriptor(normalizedEvent.type, {
                  mirrorRuleHint,
                });
                const anchorPayload = {
                  ...payloads[anchorIndex],
                  mirror_anchor: undefined,
                  mirror_rule: undefined,
                };

                if (mirrorDescriptor) {
                  anchorPayload.mirror_anchor = true;
                  anchorPayload.mirror_rule = mirrorDescriptor.rule;
                  if (mirrorDescriptor.shouldSwitchContext) {
                    const fallbackZone = ZONES.some((zone) => zone.id === normalizedEvent.auto_prev_zone)
                      ? normalizedEvent.auto_prev_zone
                      : DEFAULT_ZONE;
                    anchorPayload.auto_context_transition = true;
                    anchorPayload.auto_prev_side =
                      normalizedEvent.auto_prev_side === 'opponent' ? 'opponent' : 'our';
                    anchorPayload.auto_prev_zone = fallbackZone;
                  } else {
                    anchorPayload.auto_context_transition = undefined;
                    anchorPayload.auto_prev_side = undefined;
                    anchorPayload.auto_prev_zone = undefined;
                  }

                  if (mirrorDescriptor.mirrorType) {
                    const mirrorSide = getOppositeSide(anchorPayload.side);
                    const existingMirrorPlayerId =
                      groupEvents.find(
                        (event) =>
                          event.mirror_generated &&
                          event.side === mirrorSide &&
                          event.type === mirrorDescriptor.mirrorType,
                      )?.player_id || '';
                    const mirrorPlayerId =
                      MIRROR_GK_AUTO_EVENT_TYPES.has(mirrorDescriptor.mirrorType) && mirrorSide === 'our'
                        ? liveGoalkeeperId || ''
                        : mirrorSide === 'our'
                        ? existingMirrorPlayerId
                        : '';
                    payloads.push({
                      match_id: anchorPayload.match_id,
                      player_id: mirrorPlayerId,
                      zone:
                        mirrorDescriptor.mirrorZone === 'defense'
                          ? 'defense'
                          : anchorPayload.zone,
                      minute: anchorPayload.minute,
                      second: anchorPayload.second,
                      event_period: anchorPayload.event_period,
                      side: mirrorSide,
                      type: mirrorDescriptor.mirrorType,
                      points: EVENT_TYPE_POINTS[mirrorDescriptor.mirrorType] ?? 0,
                      action_group_id: anchorPayload.action_group_id,
                      is_derived: false,
                      source_action: normalizedEvent.type,
                      mirror_generated: true,
                      mirror_rule: mirrorDescriptor.rule,
                    });
                  }
                } else {
                  anchorPayload.auto_context_transition = undefined;
                  anchorPayload.auto_prev_side = undefined;
                  anchorPayload.auto_prev_zone = undefined;
                }

                payloads[anchorIndex] = anchorPayload;
                return payloads;
              })()
            : buildActionEventPayloads(
                normalizedEvent.type,
                baseRebuildPayload,
                {
                  groupId: normalizedEvent.action_group_id,
                  primaryPoints: normalizedEvent.points,
                },
              );

        const rebuiltEvents = [];
        for (const payload of rebuiltPayloads) {
          const savedEvent = await createEvent(payload);
          rebuiltEvents.push(savedEvent);
        }

        const nextPrimaryEvent = rebuiltEvents.find((event) => !event.is_derived) || rebuiltEvents[0];

        setEvents((currentEvents) =>
          sortEvents([...currentEvents.filter((event) => !idsToReplace.has(event.id)), ...rebuiltEvents]),
        );
        setAllEvents((currentEvents) => [
          ...currentEvents.filter((event) => !idsToReplace.has(event.id)),
          ...rebuiltEvents,
        ]);
        setSelectedEventId(nextPrimaryEvent?.id || '');
      } else if (DERIVED_EVENT_TYPES[normalizedEvent.type]) {
        await deleteEvent(normalizedEvent.id);

        const rebuiltPayloads = buildActionEventPayloads(
          normalizedEvent.type,
          {
            match_id: normalizedEvent.match_id,
            player_id: normalizedEvent.player_id,
            zone: normalizedEvent.zone,
            minute: normalizedEvent.minute,
            second: normalizedEvent.second,
            event_period: normalizedEvent.event_period || resolveEventPeriod('', normalizedEvent.minute),
            side: normalizedEvent.side,
            shot_context: normalizedEvent.shot_context,
            is_header: normalizedEvent.is_header,
            hit_woodwork: normalizedEvent.hit_woodwork,
            player_out_id: normalizedEvent.player_out_id,
            player_in_id: normalizedEvent.player_in_id,
            auto_context_transition: normalizedEvent.auto_context_transition,
            auto_prev_side: normalizedEvent.auto_prev_side,
            auto_prev_zone: normalizedEvent.auto_prev_zone,
          },
          {
            primaryPoints: normalizedEvent.points,
          },
        );

        const rebuiltEvents = [];
        for (const payload of rebuiltPayloads) {
          const savedEvent = await createEvent(payload);
          rebuiltEvents.push(savedEvent);
        }

        const nextPrimaryEvent = rebuiltEvents.find((event) => !event.is_derived) || rebuiltEvents[0];

        setEvents((currentEvents) =>
          sortEvents([...currentEvents.filter((event) => event.id !== normalizedEvent.id), ...rebuiltEvents]),
        );
        setAllEvents((currentEvents) => [
          ...currentEvents.filter((event) => event.id !== normalizedEvent.id),
          ...rebuiltEvents,
        ]);
        setSelectedEventId(nextPrimaryEvent?.id || '');
      } else {
        const savedEditedEvent = await saveEvent(normalizedEvent);
        setEvents((currentEvents) =>
          sortEvents(currentEvents.map((event) => (event.id === savedEditedEvent.id ? savedEditedEvent : event))),
        );
        setAllEvents((currentEvents) =>
          currentEvents.map((event) => (event.id === savedEditedEvent.id ? savedEditedEvent : event)),
        );
        setSelectedEventId(savedEditedEvent.id);
      }

      setEditingEvent(null);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save event changes');
    }
  };

  const isEditingShotOutcome = Boolean(editingEvent && SHOT_OUTCOME_TYPES.has(editingEvent.type));
  const effectiveShotDialogType = shotOutcomeSelectable ? shotOutcomeInput : pendingShotType;
  const isGoalInShotDialog = effectiveShotDialogType === 'goal';
  const isShotOffInShotDialog = effectiveShotDialogType === 'shot_off';
  const isOurGoalInShotDialog = isGoalInShotDialog && pendingShotSide !== 'opponent';
  const requiresAssistInShotDialog = isOurGoalInShotDialog && shotGoalSourceTypeInput !== 'own_goal';

  if (!ready) {
    return (
      <Box className="page-shell" sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="primary" />
          <Typography variant="body1" color="text.secondary">
            Loading football tracker...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="page-shell">
      <Container maxWidth={false} sx={{ py: 1.5, px: { xs: 1, md: 2 } }}>
        <Paper className="panel-enter" sx={{ mb: 1.5, px: 0.6 }}>
          <Tabs
            value={uiView}
            onChange={(_, nextView) => setUiView(nextView)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab value="live" label="Live" />
            <Tab value="stats" label="Stats" />
            <Tab value="team" label="Team" />
          </Tabs>
        </Paper>

        {uiView === 'live' ? (
          <>
        <Box className="panel-enter" sx={{ position: 'sticky', top: 10, zIndex: 15, mb: 2 }}>
          <Paper
            sx={{
              p: { xs: 0.75, md: 0.9 },
              backgroundColor: 'rgba(251, 253, 249, 0.94)',
              borderColor: LIVE_UI_TOKENS.border,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 24px rgba(25, 46, 34, 0.12)',
              color: LIVE_UI_TOKENS.textPrimary,
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gap: 0.8,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(260px, 1fr) minmax(240px, 1fr)',
                  lg: 'minmax(240px, 1fr) minmax(220px, 1fr) minmax(260px, 1fr) minmax(260px, 1fr)',
                },
                gridTemplateAreas: {
                  xs: '"timer" "context" "control" "players"',
                  md: '"timer context" "control players"',
                  lg: '"timer context control players"',
                },
                alignItems: 'start',
              }}
            >
              <Stack spacing={0.6} sx={{ gridArea: 'timer' }}>
                <Typography variant="subtitle2" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>Match Timer</Typography>
                {timerEditMode ? (
                  <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
                    <TextField
                      size="small"
                      label="Min"
                      type="number"
                      inputProps={{ min: 0 }}
                      value={timerMinuteInput}
                      onChange={(event) => setTimerMinuteInput(event.target.value)}
                      sx={{
                        maxWidth: 84,
                        '& .MuiInputLabel-root': { color: LIVE_UI_TOKENS.textSecondary },
                        '& .MuiOutlinedInput-root': {
                          color: LIVE_UI_TOKENS.textPrimary,
                          backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                          '& fieldset': { borderColor: LIVE_UI_TOKENS.border },
                        },
                      }}
                    />
                    <TextField
                      size="small"
                      label="Sec"
                      type="number"
                      inputProps={{ min: 0, max: 59 }}
                      value={timerSecondInput}
                      onChange={(event) => setTimerSecondInput(event.target.value)}
                      sx={{
                        maxWidth: 84,
                        '& .MuiInputLabel-root': { color: LIVE_UI_TOKENS.textSecondary },
                        '& .MuiOutlinedInput-root': {
                          color: LIVE_UI_TOKENS.textPrimary,
                          backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                          '& fieldset': { borderColor: LIVE_UI_TOKENS.border },
                        },
                      }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleApplyTimerEdit}
                      sx={{ backgroundColor: LIVE_UI_TOKENS.accentGreen, '&:hover': { backgroundColor: '#239556' } }}
                    >
                      Apply
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCancelTimerEditor}
                      sx={{
                        borderColor: LIVE_UI_TOKENS.border,
                        color: LIVE_UI_TOKENS.textPrimary,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                        '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                ) : (
                  <Typography
                    variant="h5"
                    onDoubleClick={handleOpenTimerEditor}
                    title="Double-click to edit timer"
                    sx={{ userSelect: 'none', cursor: 'pointer', lineHeight: 1.1, color: LIVE_UI_TOKENS.textPrimary }}
                  >
                    {formatClock(elapsedSeconds, matchPhase)}
                  </Typography>
                )}

                {matchPhase === MATCH_PHASES.firstHalf ? (
                  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleStartTimer}
                      disabled={!activeMatch || timerRunning}
                      sx={{ backgroundColor: LIVE_UI_TOKENS.accentGreen, '&:hover': { backgroundColor: '#239556' } }}
                    >
                      Start 1st Half
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleToggleTimer}
                      disabled={!activeMatch}
                      sx={{
                        borderColor: LIVE_UI_TOKENS.border,
                        color: LIVE_UI_TOKENS.textPrimary,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                        '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                      }}
                    >
                      {timerRunning ? 'Pause (Space)' : 'Resume (Space)'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void handleEndFirstHalf()}
                      disabled={!activeMatch || !isDraftMatch}
                      sx={{
                        borderColor: LIVE_UI_TOKENS.border,
                        color: LIVE_UI_TOKENS.textPrimary,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                        '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                      }}
                    >
                      End 1st Half
                    </Button>
                  </Stack>
                ) : null}

                {matchPhase === MATCH_PHASES.secondHalf ? (
                  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleToggleTimer}
                      disabled={!activeMatch}
                      sx={{
                        borderColor: LIVE_UI_TOKENS.border,
                        color: LIVE_UI_TOKENS.textPrimary,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                        '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                      }}
                    >
                      {timerRunning ? 'Pause (Space)' : 'Resume (Space)'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={() => void handleEndMatch()}
                      disabled={!activeMatch || !isDraftMatch || !canCompleteMatch}
                      sx={{
                        borderColor: LIVE_UI_TOKENS.danger,
                        color: LIVE_UI_TOKENS.danger,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                        '&:hover': { borderColor: '#ff8b83', backgroundColor: 'rgba(208, 93, 83, 0.12)' },
                      }}
                    >
                      End Match
                    </Button>
                  </Stack>
                ) : null}

                {matchPhase === MATCH_PHASES.halfTime ? (
                  <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => void handleStartSecondHalf()}
                      disabled={!activeMatch || !isDraftMatch}
                      sx={{ backgroundColor: LIVE_UI_TOKENS.accentGreen, '&:hover': { backgroundColor: '#239556' } }}
                    >
                      Start 2nd Half
                    </Button>
                    <Typography variant="caption" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>
                      Half-time
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>

              <Stack spacing={0.45} sx={{ gridArea: 'context' }}>
                <Typography variant="subtitle2" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>Live Context</Typography>
                <Stack direction="row" spacing={0.45} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={liveEventSide === 'our' ? 'Our' : 'Opp'}
                    sx={{
                      backgroundColor: liveEventSide === 'our' ? 'rgba(47, 179, 106, 0.16)' : 'rgba(245, 176, 75, 0.18)',
                      color: liveEventSide === 'our' ? LIVE_UI_TOKENS.accentGreen : LIVE_UI_TOKENS.accentAmber,
                      border: `1px solid ${liveEventSide === 'our' ? 'rgba(47, 179, 106, 0.4)' : 'rgba(245, 176, 75, 0.42)'}`,
                    }}
                  />
                  <Chip
                    size="small"
                    label={`Zone ${ZONES.find((zone) => zone.id === selectedZone)?.label ?? '-'}`}
                    sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textPrimary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                  />
                  <Chip
                    size="small"
                    label={`Poss Our ${livePossession.ourPct}% • Opp ${livePossession.oppPct}%`}
                    sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textPrimary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                  />
                  <Chip
                    size="small"
                    label={`Phase ${matchPhase.replace('_', ' ')}`}
                    sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textSecondary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                  />
                  <Chip
                    size="small"
                    label={`Status ${activeMatch?.status ?? '-'}`}
                    sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textSecondary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                  />
                  <Chip
                    size="small"
                    label={`XI ${liveStarterSlots.filter((slot) => slot.player_id).length}/11`}
                    sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textSecondary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                  />
                  <Chip
                    size="small"
                    label={`Subs ${substitutionCount}/${MAX_SUBSTITUTIONS_PER_MATCH}`}
                    sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textSecondary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                  />
                </Stack>
              </Stack>

              <Stack spacing={0.5} sx={{ gridArea: 'control' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>Match Control</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setMatchControlDialogOpen(true)}
                    sx={{
                      borderColor: LIVE_UI_TOKENS.border,
                      color: LIVE_UI_TOKENS.textPrimary,
                      backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                      '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                    }}
                  >
                    Edit
                  </Button>
                </Stack>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 0.75,
                    borderRadius: 2,
                    borderColor: LIVE_UI_TOKENS.border,
                    backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, color: LIVE_UI_TOKENS.textPrimary }}>
                    {matchDateInput || '-'} • {selectedCompetition ? `${selectedCompetition.type === 'cup' ? 'Cup' : 'League'} • ${selectedCompetition.name}` : 'Unassigned'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>
                    {competitionRoundLabel}: {competitionRoundInput || '-'} • Opponent: {selectedOpponent?.name || activeMatch?.opponent || 'TBD'} • Opp Fm: {opponentFormationInput || DEFAULT_FORMATION}
                  </Typography>
                </Paper>
              </Stack>

              <Stack spacing={0.45} sx={{ gridArea: 'players' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>Players</Typography>
                  <Stack direction="row" spacing={0.45} alignItems="center">
                    <Chip
                      size="small"
                      label={`${liveStarterSlots.filter((slot) => slot.player_id).length}/11 XI`}
                      sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textPrimary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        display: { xs: 'inline-flex', md: 'none' },
                        borderColor: LIVE_UI_TOKENS.border,
                        color: LIVE_UI_TOKENS.textPrimary,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                        '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                      }}
                      onClick={() => setPlayersHeaderExpanded((current) => !current)}
                      color="inherit"
                    >
                      {playersHeaderExpanded ? 'Hide' : 'Show'}
                    </Button>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    display: {
                      xs: !hasStartingLineup || playersHeaderExpanded ? 'grid' : 'none',
                      md: 'grid',
                    },
                    gap: 0.55,
                  }}
                >
                  {!hasStartingLineup ? (
                    <Alert severity="info" sx={{ py: 0.35, bgcolor: 'rgba(47, 179, 106, 0.12)', border: `1px solid ${LIVE_UI_TOKENS.border}`, color: LIVE_UI_TOKENS.textPrimary }}>
                      <Stack spacing={0.55}>
                        <Typography variant="body2">Set up First XI to continue player-based capture.</Typography>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SportsSoccerRoundedIcon />}
                          onClick={() => handleOpenLineupSetup(false)}
                          sx={{ width: 'fit-content', backgroundColor: LIVE_UI_TOKENS.accentGreen, '&:hover': { backgroundColor: '#239556' } }}
                        >
                          Open Lineup Setup
                        </Button>
                      </Stack>
                    </Alert>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 0.65,
                        display: 'grid',
                        gap: 0.55,
                        borderColor: LIVE_UI_TOKENS.border,
                        backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                      }}
                    >
                      <Stack direction="row" spacing={0.45} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label="XI Ready" sx={{ backgroundColor: 'rgba(47, 179, 106, 0.16)', color: LIVE_UI_TOKENS.accentGreen, border: '1px solid rgba(47, 179, 106, 0.4)' }} />
                        <Chip size="small" label={`Bench ${benchPlayers.length}`} sx={{ backgroundColor: LIVE_UI_TOKENS.surface, color: LIVE_UI_TOKENS.textSecondary, border: `1px solid ${LIVE_UI_TOKENS.border}` }} />
                        <Chip size="small" label={lineupFormation} sx={{ backgroundColor: LIVE_UI_TOKENS.surface, color: LIVE_UI_TOKENS.textSecondary, border: `1px solid ${LIVE_UI_TOKENS.border}` }} />
                      </Stack>

                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        {playersById[selectedPlayerId]?.photo_data_url ? (
                          <Avatar
                            src={playersById[selectedPlayerId]?.photo_data_url || undefined}
                            alt={playersById[selectedPlayerId]?.name || 'Selected player'}
                            sx={{ width: 20, height: 20 }}
                          />
                        ) : null}
                        <Chip
                          size="small"
                          label={playersById[selectedPlayerId]?.name || 'Team Event'}
                          sx={{ backgroundColor: LIVE_UI_TOKENS.surface, color: LIVE_UI_TOKENS.textPrimary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                        />
                      </Stack>

                      <Stack direction="row" spacing={0.45} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SportsSoccerRoundedIcon />}
                          onClick={() => handleOpenLineupSetup(false)}
                          sx={{
                            borderColor: LIVE_UI_TOKENS.border,
                            color: LIVE_UI_TOKENS.textPrimary,
                            backgroundColor: LIVE_UI_TOKENS.surface,
                            '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                          }}
                        >
                          Edit Lineup
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setPlayerPickerDialogOpen(true)}
                          disabled={liveEventSide === 'opponent'}
                          sx={{
                            borderColor: LIVE_UI_TOKENS.border,
                            color: LIVE_UI_TOKENS.textPrimary,
                            backgroundColor: LIVE_UI_TOKENS.surface,
                            '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                          }}
                        >
                          Select Player
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => setSelectedPlayerId('')}
                          disabled={liveEventSide === 'opponent' || !selectedPlayerId}
                          sx={{
                            borderColor: LIVE_UI_TOKENS.border,
                            color: LIVE_UI_TOKENS.textSecondary,
                            backgroundColor: LIVE_UI_TOKENS.surface,
                            '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
                          }}
                        >
                          Clear
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Box>

        {errorMessage ? (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              bgcolor: 'rgba(232, 106, 97, 0.14)',
              border: `1px solid ${LIVE_UI_TOKENS.danger}`,
              color: LIVE_UI_TOKENS.textPrimary,
            }}
          >
            {errorMessage}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gap: 1.1,
            alignItems: 'start',
            gridTemplateAreas: { xs: '"controls" "events"', lg: '"controls events"' },
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2.35fr) 340px', xl: 'minmax(0, 2.6fr) 360px' },
          }}
        >
          <Paper
            className="panel-enter panel-enter-delay-2"
            sx={{
              gridArea: 'controls',
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.85,
              backgroundColor: LIVE_UI_TOKENS.surface,
              borderColor: LIVE_UI_TOKENS.border,
              color: LIVE_UI_TOKENS.textPrimary,
              boxShadow: '0 10px 22px rgba(25, 46, 34, 0.12)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={0.8} alignItems="center">
                <KeyboardRoundedIcon fontSize="small" sx={{ color: LIVE_UI_TOKENS.accentGreen }} />
                <Typography variant="h6" sx={{ color: LIVE_UI_TOKENS.textPrimary }}>Match Actions</Typography>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Chip
                  label={ZONES.find((zone) => zone.id === selectedZone)?.label || '-'}
                  size="small"
                  sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textPrimary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
                />
                <Chip
                  label={`${liveEventSide === 'our' ? 'Our Team' : 'Opponent'} (Tab)`}
                  size="small"
                  sx={{
                    backgroundColor: liveEventSide === 'our' ? 'rgba(47, 179, 106, 0.14)' : 'rgba(245, 176, 75, 0.16)',
                    color: liveEventSide === 'our' ? LIVE_UI_TOKENS.accentGreen : LIVE_UI_TOKENS.accentAmber,
                    border: `1px solid ${liveEventSide === 'our' ? 'rgba(47, 179, 106, 0.45)' : 'rgba(245, 176, 75, 0.45)'}`,
                  }}
                />
              </Stack>
            </Stack>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              {EVENT_SIDE_OPTIONS.map((sideOption) => (
                <Button
                  key={sideOption.id}
                  size="small"
                  variant="outlined"
                  onClick={() => setLiveEventSide(sideOption.id)}
                  sx={{
                    borderColor:
                      liveEventSide === sideOption.id
                        ? sideOption.id === 'our'
                          ? LIVE_UI_TOKENS.accentGreen
                          : LIVE_UI_TOKENS.accentAmber
                        : LIVE_UI_TOKENS.border,
                    color:
                      liveEventSide === sideOption.id
                        ? sideOption.id === 'our'
                          ? LIVE_UI_TOKENS.accentGreen
                          : LIVE_UI_TOKENS.accentAmber
                        : LIVE_UI_TOKENS.textPrimary,
                    backgroundColor:
                      liveEventSide === sideOption.id
                        ? sideOption.id === 'our'
                          ? 'rgba(47, 179, 106, 0.14)'
                          : 'rgba(245, 176, 75, 0.16)'
                        : LIVE_UI_TOKENS.surfaceAlt,
                    '&:hover': {
                      borderColor: sideOption.id === 'our' ? LIVE_UI_TOKENS.accentGreen : LIVE_UI_TOKENS.accentAmber,
                      backgroundColor: sideOption.id === 'our' ? 'rgba(47, 179, 106, 0.2)' : 'rgba(245, 176, 75, 0.23)',
                    },
                  }}
                >
                  {sideOption.label}
                </Button>
              ))}
            </Stack>

            <Paper
              variant="outlined"
              sx={{
                p: 0.35,
                borderRadius: 2,
                borderColor: LIVE_UI_TOKENS.border,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 1.2,
                  overflow: 'hidden',
                  border: `1px solid ${LIVE_UI_TOKENS.border}`,
                  background:
                    'linear-gradient(90deg, #eef5ea 0%, #e7f0e3 48%, #eff6ec 100%)',
                }}
              >
                <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, bgcolor: 'rgba(47, 179, 106, 0.25)' }} />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: 0.25,
                    p: 0.25,
                  }}
                >
                  {zoneSelectorOptions.map((zone) => (
                    <Button
                      key={`zone-pitch-${zone.id}`}
                      size="small"
                      variant={selectedZone === zone.id ? 'contained' : 'outlined'}
                      onClick={() => setSelectedZone(zone.id)}
                      sx={{
                        minHeight: 28,
                        border: '1px solid',
                        borderColor: selectedZone === zone.id ? LIVE_UI_TOKENS.accentGreen : LIVE_UI_TOKENS.border,
                        color: selectedZone === zone.id ? '#f6fbf7' : LIVE_UI_TOKENS.textSecondary,
                        backgroundColor: selectedZone === zone.id ? LIVE_UI_TOKENS.accentGreen : '#edf4ea',
                        '&:hover': {
                          borderColor: selectedZone === zone.id ? LIVE_UI_TOKENS.accentGreen : '#3a5147',
                          backgroundColor: selectedZone === zone.id ? '#34c274' : '#e4efe0',
                        },
                      }}
                    >
                      {zone.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Paper>

            <Divider sx={{ borderColor: LIVE_UI_TOKENS.border }} />

            <Stack spacing={0.75}>
              {quickActionRows.map((row, rowIndex) => (
                <Box
                  key={`quick-row-${rowIndex}`}
                  sx={{
                    display: 'grid',
                    gap: 0.6,
                    gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))`,
                  }}
                >
                  {row.map((item) => {
                    const substitutionDisabled =
                      item.eventType === 'substitution' &&
                      (!canAddSubstitution || !substitutionOutPlayers.length || !substitutionInPlayers.length);
                    return (
                      <Button
                        key={item.key}
                        size="small"
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          void handleCreateQuickEvent(item.eventType);
                        }}
                        disabled={!activeMatch || !isDraftMatch || !canCreateEvent || substitutionDisabled}
                        sx={{
                          minHeight: 32,
                          px: 0.7,
                          borderRadius: 1.5,
                          borderColor: LIVE_UI_TOKENS.border,
                          color: LIVE_UI_TOKENS.textPrimary,
                          backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                          '&:hover': {
                            borderColor: LIVE_UI_TOKENS.accentGreen,
                            backgroundColor: 'rgba(47, 179, 106, 0.12)',
                          },
                        }}
                      >
                        {item.hotkey ? `${item.hotkey} • ` : ''}
                        {item.label}
                      </Button>
                    );
                  })}
                </Box>
              ))}
            </Stack>

          </Paper>

          <Paper
            className="panel-enter panel-enter-delay-3"
            sx={{
              gridArea: 'events',
              p: 1,
              minHeight: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.85,
              backgroundColor: LIVE_UI_TOKENS.surface,
              borderColor: LIVE_UI_TOKENS.border,
              color: LIVE_UI_TOKENS.textPrimary,
              boxShadow: '0 10px 22px rgba(25, 46, 34, 0.12)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={0.8} alignItems="center">
                <SportsSoccerRoundedIcon sx={{ color: LIVE_UI_TOKENS.accentGreen }} fontSize="small" />
                <Typography variant="h6" sx={{ color: LIVE_UI_TOKENS.textPrimary }}>Event Feed</Typography>
              </Stack>
              <Chip
                label={eventFeedCountLabel}
                size="small"
                sx={{ backgroundColor: LIVE_UI_TOKENS.surfaceAlt, color: LIVE_UI_TOKENS.textPrimary, border: `1px solid ${LIVE_UI_TOKENS.border}` }}
              />
            </Stack>

            <Stack spacing={0.6}>
              <Stack direction="row" spacing={0.45} flexWrap="wrap" useFlexGap>
                {FEED_SIDE_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={`feed-side-filter-${option.id}`}
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setUiState((current) => ({
                        ...current,
                        feedFilter: option.id,
                      }))
                    }
                    sx={{
                      borderColor:
                        uiState.feedFilter === option.id
                          ? option.id === 'opponent'
                            ? LIVE_UI_TOKENS.accentAmber
                            : LIVE_UI_TOKENS.accentGreen
                          : LIVE_UI_TOKENS.border,
                      color:
                        uiState.feedFilter === option.id
                          ? option.id === 'opponent'
                            ? LIVE_UI_TOKENS.accentAmber
                            : LIVE_UI_TOKENS.accentGreen
                          : LIVE_UI_TOKENS.textSecondary,
                      backgroundColor:
                        uiState.feedFilter === option.id
                          ? option.id === 'opponent'
                            ? 'rgba(245, 176, 75, 0.16)'
                            : 'rgba(47, 179, 106, 0.13)'
                          : LIVE_UI_TOKENS.surfaceAlt,
                      '&:hover': {
                        borderColor: option.id === 'opponent' ? LIVE_UI_TOKENS.accentAmber : LIVE_UI_TOKENS.accentGreen,
                        backgroundColor: option.id === 'opponent' ? 'rgba(245, 176, 75, 0.24)' : 'rgba(47, 179, 106, 0.18)',
                      },
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Stack>
            </Stack>

            <Box
              className="event-scroll"
              sx={{
                display: 'grid',
                gap: 0.4,
                overflowY: 'auto',
                pr: 0.4,
                maxHeight: { xs: 380, md: 'calc(100vh - 360px)' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(47, 179, 106, 0.42)' },
                '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(47, 179, 106, 0.08)' },
              }}
            >
              {filteredEventViewModels.map((eventView) => {
                const sourceEvent = eventById[eventView.id];
                const pointValue = sourceEvent?.points ?? 0;
                const isOpponentEvent = sourceEvent?.side === 'opponent';

                return (
                  <Paper
                    key={eventView.id}
                    variant="outlined"
                    onClick={() => setSelectedEventId(eventView.id)}
                    sx={{
                      cursor: 'pointer',
                      borderColor: eventView.isSelected ? LIVE_UI_TOKENS.accentGreen : LIVE_UI_TOKENS.border,
                      bgcolor: eventView.isSelected ? 'rgba(224, 241, 232, 0.96)' : 'rgba(248, 252, 247, 0.92)',
                      transition: 'all 120ms ease',
                      px: 0.7,
                      py: 0.4,
                      borderRadius: 3,
                      '&:hover': { borderColor: LIVE_UI_TOKENS.accentGreen, bgcolor: 'rgba(238, 247, 241, 0.96)' },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '54px 1fr auto auto',
                        alignItems: 'center',
                        columnGap: 0.5,
                        minHeight: 30,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: LIVE_UI_TOKENS.textSecondary, fontSize: 11 }}>
                        {eventView.clockLabel}
                      </Typography>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: isOpponentEvent ? LIVE_UI_TOKENS.accentAmber : LIVE_UI_TOKENS.accentGreen,
                            flexShrink: 0,
                          }}
                        />
                        <Typography sx={{ fontSize: 12.1, lineHeight: 1.2, color: LIVE_UI_TOKENS.textPrimary }} noWrap>
                          {eventView.eventLabel}
                        </Typography>
                      </Stack>

                      <Chip
                        label={eventView.pointsLabel}
                        size="small"
                        sx={{
                          height: 21,
                          color: pointValue >= 0 ? LIVE_UI_TOKENS.accentGreen : LIVE_UI_TOKENS.danger,
                          backgroundColor: pointValue >= 0 ? 'rgba(47, 179, 106, 0.16)' : 'rgba(232, 106, 97, 0.14)',
                          border: `1px solid ${pointValue >= 0 ? 'rgba(47, 179, 106, 0.44)' : 'rgba(232, 106, 97, 0.44)'}`,
                          '& .MuiChip-label': { px: 0.72, fontSize: 11, fontWeight: 700 },
                        }}
                      />

                      <Stack direction="row" spacing={0.05} alignItems="center">
                        <IconButton
                          size="small"
                          onClick={(buttonEvent) => {
                            buttonEvent.stopPropagation();
                            if (!canEditEvent || !sourceEvent) return;
                            const editableEvent = resolveEditableEvent(sourceEvent);
                            if (!editableEvent) return;
                            setSelectedEventId(editableEvent.id);
                            setEditingEvent({ ...editableEvent });
                          }}
                          aria-label="Edit event"
                          sx={{ color: LIVE_UI_TOKENS.textSecondary }}
                        >
                          <EditRoundedIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(buttonEvent) => {
                            buttonEvent.stopPropagation();
                            void handleDeleteEvent(eventView.id);
                          }}
                          disabled={!canDeleteEvent}
                          aria-label="Delete event"
                          sx={{ color: LIVE_UI_TOKENS.danger }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="inherit" />
                        </IconButton>
                      </Stack>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 0.3, pl: 0.1 }}
                    >
                      <Chip
                        size="small"
                        label={eventView.playerLabel || 'Unassigned'}
                        sx={{
                          height: 19,
                          backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                          color: LIVE_UI_TOKENS.textSecondary,
                          border: `1px solid ${LIVE_UI_TOKENS.border}`,
                          '& .MuiChip-label': { px: 0.67, fontSize: 10.5 },
                        }}
                      />
                      <Chip
                        size="small"
                        label={eventView.sideLabel}
                        sx={{
                          height: 19,
                          backgroundColor: isOpponentEvent ? 'rgba(245, 176, 75, 0.13)' : 'rgba(47, 179, 106, 0.13)',
                          color: isOpponentEvent ? LIVE_UI_TOKENS.accentAmber : LIVE_UI_TOKENS.accentGreen,
                          border: `1px solid ${isOpponentEvent ? 'rgba(245, 176, 75, 0.42)' : 'rgba(47, 179, 106, 0.42)'}`,
                          '& .MuiChip-label': { px: 0.67, fontSize: 10.5 },
                        }}
                      />
                      <Chip
                        size="small"
                        label={eventView.zoneLabel}
                        sx={{
                          height: 19,
                          backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                          color: LIVE_UI_TOKENS.textSecondary,
                          border: `1px solid ${LIVE_UI_TOKENS.border}`,
                          '& .MuiChip-label': { px: 0.67, fontSize: 10.5 },
                        }}
                      />
                    </Stack>
                  </Paper>
                );
              })}
            </Box>

            <Accordion
              expanded={uiState.attributionExpanded}
              onChange={(_, expanded) =>
                setUiState((current) => ({
                  ...current,
                  attributionExpanded: expanded,
                }))
              }
              disableGutters
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: LIVE_UI_TOKENS.border,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 0.8 }}>
                  <Typography variant="subtitle2" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>
                    Attribution Queue (Key Events)
                  </Typography>
                  <Chip
                    size="small"
                    label={attributionQueueEvents.length}
                    sx={{
                      backgroundColor: attributionQueueEvents.length ? 'rgba(245, 176, 75, 0.16)' : 'rgba(47, 179, 106, 0.16)',
                      color: attributionQueueEvents.length ? LIVE_UI_TOKENS.accentAmber : LIVE_UI_TOKENS.accentGreen,
                      border: `1px solid ${attributionQueueEvents.length ? 'rgba(245, 176, 75, 0.42)' : 'rgba(47, 179, 106, 0.42)'}`,
                    }}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {!attributionQueueEvents.length ? (
                  <Typography variant="body2" sx={{ color: LIVE_UI_TOKENS.textSecondary }}>
                    No key events waiting for player attribution.
                  </Typography>
                ) : (
                  <Stack spacing={0.7}>
                    {attributionQueueEvents.slice(0, 8).map((event) => (
                      <Stack key={`attr-${event.id}`} direction={{ xs: 'column', md: 'row' }} spacing={0.7}>
                        <Typography variant="body2" sx={{ flex: 1, color: LIVE_UI_TOKENS.textPrimary }}>
                          {String(event.minute).padStart(2, '0')}:{String(event.second).padStart(2, '0')} - {EVENT_TYPE_LABELS[event.type] || event.type}
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel id={`attr-player-${event.id}`}>Assign Player</InputLabel>
                          <Select
                            labelId={`attr-player-${event.id}`}
                            label="Assign Player"
                            value=""
                            onChange={(selectEvent) => {
                              void handleAssignEventPlayer(event.id, selectEvent.target.value);
                            }}
                          >
                            <MenuItem value="">
                              <em>Select</em>
                            </MenuItem>
                            {players.map((player) => (
                              <MenuItem key={`attr-${event.id}-${player.id}`} value={player.id}>
                                {player.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Box>
          </>
        ) : uiView === 'stats' ? (
          <StatsView
            matches={matches}
            players={players}
            allEvents={allEvents}
            lineupsByMatch={lineupsByMatch}
            activeMatchId={activeMatchId}
            activeMatchElapsedSeconds={elapsedSeconds}
            statsScope={effectiveStatsScope}
            onStatsScopeChange={setStatsScope}
            teamName={teamProfile.name || DEFAULT_TEAM_PROFILE.name}
            teamLogoUrl={teamProfile.logo_url || ''}
          />
        ) : (
          <TeamView
            teamProfile={teamProfile}
            matches={matches}
            players={players}
            allEvents={allEvents}
            lineupsByMatch={lineupsByMatch}
            competitions={competitions}
            opponents={opponents}
            teamScope={teamScope}
            onTeamScopeChange={setTeamScope}
            onSaveTeamProfile={handleSaveTeamProfile}
            onCreatePlayer={handleCreateTeamPlayer}
            onUpdatePlayer={handleUpdateTeamPlayer}
            onTogglePlayerActive={handleToggleTeamPlayerActive}
            onCreateOpponent={handleCreateTeamOpponent}
            onUpdateOpponent={handleUpdateTeamOpponent}
            onToggleOpponentActive={handleToggleTeamOpponentActive}
            onUpdateCompetition={handleUpdateTeamCompetition}
            onDownloadBackup={handleDownloadDataBackup}
            onImportBackup={handleImportDataBackup}
            dataSafetyStatus={dataSafetyStatus}
            blockedDeactivatePlayerIds={activeMatchLineupPlayerIds}
          />
        )}

        <Dialog open={matchControlDialogOpen} onClose={() => setMatchControlDialogOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>Match Control</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 1, pt: 0.8 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="match-select-label">Active Match</InputLabel>
              <Select
                labelId="match-select-label"
                label="Active Match"
                value={activeMatchId}
                onChange={(event) => {
                  void handleMatchSelection(event.target.value);
                }}
              >
                {matches.map((match) => {
                  const competitionName = match.competition_name || normalizeSeasonTag(match.season_tag) || 'Unassigned';
                  const competitionType = match.competition_type
                    ? `${match.competition_type === 'cup' ? 'Cup' : 'League'} • `
                    : '';
                  return (
                    <MenuItem key={match.id} value={match.id}>
                      {match.date} • {competitionType}{competitionName} • {match.opponent || 'TBD'} ({match.status})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
              <TextField
                label="Date"
                type="date"
                size="small"
                value={matchDateInput}
                onChange={(event) => setMatchDateInput(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth size="small">
                <InputLabel id="competition-select-label">Competition</InputLabel>
                <Select
                  labelId="competition-select-label"
                  label="Competition"
                  value={competitionIdInput}
                  onChange={(event) => handleCompetitionSelectionChange(event.target.value)}
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {competitions.map((competition) => (
                    <MenuItem key={competition.id} value={competition.id}>
                      {competition.type === 'cup' ? 'Cup' : 'League'} • {competition.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={() => setCompetitionDialogOpen(true)}
              >
                New Competition
              </Button>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
              <TextField
                size="small"
                type="number"
                label={competitionRoundLabel}
                inputProps={{ min: 1 }}
                value={competitionRoundInput}
                onChange={(event) => setCompetitionRoundInput(event.target.value)}
              />
              <FormControl fullWidth size="small">
                <InputLabel id="opponent-select-label">Opponent</InputLabel>
                <Select
                  labelId="opponent-select-label"
                  label="Opponent"
                  value={opponentIdInput}
                  onChange={(event) => setOpponentIdInput(event.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Opponent</em>
                  </MenuItem>
                  {filteredOpponents.map((opponent) => (
                    <MenuItem key={opponent.id} value={opponent.id}>
                      {opponent.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="opponent-formation-select-label">Opponent Formation</InputLabel>
                <Select
                  labelId="opponent-formation-select-label"
                  label="Opponent Formation"
                  value={opponentFormationInput}
                  onChange={(event) => setOpponentFormationInput(event.target.value)}
                >
                  {Object.keys(FORMATION_LAYOUTS).map((formation) => (
                    <MenuItem key={formation} value={formation}>
                      {formation}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" startIcon={<SaveRoundedIcon />} onClick={handleSaveMatchInfo}>Save Info</Button>
              <Button variant="outlined" startIcon={<AddCircleRoundedIcon />} onClick={handleCreateDraftMatch}>New Draft</Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineRoundedIcon />}
                onClick={() => void handleDeleteActiveDraftMatch()}
                disabled={!activeMatch || activeMatch.status !== 'draft'}
              >
                Delete Draft
              </Button>
              <Button
                variant="outlined"
                startIcon={<SportsSoccerRoundedIcon />}
                onClick={() => {
                  setMatchControlDialogOpen(false);
                  handleOpenLineupSetup(false);
                }}
                disabled={!activeMatch}
              >
                Lineup Setup
              </Button>
              <Button
                variant={isDraftMatch ? 'outlined' : 'contained'}
                color="primary"
                startIcon={<CheckCircleOutlineRoundedIcon />}
                onClick={() => void handleReopenMatch()}
                disabled={!activeMatch || !canCompleteMatch || isDraftMatch}
              >
                Reopen Draft
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="outlined" onClick={() => setMatchControlDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={competitionDialogOpen} onClose={() => setCompetitionDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Create Competition</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 1, pt: 0.8 }}>
            <FormControl size="small">
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={newCompetitionTypeInput}
                onChange={(event) => setNewCompetitionTypeInput(event.target.value)}
              >
                <MenuItem value="league">League</MenuItem>
                <MenuItem value="cup">Cup</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Competition Name"
              value={newCompetitionNameInput}
              onChange={(event) => setNewCompetitionNameInput(event.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="outlined" onClick={() => setCompetitionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleCreateCompetition()}
              disabled={!String(newCompetitionNameInput || '').trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(pendingShotType)}
          onClose={handleCloseShotDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Shot Details</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Alert severity="info">
              {(EVENT_TYPE_LABELS[effectiveShotDialogType] || 'Shot')} requires shot details before saving.
            </Alert>

            {shotOutcomeSelectable ? (
              <Box sx={{ display: 'grid', gap: 0.55 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Shot Outcome
                </Typography>
                <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {shotOutcomeOptionsInput.map((option) => (
                    <Button
                      key={`shot-outcome-${option.id}`}
                      size="small"
                      variant={shotOutcomeInput === option.id ? 'contained' : 'outlined'}
                      onClick={() => {
                        setShotOutcomeInput(option.id);
                        const nextHitWoodwork = option.id === 'shot_off' ? shotHitWoodworkInput : false;
                        if (option.id !== 'shot_off') {
                          setShotHitWoodworkInput(false);
                        }
                        maybeSubmitShotFromInputs({ shotOutcome: option.id, hitWoodwork: nextHitWoodwork });
                      }}
                      disabled={isSubmittingShot}
                      sx={{ minHeight: 36, textTransform: 'none' }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            ) : null}

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Shot Location
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {SHOT_CONTEXT_OPTIONS.map((option) => (
                  <Button
                    key={`shot-location-${option.id}`}
                    size="small"
                    variant={shotContextInput === option.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      setShotContextInput(option.id);
                      maybeSubmitShotFromInputs({ shotContext: option.id });
                    }}
                    disabled={isSubmittingShot}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Header
              </Typography>
              <Stack direction="row" spacing={0.55}>
                <Button
                  size="small"
                  variant={!shotIsHeaderInput ? 'contained' : 'outlined'}
                  onClick={() => setShotIsHeaderInput(false)}
                  disabled={isSubmittingShot}
                  sx={{ minHeight: 34, minWidth: 64, textTransform: 'none' }}
                >
                  No
                </Button>
                <Button
                  size="small"
                  variant={shotIsHeaderInput ? 'contained' : 'outlined'}
                  onClick={() => setShotIsHeaderInput(true)}
                  disabled={isSubmittingShot}
                  sx={{ minHeight: 34, minWidth: 64, textTransform: 'none' }}
                >
                  Yes
                </Button>
              </Stack>
            </Box>

            {isShotOffInShotDialog ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shotHitWoodworkInput}
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      setShotHitWoodworkInput(nextChecked);
                      maybeSubmitShotFromInputs({ hitWoodwork: nextChecked });
                    }}
                    disabled={isSubmittingShot}
                  />
                }
                label={
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5 }}>
                    Hit the woodwork
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            ) : null}

            {isGoalInShotDialog ? (
              <Box sx={{ display: 'grid', gap: 0.55 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Goal Type
                </Typography>
                <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  {GOAL_SOURCE_TYPE_OPTIONS.map((option) => (
                    <Button
                      key={`goal-type-${option.id}`}
                      size="small"
                      variant={shotGoalSourceTypeInput === option.id ? 'contained' : 'outlined'}
                      onClick={() => {
                        setShotGoalSourceTypeInput(option.id);
                        maybeSubmitShotFromInputs({ goalSourceType: option.id });
                      }}
                      disabled={isSubmittingShot}
                      sx={{ minHeight: 36, textTransform: 'none' }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            ) : null}

            {requiresAssistInShotDialog ? (
              <Box sx={{ display: 'grid', gap: 0.55 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Assist
                </Typography>

                <Button
                  size="small"
                  variant={shotAssistPlayerIdInput === 'none' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setShotAssistPlayerIdInput('none');
                    maybeSubmitShotFromInputs({ assistPlayerId: 'none' });
                  }}
                  disabled={isSubmittingShot}
                  sx={{ minHeight: 34, textTransform: 'none' }}
                >
                  None
                </Button>

                <Stack spacing={0.6}>
                  {shotAssistPickerRows.map((row, rowIndex) => (
                    <Box
                      key={`shot-assist-row-${rowIndex}`}
                      sx={{
                        display: 'grid',
                        gap: 0.55,
                        gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.map((slot) => (
                        <Button
                          key={`shot-assist-player-${slot.player_id}`}
                          size="small"
                          variant={shotAssistPlayerIdInput === slot.player_id ? 'contained' : 'outlined'}
                          onClick={() => {
                            setShotAssistPlayerIdInput(slot.player_id);
                            maybeSubmitShotFromInputs({ assistPlayerId: slot.player_id });
                          }}
                          disabled={isSubmittingShot}
                          sx={{ minHeight: 36, p: 0.55, textTransform: 'none' }}
                        >
                          <Stack direction="row" spacing={0.55} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar
                              src={slot.player?.photo_data_url || undefined}
                              alt={slot.player?.name || slot.slot_label}
                              sx={{ width: 18, height: 18 }}
                            />
                            <Typography variant="caption" noWrap sx={{ fontSize: 11.2 }}>
                              {slot.player?.name || slot.slot_label}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseShotDialog}
              disabled={isSubmittingShot}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(pendingBallLossSide)}
          onClose={handleCloseBallLossDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Ball Loss Mirror</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Alert severity="info">
              Select opponent action for this ball loss.
            </Alert>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={pendingBallLossSide === 'opponent' ? 'Opponent' : 'Our Team'} />
              <Chip size="small" label={playersById[pendingBallLossPlayerId]?.name || 'Team Event'} />
            </Stack>

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Mirror Action
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {BALL_LOSS_MIRROR_OPTIONS.map((option) => (
                  <Button
                    key={`ball-loss-mirror-${option.id}`}
                    size="small"
                    variant={ballLossMirrorChoiceInput === option.id ? 'contained' : 'outlined'}
                    onClick={() => void handleConfirmBallLossEvent(option.id)}
                    disabled={isSubmittingBallLoss}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseBallLossDialog}
              disabled={isSubmittingBallLoss}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(pendingPlayerEventType)}
          onClose={handleCloseOurPlayerEventDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>
            {EVENT_TYPE_LABELS[pendingPlayerMirrorTargetType] ||
              EVENT_TYPE_LABELS[pendingPlayerEventType] ||
              'Event'}{' '}
            Player
          </DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Alert severity="info">
              Pick one on-pitch player. Selection continues automatically.
            </Alert>

            <Stack spacing={0.65}>
              {ourPlayerPickerRows.map((row, rowIndex) => (
                <Box
                  key={`our-player-row-${rowIndex}`}
                  sx={{
                    display: 'grid',
                    gap: 0.55,
                    gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                  }}
                >
                  {row.map((slot) => (
                    <Button
                      key={`our-event-player-${slot.slot_id}`}
                      size="small"
                      variant={pendingPlayerSelectionInput === slot.player_id ? 'contained' : 'outlined'}
                      onClick={() => void handleConfirmOurPlayerEvent(slot.player_id)}
                      disabled={isSubmittingPlayerPick}
                      sx={{ minHeight: 44, p: 0.55, textTransform: 'none', alignItems: 'stretch' }}
                    >
                      <Stack direction="row" spacing={0.55} alignItems="center" sx={{ minWidth: 0, width: '100%' }}>
                        <Avatar
                          src={slot.player?.photo_data_url || undefined}
                          alt={slot.player?.name || slot.slot_label}
                          sx={{ width: 20, height: 20 }}
                        />
                        <Stack spacing={0.05} sx={{ minWidth: 0, textAlign: 'left', width: '100%' }}>
                          <Typography variant="caption" noWrap sx={{ fontSize: 11.5 }}>
                            {slot.player?.name || slot.slot_label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {slot.slot_label}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Button>
                  ))}
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseOurPlayerEventDialog}
              disabled={isSubmittingPlayerPick}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={pendingBigChancePlayerId !== null}
          onClose={handleCloseBigChanceDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Big Chance Result</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Alert severity="info">
              Select result to continue.
            </Alert>

            <Chip size="small" label={playersById[pendingBigChancePlayerId]?.name || 'Team Event'} sx={{ width: 'fit-content' }} />

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Result
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {BIG_CHANCE_RESULT_OPTIONS.map((option) => (
                  <Button
                    key={`big-chance-result-${option.id}`}
                    size="small"
                    variant={bigChanceResultInput === option.id ? 'contained' : 'outlined'}
                    onClick={() => handleConfirmBigChanceResult(option.id)}
                    disabled={isSubmittingBigChanceStep}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseBigChanceDialog}
              disabled={isSubmittingBigChanceStep}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={pendingBigChanceMissPlayerId !== null}
          onClose={handleCloseBigChanceMissDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Big Chance Miss Details</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Miss Type
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {BIG_CHANCE_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={`big-chance-type-${option.id}`}
                    size="small"
                    variant={bigChanceTypeInput === option.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      if (option.id === 'pass') {
                        setBigChanceTypeInput('pass');
                        setBigChancePassTypeInput('');
                        return;
                      }
                      void handleConfirmBigChanceMissDetails({ bigChanceType: option.id });
                    }}
                    disabled={isSubmittingBigChanceStep}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </Box>

            {bigChanceTypeInput === 'pass' ? (
              <Box sx={{ display: 'grid', gap: 0.55 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Pass Type
                </Typography>
                <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {BIG_CHANCE_PASS_TYPE_OPTIONS.map((option) => (
                    <Button
                      key={`big-chance-pass-${option.id}`}
                      size="small"
                      variant={bigChancePassTypeInput === option.id ? 'contained' : 'outlined'}
                      onClick={() =>
                        void handleConfirmBigChanceMissDetails({
                          bigChanceType: 'pass',
                          bigChancePassType: option.id,
                        })
                      }
                      disabled={isSubmittingBigChanceStep}
                      sx={{ minHeight: 36, textTransform: 'none' }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            ) : null}

            {bigChanceTypeInput === 'shot' ? (
              <Alert severity="info">
                Next step: Shot Details (`Shot On/Off/Blocked`, location, header).
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseBigChanceMissDialog}
              disabled={isSubmittingBigChanceStep}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={pendingPenaltyFouledPlayerId !== null}
          onClose={handleClosePenaltyDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Penalty Details</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Alert severity="info">
              {pendingPenaltySide === 'opponent'
                ? 'Pick our player who committed the foul, then record penalty outcome.'
                : 'Pick penalty taker, then record penalty outcome.'}
            </Alert>

            {pendingPenaltySide === 'our' ? (
              <Chip
                size="small"
                label={`Fouled: ${playersById[pendingPenaltyFouledPlayerId]?.name || 'Team Event'}`}
                sx={{ width: 'fit-content' }}
              />
            ) : (
              <Chip size="small" label="Opponent Penalty" sx={{ width: 'fit-content' }} />
            )}

            {pendingPenaltySide === 'our' ? (
              <Box sx={{ display: 'grid', gap: 0.55 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Penalty Taker
                </Typography>
                <Stack spacing={0.6}>
                  {ourPlayerPickerRows.map((row, rowIndex) => (
                    <Box
                      key={`penalty-taker-row-${rowIndex}`}
                      sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {row.map((slot) => (
                        <Button
                          key={`penalty-taker-${slot.player_id}`}
                          size="small"
                          variant={penaltyTakerInput === slot.player_id ? 'contained' : 'outlined'}
                          onClick={() => {
                            setPenaltyTakerInput(slot.player_id);
                            maybeSubmitPenaltyFromInputs({ penaltyTakerId: slot.player_id });
                          }}
                          disabled={isSubmittingPenalty}
                          sx={{ minHeight: 38, p: 0.55, textTransform: 'none' }}
                        >
                          <Stack direction="row" spacing={0.55} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar
                              src={slot.player?.photo_data_url || undefined}
                              alt={slot.player?.name || slot.slot_label}
                              sx={{ width: 20, height: 20 }}
                            />
                            <Typography variant="caption" noWrap sx={{ fontSize: 11.5 }}>
                              {slot.player?.name || slot.slot_label}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 0.55 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Our Foul Committed Player
                </Typography>
                <Stack spacing={0.6}>
                  {ourPlayerPickerRows.map((row, rowIndex) => (
                    <Box
                      key={`penalty-foul-player-row-${rowIndex}`}
                      sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {row.map((slot) => (
                        <Button
                          key={`penalty-foul-player-${slot.player_id}`}
                          size="small"
                          variant={penaltyFoulCommittedPlayerInput === slot.player_id ? 'contained' : 'outlined'}
                          onClick={() => {
                            setPenaltyFoulCommittedPlayerInput(slot.player_id);
                            maybeSubmitPenaltyFromInputs({ foulCommittedPlayerId: slot.player_id });
                          }}
                          disabled={isSubmittingPenalty}
                          sx={{ minHeight: 38, p: 0.55, textTransform: 'none' }}
                        >
                          <Stack direction="row" spacing={0.55} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar
                              src={slot.player?.photo_data_url || undefined}
                              alt={slot.player?.name || slot.slot_label}
                              sx={{ width: 20, height: 20 }}
                            />
                            <Typography variant="caption" noWrap sx={{ fontSize: 11.5 }}>
                              {slot.player?.name || slot.slot_label}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Outcome
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {PENALTY_OUTCOME_OPTIONS.map((option) => (
                  <Button
                    key={`penalty-outcome-${option.id}`}
                    size="small"
                    variant={penaltyOutcomeInput === option.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      setPenaltyOutcomeInput(option.id);
                      maybeSubmitPenaltyFromInputs({ penaltyOutcome: option.id });
                    }}
                    disabled={isSubmittingPenalty}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleClosePenaltyDialog}
              disabled={isSubmittingPenalty}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={substitutionDialogOpen}
          onClose={handleCloseSubstitutionDialog}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Substitution</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1.2, pt: 0.6 }}>
            <Alert severity="info">
              Record a player change. Limit: {MAX_SUBSTITUTIONS_PER_MATCH} substitutions per match.
            </Alert>

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Player Out
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {substitutionOutPlayers.map((player) => (
                  <Button
                    key={`sub-out-${player.id}`}
                    size="small"
                    variant={substitutionPlayerOutInput === player.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSubstitutionPlayerOutInput(player.id);
                      maybeSubmitSubstitutionFromInputs({ playerOutId: player.id });
                    }}
                    disabled={isSubmittingSubstitution || substitutionPlayerInInput === player.id}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {player.name}
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gap: 0.55 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Player In
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.55, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {substitutionInPlayers.map((player) => (
                  <Button
                    key={`sub-in-${player.id}`}
                    size="small"
                    variant={substitutionPlayerInInput === player.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSubstitutionPlayerInInput(player.id);
                      maybeSubmitSubstitutionFromInputs({ playerInId: player.id });
                    }}
                    disabled={isSubmittingSubstitution || substitutionPlayerOutInput === player.id}
                    sx={{ minHeight: 36, textTransform: 'none' }}
                  >
                    {player.name}
                  </Button>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseSubstitutionDialog}
              disabled={isSubmittingSubstitution}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={playerPickerDialogOpen}
          onClose={() => setPlayerPickerDialogOpen(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: LIVE_POPUP_PAPER_SX }}
        >
          <DialogTitle sx={LIVE_POPUP_TITLE_SX}>Select Active Player</DialogTitle>
          <DialogContent sx={{ ...LIVE_POPUP_CONTENT_SX, display: 'grid', gap: 1, pt: 0.6 }}>
            {!livePlayerPickerOptions.length ? (
              <Alert severity="info">No lineup/bench players available for selection.</Alert>
            ) : (
              <Stack spacing={0.6}>
                {livePlayerPickerOptions.map((player) => (
                  <Button
                    key={`picker-${player.id}`}
                    size="small"
                    variant={selectedPlayerId === player.id ? 'contained' : 'outlined'}
                    onClick={() => {
                      setSelectedPlayerId(player.id);
                      setPlayerPickerDialogOpen(false);
                    }}
                    sx={{ justifyContent: 'flex-start', gap: 0.8 }}
                  >
                    <Avatar
                      src={player.photo_data_url || undefined}
                      alt={player.name}
                      sx={{ width: 22, height: 22 }}
                    />
                    {player.name}
                  </Button>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={LIVE_POPUP_ACTIONS_SX}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setPlayerPickerDialogOpen(false)}
              sx={{
                borderColor: LIVE_UI_TOKENS.border,
                color: LIVE_UI_TOKENS.textSecondary,
                backgroundColor: LIVE_UI_TOKENS.surfaceAlt,
                '&:hover': { borderColor: LIVE_UI_TOKENS.accentAmber, backgroundColor: 'rgba(43, 154, 95, 0.08)' },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={lineupDialogOpen}
          onClose={handleCloseLineupDialog}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Match Setup: Formation & First XI</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 1.25, pt: 0.7 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                select
                label="Formation"
                size="small"
                value={lineupFormation}
                onChange={(event) => handleFormationChange(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 180 } }}
              >
                {Object.keys(FORMATION_LAYOUTS).map((formation) => (
                  <MenuItem key={formation} value={formation}>
                    {formation}
                  </MenuItem>
                ))}
              </TextField>
              <Chip
                label={`${lineupSlots.filter((slot) => slot.player_id).length}/11 XI`}
                color="primary"
                variant="outlined"
              />
              <Chip label={`Bench: ${lineupBenchPlayerIds.length}`} color="secondary" variant="outlined" />
            </Stack>

            <Alert severity="info">
              Pick 11 unique starters and optional bench players. Player dropdowns prioritize the correct position for the selected slot.
            </Alert>

            {lineupSetupError ? <Alert severity="error">{lineupSetupError}</Alert> : null}

            <Box
              sx={{
                display: 'grid',
                gap: 1.2,
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(0, 1fr)' },
                alignItems: 'start',
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 1.1,
                  borderColor: 'divider',
                  background:
                    'linear-gradient(155deg, rgba(17, 99, 56, 0.92), rgba(33, 124, 69, 0.85))',
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'common.white', mb: 0.8, opacity: 0.95 }}>
                  Formation Pitch
                </Typography>
                <Stack spacing={0.8}>
                  {lineupSetupRows.map((row, rowIndex) => (
                    <Box
                      key={`setup-row-${rowIndex}`}
                      sx={{
                        display: 'grid',
                        gap: 0.7,
                        gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.map((slot) => {
                        const isFocused = lineupSelectedSlot?.slot_id === slot.slot_id;
                        const assignedPlayer = slot.player_id ? playersById[slot.player_id] || null : null;

                        return (
                          <Button
                            key={slot.slot_id}
                            size="small"
                            variant={isFocused ? 'contained' : 'outlined'}
                            onClick={() => setLineupFocusedSlotId(slot.slot_id)}
                            sx={{
                              minHeight: 58,
                              px: 0.65,
                              py: 0.55,
                              textAlign: 'left',
                              justifyContent: 'flex-start',
                              borderColor: isFocused ? 'primary.light' : 'rgba(255,255,255,0.45)',
                              bgcolor: isFocused ? 'rgba(28, 92, 58, 0.95)' : 'rgba(255,255,255,0.9)',
                              color: isFocused ? 'primary.contrastText' : 'text.primary',
                            }}
                          >
                            <Stack spacing={0.15} sx={{ width: '100%' }}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, lineHeight: 1.1, color: isFocused ? 'inherit' : 'text.secondary' }}
                              >
                                {slot.slot_label}
                              </Typography>
                              <Typography sx={{ fontSize: 11.6, fontWeight: 700, lineHeight: 1.15 }}>
                                {assignedPlayer?.name || 'Unassigned'}
                              </Typography>
                              <Typography variant="caption" sx={{ lineHeight: 1.1, opacity: 0.9 }}>
                                {getPlayerPrimaryPosition(assignedPlayer) || '-'}
                              </Typography>
                            </Stack>
                          </Button>
                        );
                      })}
                    </Box>
                  ))}
                </Stack>
              </Paper>

              <Stack spacing={1}>
                <Paper variant="outlined" sx={{ p: 1.1, borderColor: 'divider', display: 'grid', gap: 0.9 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Slot Selection
                  </Typography>
                  {lineupSelectedSlot ? (
                    <>
                      <Stack direction="row" spacing={0.7} alignItems="center">
                        <Chip size="small" color="primary" label={lineupSelectedSlot.slot_label} />
                        <Typography variant="caption" color="text.secondary">
                          Smart order: exact position first, then compatible.
                        </Typography>
                      </Stack>
                      <FormControl fullWidth size="small">
                        <InputLabel>{lineupSelectedSlot.slot_label} Player</InputLabel>
                        <Select
                          label={`${lineupSelectedSlot.slot_label} Player`}
                          value={lineupSelectedSlot.player_id || ''}
                          onChange={(event) =>
                            handleLineupSlotChange(lineupSelectedSlot.slot_id, event.target.value)
                          }
                        >
                          <MenuItem value="">
                            <em>Empty</em>
                          </MenuItem>
                          {lineupSlotPlayerOptions.map((player) => {
                            const selectedInOtherSlot =
                              lineupSelectedStarterIds.has(player.id) &&
                              lineupSelectedSlot.player_id !== player.id;
                            const selectedInBench = lineupBenchPlayerIds.includes(player.id);

                            return (
                              <MenuItem key={player.id} value={player.id}>
                                <Stack direction="row" spacing={0.7} justifyContent="space-between" sx={{ width: '100%' }}>
                                  <Typography variant="body2">
                                    {player.name}
                                  </Typography>
                                  <Stack direction="row" spacing={0.45}>
                                    {getPlayerPrimaryPosition(player) ? (
                                      <Chip size="small" label={getPlayerPrimaryPosition(player)} variant="outlined" />
                                    ) : null}
                                    {selectedInOtherSlot ? (
                                      <Chip size="small" label="XI" color="secondary" />
                                    ) : null}
                                    {selectedInBench ? <Chip size="small" label="Bench" variant="outlined" /> : null}
                                  </Stack>
                                </Stack>
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!lineupSelectedSlot.player_id}
                        onClick={() => handleLineupSlotChange(lineupSelectedSlot.slot_id, '')}
                      >
                        Clear Slot
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No slot available.
                    </Typography>
                  )}
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.1, borderColor: 'divider', display: 'grid', gap: 0.85 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bench Selection
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="lineup-bench-select-label">Bench Players</InputLabel>
                    <Select
                      labelId="lineup-bench-select-label"
                      multiple
                      value={lineupBenchPlayerIds}
                      label="Bench Players"
                      onChange={(event) => handleLineupBenchChange(event.target.value)}
                      renderValue={(selected) => {
                        const selectedIds = Array.isArray(selected) ? selected : [];

                        if (!selectedIds.length) {
                          return 'None';
                        }

                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                            {selectedIds.map((playerId) => (
                              <Chip key={playerId} size="small" label={playersById[playerId]?.name || playerId} />
                            ))}
                          </Box>
                        );
                      }}
                    >
                      {lineupBenchOptions.map((player) => (
                        <MenuItem key={player.id} value={player.id}>
                          <Checkbox size="small" checked={lineupBenchPlayerIds.includes(player.id)} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {player.name}
                        </Typography>
                          {getPlayerPrimaryPosition(player) ? (
                            <Chip size="small" label={getPlayerPrimaryPosition(player)} />
                          ) : null}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary">
                    Bench players are selectable in the Players panel after saving.
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button type="button" variant="outlined" onClick={handleCloseLineupDialog}>
              Cancel
            </Button>
            <Button type="button" variant="contained" onClick={() => void handleSaveLineupSetup()}>
              {startAfterLineupSetup ? 'Save & Start Match' : 'Save XI'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(editingEvent)}
          onClose={() => setEditingEvent(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit Event</DialogTitle>
          <Box component="form" onSubmit={handleSaveEventEdit}>
            <DialogContent sx={{ display: 'grid', gap: 1.2, pt: 0.5 }}>
              {editingEvent?.type === 'substitution' ? (
                <>
                  <TextField
                    select
                    label="Player Out"
                    size="small"
                    value={editingEvent?.player_out_id || editingEvent?.player_id || ''}
                    onChange={(event) => {
                      handleEditFieldChange('player_out_id', event.target.value);
                      handleEditFieldChange('player_id', event.target.value);
                    }}
                  >
                    {players.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Player In"
                    size="small"
                    value={editingEvent?.player_in_id || ''}
                    onChange={(event) => handleEditFieldChange('player_in_id', event.target.value)}
                  >
                    {players.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              ) : (
                editingEvent?.side === 'opponent' ? (
                  <TextField
                    label="Player"
                    size="small"
                    value="Team Event (Opponent)"
                    InputProps={{ readOnly: true }}
                  />
                ) : (
                  <TextField
                    select
                    label="Player"
                    size="small"
                    value={editingEvent?.player_id || ''}
                    onChange={(event) => handleEditFieldChange('player_id', event.target.value)}
                  >
                    <MenuItem value="">
                      <em>Team Event (No Player)</em>
                    </MenuItem>
                    {players.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )
              )}

              <TextField
                select
                label="Type"
                size="small"
                value={editingEvent?.type || ''}
                onChange={(event) => handleEditFieldChange('type', event.target.value)}
              >
                {EVENT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {EVENT_TYPE_LABELS[type] || type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Zone"
                size="small"
                value={editingEvent?.zone || ''}
                onChange={(event) => handleEditFieldChange('zone', event.target.value)}
              >
                {ZONES.map((zone) => (
                  <MenuItem key={zone.id} value={zone.id}>
                    {zone.label}
                  </MenuItem>
                ))}
              </TextField>

              {editingEvent?.type !== 'substitution' ? (
                <TextField
                  select
                  label="Side"
                  size="small"
                  value={editingEvent?.side || 'our'}
                  onChange={(event) => handleEditFieldChange('side', event.target.value)}
                >
                  {EVENT_SIDE_OPTIONS.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              {isEditingShotOutcome ? (
                <>
                  <TextField
                    select
                    label="Shot Location"
                    size="small"
                    value={editingEvent?.shot_context || ''}
                    onChange={(event) => handleEditFieldChange('shot_context', event.target.value)}
                  >
                    {SHOT_CONTEXT_OPTIONS.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(editingEvent?.is_header)}
                        onChange={(event) => handleEditFieldChange('is_header', event.target.checked)}
                      />
                    }
                    label="Header"
                  />
                  {editingEvent?.type === 'goal' ? (
                    <TextField
                      select
                      label="Goal Type"
                      size="small"
                      value={editingEvent?.goal_source_type || 'open_play'}
                      onChange={(event) => handleEditFieldChange('goal_source_type', event.target.value)}
                    >
                      {GOAL_SOURCE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                </>
              ) : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  label="Minute"
                  size="small"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={editingEvent?.minute ?? 0}
                  onChange={(event) => handleEditFieldChange('minute', event.target.value)}
                />
                <TextField
                  label="Second"
                  size="small"
                  type="number"
                  inputProps={{ min: 0, max: 59 }}
                  value={editingEvent?.second ?? 0}
                  onChange={(event) => handleEditFieldChange('second', event.target.value)}
                />
                <TextField
                  label="Points"
                  size="small"
                  type="number"
                  value={editingEvent?.points ?? 0}
                  onChange={(event) => handleEditFieldChange('points', event.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button type="button" variant="outlined" onClick={() => setEditingEvent(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" startIcon={<SaveRoundedIcon />}>
                Save Event
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Container>
    </Box>
  );
}

export default App;
