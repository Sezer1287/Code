import { EVENT_TYPE_LABELS, ZONES } from './constants';
import { derivePlayerRatings } from './stats';

const POSSESSION_POSITIVE_TYPES = [
  'pass_success',
  'long_pass_success',
  'key_pass',
  'assist',
  'dribble_success',
  'aerial_win',
  'interception',
  'cross',
];

const POSSESSION_NEGATIVE_TYPES = ['pass_fail', 'long_pass_fail', 'dribble_fail', 'ball_loss', 'aerial_fail'];

const XG_WEIGHTS = {
  goal: 0.78,
  shot_on: 0.3,
  shot_off: 0.1,
  shot_blocked: 0.08,
  key_pass: 0.05,
  assist: 0.1,
};

const STATS_SECTION_ORDER = ['shots', 'attack', 'passes', 'defense', 'goalkeeping'];

const STATS_SECTION_LABELS = {
  shots: 'SHOTS',
  attack: 'ATTACK',
  passes: 'PASSES',
  defense: 'DEFENSE',
  goalkeeping: 'GOALKEEPING',
};

const SHOT_OUTCOME_TYPES = new Set(['goal', 'shot_on', 'shot_off', 'shot_blocked']);
const TOUCH_EXCLUDED_TYPES = new Set([
  'penalty_won',
  'create_big_chance',
  'big_chance_won',
  'big_chance_missed',
  'substitution',
]);
const STATS_SIDE_OPTIONS = new Set(['our', 'opponent', 'combined']);
const SUMMARY_TIMELINE_EVENT_TYPES = new Set([
  'goal',
  'penalty_won',
  'substitution',
  'blue_card',
  'yellow_card',
  'red_card',
]);
const SUMMARY_FIRST_HALF_LIMIT = 25;
const SUMMARY_FULL_TIME_LIMIT = 50;
const POSSESSION_TIMELINE_EVENT_TYPES = new Set([
  'pass_success',
  'pass_fail',
  'long_pass_success',
  'long_pass_fail',
  'key_pass',
  'assist',
  'shot_on',
  'shot_off',
  'shot_blocked',
  'goal',
  'dribble_success',
  'dribble_fail',
  'ball_loss',
  'tackle_win',
  'interception',
  'clearance',
  'block',
  'cross',
  'cross_fail',
  'aerial_win',
  'aerial_fail',
  'foul_won',
  'foul_committed',
  'offside',
  'corner_taken',
  'penalty_won',
  'create_big_chance',
  'big_chance_won',
  'error_leads_shot',
  'error_leads_goal',
  'throw_in_won',
]);
const NON_STATS_EVENT_TYPES = new Set(['half_time_marker']);

const PLAYER_STATS_TAB_CONFIG = [
  {
    id: 'top_stats',
    label: 'TOP STATS',
    include: (row) => row.totalEvents > 0 || row.minutes > 0 || row.starts > 0 || row.subApps > 0,
    sort: (a, b) => b.rating - a.rating || b.totalEvents - a.totalEvents,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'rating', label: 'Rating' },
      { id: 'totalShots', label: 'Total shots' },
      { id: 'expectedGoals', label: 'Expected goals (xG)' },
      { id: 'passesAS', label: 'Accurate passes' },
      { id: 'touches', label: 'Touches' },
      { id: 'touchesOppositionBox', label: 'Touches in opposition box' },
      { id: 'dribblesAS', label: 'Successful dribbles' },
      { id: 'duels', label: 'Duels' },
    ],
  },
  {
    id: 'shots',
    label: 'SHOTS',
    include: (row) =>
      row.totalShots > 0 ||
      row.goals > 0 ||
      row.shotOn > 0 ||
      row.shotOff > 0 ||
      row.shotBlocked > 0 ||
      row.shotInsideBox > 0 ||
      row.shotOutsideBox > 0 ||
      row.shotHeader > 0 ||
      row.penaltiesScored > 0 ||
      row.penaltiesMissed > 0,
    sort: (a, b) => b.totalShots - a.totalShots || b.goals - a.goals,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'totalShots', label: 'Total shots' },
      { id: 'goals', label: 'Goals' },
      { id: 'expectedGoals', label: 'Expected goals (xG)' },
      { id: 'xgot', label: 'xG on target (xGOT)' },
      { id: 'shotOn', label: 'Shots on target' },
      { id: 'shotOff', label: 'Shots off target' },
      { id: 'shotBlocked', label: 'Blocked shots' },
      { id: 'shotInsideBox', label: 'Shots inside the box' },
      { id: 'shotOutsideBox', label: 'Shots outside the box' },
      { id: 'shotHeader', label: 'Headed shots' },
    ],
  },
  {
    id: 'attack',
    label: 'ATTACK',
    include: (row) =>
      row.touchesOppositionBox > 0 ||
      row.dribbleAttempts > 0 ||
      row.bigChancesMissed > 0 ||
      row.touches > 0 ||
      row.foulWon > 0 ||
      row.offsides > 0,
    sort: (a, b) => b.touchesOppositionBox - a.touchesOppositionBox || b.dribbleSuccess - a.dribbleSuccess,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'touchesOppositionBox', label: 'Touches in opposition box' },
      { id: 'dribblesAS', label: 'Successful dribbles' },
      { id: 'bigChancesMissed', label: 'Big chances missed' },
      { id: 'touches', label: 'Touches' },
      { id: 'foulWon', label: 'Fouls suffered' },
      { id: 'offsides', label: 'Offsides' },
    ],
  },
  {
    id: 'passes',
    label: 'PASSES',
    include: (row) =>
      row.passAttempts > 0 ||
      row.longPassAttempts > 0 ||
      row.crossAttempts > 0 ||
      row.finalThirdPassAttempts > 0 ||
      row.bigChancesCreated > 0 ||
      row.assists > 0,
    sort: (a, b) => b.successfulPasses - a.successfulPasses || b.keyPasses - a.keyPasses,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'passesAS', label: 'Accurate passes' },
      { id: 'bigChancesCreated', label: 'Big chances created' },
      { id: 'assists', label: 'Assists' },
      { id: 'expectedAssists', label: 'Expected assists (xA)' },
      { id: 'finalThirdPassesAS', label: 'Accurate passes in final third' },
      { id: 'longPassesAS', label: 'Accurate long passes' },
      { id: 'crossesAS', label: 'Accurate crosses' },
    ],
  },
  {
    id: 'defense',
    label: 'DEFENSE',
    include: (row) =>
      row.tackleWin > 0 ||
      row.interception > 0 ||
      row.clearance > 0 ||
      row.aerialWin > 0 ||
      row.aerialFail > 0 ||
      row.foulCommitted > 0 ||
      row.errorLeadsShot > 0 ||
      row.errorLeadsGoal > 0 ||
      row.blueCards > 0 ||
      row.yellowCards > 0 ||
      row.redCards > 0,
    sort: (a, b) => b.duels - a.duels || b.tackleWin - a.tackleWin || b.interception - a.interception,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'duels', label: 'Duels' },
      { id: 'aerialAS', label: 'Aerial duels won' },
      { id: 'groundDuelsWon', label: 'Ground duels won' },
      { id: 'tackleWin', label: 'Tackles won' },
      { id: 'foulCommitted', label: 'Fouls committed' },
      { id: 'interception', label: 'Interceptions' },
      { id: 'clearance', label: 'Clearances' },
      { id: 'errorLeadsGoal', label: 'Errors leading to goal' },
      { id: 'errorLeadsShot', label: 'Errors leading to shot' },
    ],
  },
  {
    id: 'goalkeeping',
    label: 'GOALKEEPING',
    include: (row) => {
      const position = String(row.positionLabel || row.position || '').toLowerCase();
      return position.includes('goalkeeper') || position.startsWith('gk') || row.saves > 0 || row.goalsConceded > 0;
    },
    sort: (a, b) => b.saves - a.saves || a.goalsConceded - b.goalsConceded,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'saves', label: 'Goalkeeper saves' },
      { id: 'goalsConceded', label: 'Goals conceded' },
      { id: 'goalsPrevented', label: 'Goals prevented' },
      { id: 'xgotFaced', label: 'xGOT faced' },
      { id: 'punches', label: 'Punches' },
      { id: 'throws', label: 'Throws' },
      { id: 'sweeperActions', label: 'Act as sweeper' },
    ],
  },
  {
    id: 'general',
    label: 'GENERAL',
    include: (row) => row.totalEvents > 0 || row.minutes > 0 || row.starts > 0 || row.subApps > 0,
    sort: (a, b) => b.rating - a.rating || b.minutes - a.minutes,
    columns: [
      { id: 'player', label: 'Player' },
      { id: 'rating', label: 'Rating' },
      { id: 'minutes', label: 'Minutes played' },
      { id: 'goals', label: 'Goals' },
      { id: 'ownGoals', label: 'Own goals' },
      { id: 'assists', label: 'Assists' },
      { id: 'yellowCards', label: 'Yellow cards' },
      { id: 'redCards', label: 'Red cards' },
    ],
  },
];

const PLAYER_STATS_EXPECTED_VALUE_COLUMNS = new Set([
  'expectedGoals',
  'xgot',
  'expectedAssists',
  'goalsPrevented',
  'xgotFaced',
]);

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function splitLineupsByRole(lineups = []) {
  const starters = [];
  const bench = [];

  lineups.forEach((lineup) => {
    if (!lineup?.player_id) {
      return;
    }

    if (lineup.role === 'bench' || lineup.slot_label === 'BENCH') {
      bench.push(lineup);
      return;
    }

    starters.push(lineup);
  });

  return { starters, bench };
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

function getScopeMatchIds(events, lineupsByMatch = {}, scope = 'all') {
  if (scope !== 'all') {
    return [scope];
  }

  const eventMatchIds = events.map((event) => event.match_id).filter(Boolean);
  const lineupMatchIds = Object.keys(lineupsByMatch || {});
  return [...new Set([...eventMatchIds, ...lineupMatchIds])];
}

function normalizeStatsSide(side) {
  const normalized = String(side || '').trim().toLowerCase();
  if (STATS_SIDE_OPTIONS.has(normalized)) {
    return normalized;
  }
  return 'our';
}

function getEventSide(event) {
  return event?.side === 'opponent' ? 'opponent' : 'our';
}

function getOppositeSide(side) {
  return side === 'opponent' ? 'our' : 'opponent';
}

function getSummaryHalfFromEvent(event) {
  if (event?.event_period === 'first_half') {
    return 'first';
  }

  if (event?.event_period === 'second_half') {
    return 'second';
  }

  return (Number(event?.minute) || 0) < SUMMARY_FIRST_HALF_LIMIT ? 'first' : 'second';
}

function getEventPeriodForStats(event) {
  const period = String(event?.event_period || '').trim();
  if (period === 'first_half' || period === 'second_half') {
    return period;
  }

  return (Number(event?.minute) || 0) < SUMMARY_FIRST_HALF_LIMIT ? 'first_half' : 'second_half';
}

export function filterEventsByPeriod(events = [], period = 'match') {
  const normalizedPeriod = String(period || 'match').trim();
  if (normalizedPeriod === 'match') {
    return events;
  }

  if (normalizedPeriod !== 'first_half' && normalizedPeriod !== 'second_half') {
    return events;
  }

  return events.filter((event) => getEventPeriodForStats(event) === normalizedPeriod);
}

function formatSummaryMinuteLabel(event) {
  const minuteValue = Math.max(0, Number(event.minute) || 0);
  const secondValue = clamp(Number(event.second) || 0, 0, 59);
  const half = getSummaryHalfFromEvent(event);

  if (half === 'first' && (minuteValue > SUMMARY_FIRST_HALF_LIMIT || (minuteValue === SUMMARY_FIRST_HALF_LIMIT && secondValue > 0))) {
    const extraSeconds = Math.max(0, (minuteValue - SUMMARY_FIRST_HALF_LIMIT) * 60 + secondValue);
    const extraMinutes = Math.max(1, Math.ceil(extraSeconds / 60));
    return `${SUMMARY_FIRST_HALF_LIMIT}+${extraMinutes}'`;
  }

  if (half === 'second' && (minuteValue > SUMMARY_FULL_TIME_LIMIT || (minuteValue === SUMMARY_FULL_TIME_LIMIT && secondValue > 0))) {
    const extraSeconds = Math.max(0, (minuteValue - SUMMARY_FULL_TIME_LIMIT) * 60 + secondValue);
    const extraMinutes = Math.max(1, Math.ceil(extraSeconds / 60));
    return `${SUMMARY_FULL_TIME_LIMIT}+${extraMinutes}'`;
  }

  return `${minuteValue}'`;
}

function getSummaryFallbackLabel(eventSide) {
  return eventSide === 'opponent' ? 'Opponent' : 'Unassigned';
}

function getPlayerName(playersById, playerId, eventSide) {
  const name = playersById?.[playerId]?.name || '';
  return name || getSummaryFallbackLabel(eventSide);
}

function resolveGoalAssistPlayerId(sortedEvents, index, goalEvent) {
  if (!goalEvent || goalEvent.type !== 'goal' || goalEvent.goal_source_type === 'own_goal') {
    return '';
  }

  const directAssistPlayerId = goalEvent.assist_player_id || goalEvent.assisted_by_id || '';
  if (directAssistPlayerId) {
    return directAssistPlayerId;
  }

  const previousEvent = sortedEvents[index - 1];
  if (!previousEvent) {
    return '';
  }

  if (
    previousEvent.type === 'assist' &&
    !previousEvent.is_derived &&
    !previousEvent.mirror_generated &&
    getEventSide(previousEvent) === getEventSide(goalEvent)
  ) {
    return previousEvent.player_id || '';
  }

  return '';
}

function buildGoalAssistAttribution(events = []) {
  const sortedEvents = sortEventsByTimeline(events.filter((event) => event && !event.mirror_generated));
  const byGoalId = {};
  const byPlayer = {};
  let total = 0;

  sortedEvents.forEach((event, index) => {
    if (event.type !== 'goal') {
      return;
    }

    const assistPlayerId = resolveGoalAssistPlayerId(sortedEvents, index, event);
    if (!assistPlayerId) {
      return;
    }

    byGoalId[event.id] = assistPlayerId;
    byPlayer[assistPlayerId] = (byPlayer[assistPlayerId] || 0) + 1;
    total += 1;
  });

  return {
    total,
    byGoalId,
    byPlayer,
  };
}

function filterEventsBySide(events, side = 'our') {
  const normalizedSide = normalizeStatsSide(side);

  if (normalizedSide === 'combined') {
    return events;
  }

  return events.filter((event) => getEventSide(event) === normalizedSide);
}

function getEffectiveEventMinute(event) {
  const rawMinute = clamp(Number(event?.minute) || 0, 0, SUMMARY_FULL_TIME_LIMIT);
  const period = String(event?.event_period || '').trim();

  if (period === 'first_half') {
    return Math.min(rawMinute, SUMMARY_FIRST_HALF_LIMIT);
  }

  if (period === 'second_half' || period === 'full_time') {
    return clamp(rawMinute, SUMMARY_FIRST_HALF_LIMIT, SUMMARY_FULL_TIME_LIMIT);
  }

  return clamp(rawMinute, 0, SUMMARY_FULL_TIME_LIMIT);
}

function resolveMatchStatus(matchId, options = {}) {
  if (options.matchStatusById && Object.prototype.hasOwnProperty.call(options.matchStatusById, matchId)) {
    return options.matchStatusById[matchId] || '';
  }

  if (options.matchesById && options.matchesById[matchId]) {
    return options.matchesById[matchId].status || '';
  }

  return '';
}

function resolveMatchEndMinute(matchId, matchEvents = [], options = {}) {
  const status = resolveMatchStatus(matchId, options);
  if (status === 'completed') {
    return SUMMARY_FULL_TIME_LIMIT;
  }

  const activeClockSeconds = Number(options.activeMatchClockSecondsById?.[matchId]);
  if (Number.isFinite(activeClockSeconds) && activeClockSeconds >= 0) {
    return clamp(Math.floor(activeClockSeconds / 60), 0, SUMMARY_FULL_TIME_LIMIT);
  }

  return matchEvents.reduce((maxMinute, event) => Math.max(maxMinute, getEffectiveEventMinute(event)), 0);
}

function buildPlayerParticipation(events, lineupsByMatch = {}, scope = 'all', side = 'our', options = {}) {
  const scopedEvents = getScopedEvents(events, scope, side);
  const matchIds = getScopeMatchIds(events, lineupsByMatch, scope);
  const minutesByPlayer = {};
  const startsByPlayer = {};
  const subAppsByPlayer = {};

  const addMinutes = (playerId, minutes) => {
    if (!playerId || !Number.isFinite(minutes) || minutes <= 0) {
      return;
    }
    minutesByPlayer[playerId] = (minutesByPlayer[playerId] || 0) + minutes;
  };

  matchIds.forEach((matchId) => {
    const matchEvents = sortEventsByTimeline(scopedEvents.filter((event) => event.match_id === matchId));
    const matchLineups = lineupsByMatch[matchId] || [];
    const { starters } = splitLineupsByRole(matchLineups);

    if (!starters.length) {
      return;
    }

    const matchEndMinute = resolveMatchEndMinute(matchId, matchEvents, options);
    const onPitchSinceByPlayer = new Map();
    const dismissedPlayers = new Set();

    starters.forEach((slot) => {
      if (!slot.player_id) {
        return;
      }
      onPitchSinceByPlayer.set(slot.player_id, 0);
      startsByPlayer[slot.player_id] = (startsByPlayer[slot.player_id] || 0) + 1;
    });

    matchEvents.forEach((event) => {
      if (event.is_derived) {
        return;
      }

      const eventMinute = getEffectiveEventMinute(event);

      if (event.type === 'red_card') {
        const playerId = event.player_id;
        if (!playerId) {
          return;
        }

        dismissedPlayers.add(playerId);
        if (!onPitchSinceByPlayer.has(playerId)) {
          return;
        }

        const startedAt = onPitchSinceByPlayer.get(playerId) || 0;
        addMinutes(playerId, eventMinute - startedAt);
        onPitchSinceByPlayer.delete(playerId);
        return;
      }

      if (event.type !== 'substitution') {
        return;
      }

      const playerOutId = event.player_out_id || event.player_id;
      const playerInId = event.player_in_id;
      if (!playerOutId || !playerInId || playerOutId === playerInId) {
        return;
      }

      if (
        !onPitchSinceByPlayer.has(playerOutId) ||
        onPitchSinceByPlayer.has(playerInId) ||
        dismissedPlayers.has(playerInId)
      ) {
        return;
      }

      const startedAt = onPitchSinceByPlayer.get(playerOutId) || 0;
      addMinutes(playerOutId, eventMinute - startedAt);

      onPitchSinceByPlayer.delete(playerOutId);
      onPitchSinceByPlayer.set(playerInId, eventMinute);
      subAppsByPlayer[playerInId] = (subAppsByPlayer[playerInId] || 0) + 1;
    });

    onPitchSinceByPlayer.forEach((startedAt, playerId) => {
      addMinutes(playerId, Math.max(0, matchEndMinute - startedAt));
    });
  });

  return {
    minutesByPlayer,
    startsByPlayer,
    subAppsByPlayer,
  };
}

function getScopedEvents(events, scope = 'all', side = 'our') {
  const scopedEvents = scope === 'all' ? events : events.filter((event) => event.match_id === scope);
  return filterEventsBySide(scopedEvents, side).filter((event) => !NON_STATS_EVENT_TYPES.has(event.type));
}

function toTypeCountMap(events) {
  return events.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] || 0) + 1;
    return counts;
  }, {});
}

function toPlayerEventMap(events) {
  return events.reduce((lookup, event) => {
    if (!lookup[event.player_id]) {
      lookup[event.player_id] = [];
    }

    lookup[event.player_id].push(event);
    return lookup;
  }, {});
}

function countByType(counts, type) {
  return counts[type] || 0;
}

function formatNumber(value, digits = 0) {
  if (digits > 0) {
    return Number(value).toFixed(digits);
  }

  return String(value);
}

function toProgress(value, reference) {
  if (!reference || reference <= 0) {
    return 0;
  }

  return clamp(round((Math.max(0, value) / reference) * 100, 1), 0, 100);
}

function toStatRow(id, label, value, options = {}) {
  const {
    display = formatNumber(value),
    estimated = false,
    reference = Math.max(1, Number(value) || 0),
  } = options;

  return {
    id,
    label,
    value,
    display,
    estimated,
    progress: toProgress(Number(value) || 0, reference),
  };
}

function calculateXgFromCounts(counts) {
  return round(
    Object.entries(XG_WEIGHTS).reduce((sum, [type, weight]) => sum + countByType(counts, type) * weight, 0),
    2,
  );
}

function countTouchesInBoxNormalized(events) {
  const penaltyGroupTouchesByPlayer = new Set();
  const bigChanceTouchGroups = new Set();
  let bigChanceStandaloneTouches = 0;
  let touches = 0;

  events.forEach((event) => {
    if (event.type !== 'big_chance_won') {
      return;
    }

    if (event.action_group_id) {
      bigChanceTouchGroups.add(event.action_group_id);
      return;
    }

    bigChanceStandaloneTouches += 1;
  });

  events.forEach((event) => {
    if (event.zone !== 'box') {
      return;
    }

    if (TOUCH_EXCLUDED_TYPES.has(event.type)) {
      return;
    }

    if (event.source_action === 'big_chance_won') {
      return;
    }

    const isPenaltyGroupTouchEvent =
      Boolean(event.action_group_id) &&
      event.source_action === 'penalty_won' &&
      (event.type === 'foul_won' || SHOT_OUTCOME_TYPES.has(event.type));

    if (isPenaltyGroupTouchEvent) {
      const groupKey = `${event.action_group_id}:${event.player_id}`;
      if (penaltyGroupTouchesByPlayer.has(groupKey)) {
        return;
      }

      penaltyGroupTouchesByPlayer.add(groupKey);
      touches += 1;
      return;
    }

    touches += 1;
  });

  return touches + bigChanceTouchGroups.size + bigChanceStandaloneTouches;
}

function buildBigChanceMetrics(events) {
  const createdBigChanceEvents = events.filter((event) => event.type === 'create_big_chance');
  const bigChanceWonEvents = events.filter((event) => event.type === 'big_chance_won');
  const actionGroupsWithBigChance = new Set(
    bigChanceWonEvents.map((event) => event.action_group_id).filter(Boolean),
  );
  const created = createdBigChanceEvents.length;
  const detailedWon = bigChanceWonEvents.length;

  let missedFromBigChanceEvents = 0;
  let scored = 0;

  bigChanceWonEvents.forEach((event) => {
    if (event.big_chance_result === 'miss') {
      missedFromBigChanceEvents += 1;
      return;
    }

    if (event.big_chance_result === 'goal') {
      scored += 1;
      return;
    }

    if (!event.action_group_id) {
      return;
    }

    const hasLegacyMissEvent = events.some(
      (groupedEvent) =>
        groupedEvent.action_group_id === event.action_group_id && groupedEvent.type === 'big_chance_missed',
    );

    if (hasLegacyMissEvent) {
      missedFromBigChanceEvents += 1;
    }
  });

  const legacyMissedWithoutBigChanceEvent = events.filter(
    (event) =>
      event.type === 'big_chance_missed' &&
      (!event.action_group_id || !actionGroupsWithBigChance.has(event.action_group_id)),
  ).length;

  const totalWon = created + detailedWon;

  return {
    created,
    detailedWon,
    totalWon,
    won: totalWon,
    missed: missedFromBigChanceEvents + legacyMissedWithoutBigChanceEvent,
    scored,
  };
}

function buildShotSummaryNormalized(events, options = {}) {
  const excludeOwnGoals = Boolean(options.excludeOwnGoals);
  const counts = toTypeCountMap(events);
  const goals = events.filter(
    (event) => event.type === 'goal' && (!excludeOwnGoals || event.goal_source_type !== 'own_goal'),
  ).length;
  const shotOn = countByType(counts, 'shot_on');
  const shotOff = countByType(counts, 'shot_off');
  const shotBlocked = countByType(counts, 'shot_blocked');

  let penaltyDerivedGoals = 0;
  let penaltyDerivedShotOn = 0;
  let penaltyDerivedShotOff = 0;
  let penaltyDerivedShotBlocked = 0;

  const penaltyShotGroups = new Map();

  events.forEach((event) => {
    if (event.source_action !== 'penalty_won') {
      return;
    }

    if (event.type === 'goal' && (!excludeOwnGoals || event.goal_source_type !== 'own_goal')) {
      penaltyDerivedGoals += 1;
    }
    if (event.type === 'shot_on') penaltyDerivedShotOn += 1;
    if (event.type === 'shot_off') penaltyDerivedShotOff += 1;
    if (event.type === 'shot_blocked') penaltyDerivedShotBlocked += 1;

    if (!SHOT_OUTCOME_TYPES.has(event.type)) {
      return;
    }

    const groupKey = event.action_group_id || event.id;
    if (!penaltyShotGroups.has(groupKey)) {
      penaltyShotGroups.set(groupKey, {
        hasGoal: false,
        hasShotOn: false,
        hasShotOff: false,
        hasShotBlocked: false,
      });
    }

    const group = penaltyShotGroups.get(groupKey);
    if (event.type === 'goal' && (!excludeOwnGoals || event.goal_source_type !== 'own_goal')) group.hasGoal = true;
    if (event.type === 'shot_on') group.hasShotOn = true;
    if (event.type === 'shot_off') group.hasShotOff = true;
    if (event.type === 'shot_blocked') group.hasShotBlocked = true;
  });

  const nonPenaltyGoals = Math.max(0, goals - penaltyDerivedGoals);
  const nonPenaltyShotOn = Math.max(0, shotOn - penaltyDerivedShotOn);
  const nonPenaltyShotOff = Math.max(0, shotOff - penaltyDerivedShotOff);
  const nonPenaltyShotBlocked = Math.max(0, shotBlocked - penaltyDerivedShotBlocked);

  let penaltyAttempts = 0;
  let penaltySuccessfulShots = 0;

  penaltyShotGroups.forEach((group) => {
    if (!(group.hasGoal || group.hasShotOn || group.hasShotOff || group.hasShotBlocked)) {
      return;
    }

    penaltyAttempts += 1;
    if (group.hasGoal || group.hasShotOn) {
      penaltySuccessfulShots += 1;
    }
  });

  const totalShots =
    nonPenaltyGoals + nonPenaltyShotOn + nonPenaltyShotOff + nonPenaltyShotBlocked + penaltyAttempts;
  const successfulShots = nonPenaltyGoals + nonPenaltyShotOn + penaltySuccessfulShots;

  return {
    goals,
    shotOn,
    shotOff,
    shotBlocked,
    totalShots,
    successfulShots,
  };
}

function countShotContextTags(events) {
  return events.reduce(
    (totals, event) => {
      if (event.type === 'shot_header') {
        totals.header += 1;
      }
      if (event.type === 'shot_inside_box') {
        totals.insideBox += 1;
      }
      if (event.type === 'shot_outside_box') {
        totals.outsideBox += 1;
      }

      if (!SHOT_OUTCOME_TYPES.has(event.type)) {
        return totals;
      }

      if (event.shot_context === 'inside_box') {
        totals.insideBox += 1;
      }
      if (event.shot_context === 'outside_box') {
        totals.outsideBox += 1;
      }
      if (event.is_header) {
        totals.header += 1;
      }

      return totals;
    },
    { insideBox: 0, outsideBox: 0, header: 0 },
  );
}

function countPassSuccessEvents(events) {
  return events.reduce((total, event) => {
    if (event.type !== 'pass_success') {
      return total;
    }

    if (event.source_action === 'assist') {
      return total;
    }

    return total + 1;
  }, 0);
}

function buildAttemptSuccessMetrics(successCount, failCount) {
  const attempts = successCount + failCount;
  const accuracyPct = attempts ? round((successCount / attempts) * 100, 1) : 0;

  return {
    success: successCount,
    fail: failCount,
    attempts,
    accuracyPct,
    ratio: `${attempts}/${successCount}`,
  };
}

function buildPassMetrics(events, counts) {
  const passSuccessEvents = countPassSuccessEvents(events);
  const assists = countByType(counts, 'assist');
  const passFail = countByType(counts, 'pass_fail');
  const model = buildAttemptSuccessMetrics(passSuccessEvents + assists, passFail);

  return {
    passSuccessEvents,
    assists,
    passFail,
    successfulPasses: model.success,
    passAttempts: model.attempts,
    passAccuracyPct: model.accuracyPct,
    passRatio: model.ratio,
  };
}

function buildFinalThirdPassMetrics(events) {
  const finalThirdPassSuccess = events.reduce((total, event) => {
    if (event.type !== 'pass_success' || event.zone !== 'final_third') {
      return total;
    }

    if (event.source_action === 'assist') {
      return total;
    }

    return total + 1;
  }, 0);

  const finalThirdPassFail = events.reduce((total, event) => {
    if (event.type !== 'pass_fail' || event.zone !== 'final_third') {
      return total;
    }

    return total + 1;
  }, 0);

  const model = buildAttemptSuccessMetrics(finalThirdPassSuccess, finalThirdPassFail);

  return {
    success: model.success,
    fail: model.fail,
    attempts: model.attempts,
    accuracyPct: model.accuracyPct,
    ratio: model.ratio,
  };
}

function buildCrossMetrics(counts) {
  const model = buildAttemptSuccessMetrics(countByType(counts, 'cross'), countByType(counts, 'cross_fail'));
  return {
    crossSuccess: model.success,
    crossFail: model.fail,
    crossAttempts: model.attempts,
    crossAccuracyPct: model.accuracyPct,
    crossRatio: model.ratio,
  };
}

function buildLongPassMetrics(counts) {
  const model = buildAttemptSuccessMetrics(
    countByType(counts, 'long_pass_success'),
    countByType(counts, 'long_pass_fail'),
  );
  return {
    longPassSuccess: model.success,
    longPassFail: model.fail,
    longPassAttempts: model.attempts,
    longPassAccuracyPct: model.accuracyPct,
    longPassRatio: model.ratio,
  };
}

function buildDribbleMetrics(counts) {
  const model = buildAttemptSuccessMetrics(countByType(counts, 'dribble_success'), countByType(counts, 'dribble_fail'));
  return {
    dribbleSuccess: model.success,
    dribbleFail: model.fail,
    dribbleAttempts: model.attempts,
    dribbleAccuracyPct: model.accuracyPct,
    dribbleRatio: model.ratio,
  };
}

function buildAerialMetrics(counts) {
  const model = buildAttemptSuccessMetrics(countByType(counts, 'aerial_win'), countByType(counts, 'aerial_fail'));
  return {
    aerialWin: model.success,
    aerialFail: model.fail,
    aerialAttempts: model.attempts,
    aerialAccuracyPct: model.accuracyPct,
    aerialRatio: model.ratio,
  };
}

export function buildMinuteBins(events, binSize = 5) {
  if (!events.length) {
    return [];
  }

  const maxMinute = Math.max(...events.map((event) => Number(event.minute) || 0));
  const binCount = Math.floor(maxMinute / binSize) + 1;

  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = index * binSize;
    const end = start + binSize - 1;

    return {
      label: `${start}-${end}`,
      events: 0,
      points: 0,
    };
  });

  events.forEach((event) => {
    const minuteValue = Number(event.minute) || 0;
    const binIndex = Math.floor(minuteValue / binSize);

    if (!bins[binIndex]) {
      return;
    }

    bins[binIndex].events += 1;
    bins[binIndex].points += Number(event.points) || 0;
  });

  return bins;
}

export function buildTimelinePossession(events = [], options = {}) {
  const kickoffSide = options.kickoffSide === 'opponent' ? 'opponent' : 'our';
  const timelineEvents = sortEventsByTimeline(
    events.filter(
      (event) =>
        event &&
        !event.is_derived &&
        !event.mirror_generated &&
        POSSESSION_TIMELINE_EVENT_TYPES.has(event.type),
    ),
  );

  const inferredEndSeconds = timelineEvents.reduce((maxSecond, event) => {
    const eventSecond = Math.max(0, (Number(event.minute) || 0) * 60 + (Number(event.second) || 0));
    return Math.max(maxSecond, eventSecond);
  }, 0);
  const optionEndSeconds = Number(options.endSeconds);
  const endSeconds = Number.isFinite(optionEndSeconds) ? Math.max(0, optionEndSeconds) : inferredEndSeconds;
  if (endSeconds <= 0) {
    return {
      ourSeconds: 0,
      opponentSeconds: 0,
      totalSeconds: 0,
      ourPct: 0,
      oppPct: 0,
    };
  }

  let owner = kickoffSide;
  let previousSecond = 0;
  let ourSeconds = 0;
  let opponentSeconds = 0;

  const addSpan = (nextSecond) => {
    const normalizedSecond = clamp(nextSecond, 0, endSeconds);
    const span = Math.max(0, normalizedSecond - previousSecond);
    if (owner === 'opponent') {
      opponentSeconds += span;
    } else {
      ourSeconds += span;
    }
    previousSecond = normalizedSecond;
  };

  timelineEvents.forEach((event) => {
    const eventSecond = Math.max(0, (Number(event.minute) || 0) * 60 + (Number(event.second) || 0));
    addSpan(eventSecond);
    const eventSide = getEventSide(event);
    owner = event.auto_context_transition ? getOppositeSide(eventSide) : eventSide;
  });

  addSpan(endSeconds);

  const totalSeconds = ourSeconds + opponentSeconds;
  const ourPct = totalSeconds <= 0 ? 0 : round((ourSeconds / totalSeconds) * 100, 1);
  const oppPct = totalSeconds <= 0 ? 0 : round((opponentSeconds / totalSeconds) * 100, 1);

  return {
    ourSeconds,
    opponentSeconds,
    totalSeconds,
    ourPct,
    oppPct,
  };
}

export function buildEstimatedMetrics(events, options = {}) {
  const counts = toTypeCountMap(events);
  const shotSummary = buildShotSummaryNormalized(events);

  const positive = POSSESSION_POSITIVE_TYPES.reduce((sum, type) => sum + countByType(counts, type), 0);
  const negative = POSSESSION_NEGATIVE_TYPES.reduce((sum, type) => sum + countByType(counts, type), 0);

  const possessionBase = positive + negative;
  const heuristicPossessionPct = possessionBase === 0 ? 0 : round((positive / possessionBase) * 100, 1);
  const possessionSource = options.timelinePossession || null;
  const possessionOurPct = possessionSource ? possessionSource.ourPct : heuristicPossessionPct;
  const possessionOppPct = possessionSource ? possessionSource.oppPct : round(100 - heuristicPossessionPct, 1);

  const xg = calculateXgFromCounts(counts);

  const conversionPct = shotSummary.totalShots === 0 ? 0 : round((shotSummary.goals / shotSummary.totalShots) * 100, 1);

  return {
    possessionPct: possessionOurPct,
    possessionOurPct,
    possessionOppPct,
    xg,
    conversionPct,
  };
}

function buildStatsSections(scopedEvents, options = {}) {
  const counts = toTypeCountMap(scopedEvents);
  const estimated = buildEstimatedMetrics(scopedEvents, {
    timelinePossession: options.timelinePossession,
  });
  const passMetrics = buildPassMetrics(scopedEvents, counts);
  const finalThirdPassMetrics = buildFinalThirdPassMetrics(scopedEvents);
  const longPassMetrics = buildLongPassMetrics(counts);
  const crossMetrics = buildCrossMetrics(counts);
  const dribbleMetrics = buildDribbleMetrics(counts);
  const aerialMetrics = buildAerialMetrics(counts);
  const assistAttribution = buildGoalAssistAttribution(scopedEvents);
  const shotTags = countShotContextTags(scopedEvents);
  const shotSummary = buildShotSummaryNormalized(scopedEvents);

  const keyPasses = countByType(counts, 'key_pass');
  const assists = assistAttribution.total;

  const { goals, shotOff, shotBlocked, successfulShots, totalShots } = shotSummary;
  const hitWoodwork = scopedEvents.filter(
    (event) => event.type === 'shot_off' && Boolean(event.hit_woodwork),
  ).length;

  const corners = countByType(counts, 'corner_taken');
  const throwInsWon = countByType(counts, 'throw_in_won');
  const crosses = countByType(counts, 'cross');
  const errorLeadsShot = countByType(counts, 'error_leads_shot');
  const errorLeadsGoal = countByType(counts, 'error_leads_goal');
  const touchesOppositionBox = countTouchesInBoxNormalized(scopedEvents);
  const ballLoss = countByType(counts, 'ball_loss');
  const foulCommitted = countByType(counts, 'foul_committed');
  const freeKicksWon = countByType(counts, 'foul_won');
  const offsides = countByType(counts, 'offside');
  const bigChanceMetrics = buildBigChanceMetrics(scopedEvents);
  const bigChancesCreated = bigChanceMetrics.created;
  const bigChancesDetailed = bigChanceMetrics.detailedWon;
  const bigChancesWon = bigChanceMetrics.totalWon;
  const bigChancesMissed = bigChanceMetrics.missed;
  const bigChancesScored = bigChanceMetrics.scored;
  const penaltiesWon = countByType(counts, 'penalty_won');
  const penaltiesScored = scopedEvents.filter(
    (event) => event.type === 'goal' && event.source_action === 'penalty_won',
  ).length;
  const penaltiesMissed = scopedEvents.filter(
    (event) => event.type === 'shot_off' && event.source_action === 'penalty_won',
  ).length;
  const substitutions = scopedEvents.filter(
    (event) => event.type === 'substitution' && !event.is_derived,
  ).length;
  const blueCards = countByType(counts, 'blue_card');
  const yellowCards = countByType(counts, 'yellow_card');
  const redCards = countByType(counts, 'red_card');

  const statsSections = {
    shots: [
      toStatRow('total_shots', 'Total shots', totalShots, { reference: 35 }),
      toStatRow('successful_shots', 'Successful shots', successfulShots, { reference: 24 }),
      toStatRow('shot_off', 'Shots off target', shotOff, { reference: 20 }),
      toStatRow('shot_blocked', 'Blocked shots', shotBlocked, { reference: 20 }),
      toStatRow('goals', 'Goals', goals, { reference: 12 }),
      toStatRow('shot_inside_box', 'Shots inside box', shotTags.insideBox, { reference: 25 }),
      toStatRow('shot_outside_box', 'Shots outside box', shotTags.outsideBox, { reference: 25 }),
      toStatRow('shot_header', 'Headers', shotTags.header, { reference: 20 }),
      toStatRow('hit_woodwork', 'Hit the woodwork', hitWoodwork, { reference: 10 }),
    ],
    attack: [
      toStatRow('assist', 'Assists', assists, { reference: 15 }),
      toStatRow('dribbles_as', 'Dribbles', dribbleMetrics.dribbleAccuracyPct, {
        display: `${dribbleMetrics.dribbleRatio} (${dribbleMetrics.dribbleAccuracyPct}%)`,
        reference: 100,
      }),
      toStatRow('big_chance_ratio', 'Big chances', bigChancesDetailed, {
        display: `${bigChancesDetailed}/${bigChancesScored}`,
        reference: 20,
      }),
      toStatRow('penalties_ratio', 'Penalties', penaltiesWon, {
        display: `${penaltiesWon}/${penaltiesScored}`,
        reference: 12,
      }),
      toStatRow('corner_taken', 'Corners', corners, { reference: 25 }),
      toStatRow('free_kick_won', 'Free kicks', freeKicksWon, { reference: 30 }),
      toStatRow('offside', 'Offsides', offsides, { reference: 20 }),
      toStatRow('touches_box', 'Touches in opposition box', touchesOppositionBox, {
        reference: 80,
      }),
    ],
    passes: [
      toStatRow('passes_as', 'Passes', passMetrics.passAccuracyPct, {
        display: `${passMetrics.passRatio} (${passMetrics.passAccuracyPct}%)`,
        reference: 100,
      }),
      toStatRow('long_passes_as', 'Long passes', longPassMetrics.longPassAccuracyPct, {
        display: `${longPassMetrics.longPassRatio} (${longPassMetrics.longPassAccuracyPct}%)`,
        reference: 100,
      }),
      toStatRow('passes_in_final_third', 'Passes in final third', finalThirdPassMetrics.accuracyPct, {
        display: `${finalThirdPassMetrics.ratio} (${finalThirdPassMetrics.accuracyPct}%)`,
        reference: 100,
      }),
      toStatRow('crosses_as', 'Crosses', crossMetrics.crossAccuracyPct, {
        display: `${crossMetrics.crossRatio} (${crossMetrics.crossAccuracyPct}%)`,
        reference: 100,
      }),
      toStatRow('key_pass', 'Key Passes', keyPasses, { reference: 40 }),
      toStatRow('throw_in_won', 'Throw ins', throwInsWon, { reference: 25 }),
    ],
    defense: [
      toStatRow('aerial_as', 'Aerial duels', aerialMetrics.aerialAccuracyPct, {
        display: `${aerialMetrics.aerialRatio} (${aerialMetrics.aerialAccuracyPct}%)`,
        reference: 100,
      }),
      toStatRow('tackle_win', 'Tackles won', countByType(counts, 'tackle_win'), { reference: 35 }),
      toStatRow('interception', 'Interceptions', countByType(counts, 'interception'), { reference: 35 }),
      toStatRow('clearance', 'Clearances', countByType(counts, 'clearance'), { reference: 35 }),
      toStatRow('block', 'Blocks', countByType(counts, 'block'), { reference: 30 }),
      toStatRow('foul_committed', 'Fouls', foulCommitted, { reference: 25 }),
      toStatRow('error_shot', 'Errors leading to shot', errorLeadsShot, { reference: 12 }),
      toStatRow('error_goal', 'Errors leading to goal', errorLeadsGoal, { reference: 8 }),
    ],
    goalkeeping: [
      toStatRow('save', 'Saves', countByType(counts, 'save'), { reference: 20 }),
      toStatRow('goal_conceded', 'Goals conceded', countByType(counts, 'goal_conceded'), {
        reference: 12,
      }),
    ],
  };

  return {
    statsSections,
    totals: {
      goals,
      goalsConceded: countByType(counts, 'goal_conceded'),
      totalShots,
      successfulShots,
      shotOff,
      shotBlocked,
      shotInsideBox: shotTags.insideBox,
      shotOutsideBox: shotTags.outsideBox,
      shotHeader: shotTags.header,
      passSuccess: passMetrics.successfulPasses,
      passAttempts: passMetrics.passAttempts,
      passesAS: passMetrics.passRatio,
      longPassesAS: longPassMetrics.longPassRatio,
      crossesAS: crossMetrics.crossRatio,
      dribblesAS: dribbleMetrics.dribbleRatio,
      aerialAS: aerialMetrics.aerialRatio,
      keyPasses,
      assists,
      corners,
      throwInsWon,
      crosses,
      errorLeadsShot,
      errorLeadsGoal,
      touchesOppositionBox,
      duelsWon: countByType(counts, 'aerial_win') + countByType(counts, 'tackle_win'),
      ballLosses: ballLoss,
      freeKicksWon,
      offsides,
      bigChancesCreated,
      bigChancesDetailed,
      bigChancesWon,
      bigChancesMissed,
      bigChancesScored,
      penaltiesWon,
      penaltiesScored,
      penaltiesMissed,
      substitutions,
      blueCards,
      yellowCards,
      redCards,
      totalEvents: scopedEvents.length,
      totalPoints: scopedEvents.reduce((sum, event) => sum + (Number(event.points) || 0), 0),
    },
    estimated,
    counts,
  };
}

export function buildPlayerStatsRows(events, players, lineupsByMatch = {}, scope = 'all', side = 'our', options = {}) {
  const scopedSide = normalizeStatsSide(side);
  const playerEventSourceSide = scopedSide === 'opponent' ? 'opponent' : 'our';
  const scopedEvents = getScopedEvents(events, scope, playerEventSourceSide).filter((event) => Boolean(event.player_id));
  const assistAttribution = buildGoalAssistAttribution(scopedEvents);
  const playerEventMap = toPlayerEventMap(scopedEvents);
  const participation = buildPlayerParticipation(events, lineupsByMatch, scope, playerEventSourceSide, options);
  const minutesByPlayer = participation.minutesByPlayer;
  const startsByPlayer = participation.startsByPlayer;
  const subAppsByPlayer = participation.subAppsByPlayer;
  const ratingMap = derivePlayerRatings(scopedEvents).reduce((lookup, rating) => {
    lookup[rating.player_id] = rating;
    return lookup;
  }, {});

  return players
    .map((player) => {
      const playerEvents = playerEventMap[player.id] || [];
      const counts = toTypeCountMap(playerEvents);
      const passMetrics = buildPassMetrics(playerEvents, counts);
      const finalThirdPassMetrics = buildFinalThirdPassMetrics(playerEvents);
      const longPassMetrics = buildLongPassMetrics(counts);
      const crossMetrics = buildCrossMetrics(counts);
      const dribbleMetrics = buildDribbleMetrics(counts);
      const aerialMetrics = buildAerialMetrics(counts);
      const shotTags = countShotContextTags(playerEvents);
      const shotSummary = buildShotSummaryNormalized(playerEvents, { excludeOwnGoals: true });

      const { goals, shotOn, shotOff, shotBlocked, successfulShots, totalShots } = shotSummary;
      const hitWoodwork = playerEvents.filter(
        (event) => event.type === 'shot_off' && Boolean(event.hit_woodwork),
      ).length;

      const touches = playerEvents.length;
      const touchesOppositionBox = countTouchesInBoxNormalized(playerEvents);
      const duelsWon = countByType(counts, 'aerial_win') + countByType(counts, 'tackle_win');
      const ballLosses = countByType(counts, 'ball_loss');
      const xgEstimated = calculateXgFromCounts(counts);
      const blueCards = countByType(counts, 'blue_card');
      const yellowCards = countByType(counts, 'yellow_card');
      const redCards = countByType(counts, 'red_card');
      const foulWon = countByType(counts, 'foul_won');
      const bigChanceMetrics = buildBigChanceMetrics(playerEvents);
      const bigChancesCreated = bigChanceMetrics.created;
      const bigChancesDetailed = bigChanceMetrics.detailedWon;
      const bigChancesWon = bigChanceMetrics.totalWon;
      const bigChancesMissed = bigChanceMetrics.missed;
      const bigChancesScored = bigChanceMetrics.scored;
      const penaltiesWon = countByType(counts, 'penalty_won');
      const penaltiesScored = playerEvents.filter(
        (event) => event.type === 'goal' && event.source_action === 'penalty_won',
      ).length;
      const penaltiesMissed = playerEvents.filter(
        (event) => event.type === 'shot_off' && event.source_action === 'penalty_won',
      ).length;
      const ownGoals = playerEvents.filter(
        (event) => event.type === 'goal' && event.goal_source_type === 'own_goal',
      ).length;
      const maxMinuteFromEvents = playerEvents.reduce(
        (maxMinuteValue, event) => Math.max(maxMinuteValue, Number(event.minute) || 0),
        0,
      );
      const basePosition = player.primary_position || player.position || '';
      const saves = countByType(counts, 'save');
      const goalsConceded = countByType(counts, 'goal_conceded');
      const starts = startsByPlayer[player.id] || 0;
      const subApps = subAppsByPlayer[player.id] || 0;
      const timelineMinutes = minutesByPlayer[player.id];
      const minutes =
        Number.isFinite(timelineMinutes) && timelineMinutes > 0
          ? Math.round(timelineMinutes)
          : maxMinuteFromEvents;

      return {
        player_id: player.id,
        name: player.name,
        position: basePosition,
        positionLabel: basePosition || (saves > 0 || goalsConceded > 0 ? 'GK*' : '-'),
        minutes,
        starts,
        subApps,
        totalEvents: touches,
        rating: ratingMap[player.id]?.rating ?? 0,

        successfulPasses: passMetrics.successfulPasses,
        passFail: passMetrics.passFail,
        passAttempts: passMetrics.passAttempts,
        passAccuracyPct: passMetrics.passAccuracyPct,
        passesAS: passMetrics.passRatio,
        finalThirdPassSuccess: finalThirdPassMetrics.success,
        finalThirdPassFail: finalThirdPassMetrics.fail,
        finalThirdPassAttempts: finalThirdPassMetrics.attempts,
        finalThirdPassAccuracyPct: finalThirdPassMetrics.accuracyPct,
        finalThirdPassesAS: finalThirdPassMetrics.ratio,
        longPassSuccess: longPassMetrics.longPassSuccess,
        longPassFail: longPassMetrics.longPassFail,
        longPassAttempts: longPassMetrics.longPassAttempts,
        longPassAccuracyPct: longPassMetrics.longPassAccuracyPct,
        longPassesAS: longPassMetrics.longPassRatio,
        keyPasses: countByType(counts, 'key_pass'),
        assists: assistAttribution.byPlayer[player.id] || 0,

        crossSuccess: crossMetrics.crossSuccess,
        crossFail: crossMetrics.crossFail,
        crossAttempts: crossMetrics.crossAttempts,
        crossAccuracyPct: crossMetrics.crossAccuracyPct,
        crossesAS: crossMetrics.crossRatio,

        dribbleSuccess: dribbleMetrics.dribbleSuccess,
        dribbleFail: dribbleMetrics.dribbleFail,
        dribbleAttempts: dribbleMetrics.dribbleAttempts,
        dribbleAccuracyPct: dribbleMetrics.dribbleAccuracyPct,
        dribblesAS: dribbleMetrics.dribbleRatio,

        aerialWin: aerialMetrics.aerialWin,
        aerialFail: aerialMetrics.aerialFail,
        aerialAttempts: aerialMetrics.aerialAttempts,
        aerialAccuracyPct: aerialMetrics.aerialAccuracyPct,
        aerialAS: aerialMetrics.aerialRatio,

        goals,
        successfulShots,
        totalShots,
        shotOn,
        shotOff,
        shotBlocked,
        hitWoodwork,
        shotHeader: shotTags.header,
        shotInsideBox: shotTags.insideBox,
        shotOutsideBox: shotTags.outsideBox,

        tackleWin: countByType(counts, 'tackle_win'),
        interception: countByType(counts, 'interception'),
        clearance: countByType(counts, 'clearance'),
        block: countByType(counts, 'block'),
        foulCommitted: countByType(counts, 'foul_committed'),
        foulWon,
        freeKicksWon: foulWon,
        throwInsWon: countByType(counts, 'throw_in_won'),
        offsides: countByType(counts, 'offside'),
        bigChancesCreated,
        bigChancesDetailed,
        bigChancesWon,
        bigChancesMissed,
        bigChancesScored,
        penaltiesWon,
        penaltiesScored,
        penaltiesMissed,
        penaltiesSummary: `${penaltiesWon}/${penaltiesScored}/${penaltiesMissed}`,
        ownGoals,
        errorLeadsShot: countByType(counts, 'error_leads_shot'),
        errorLeadsGoal: countByType(counts, 'error_leads_goal'),
        blueCards,
        yellowCards,
        redCards,
        cardsSummary: `${blueCards}/${yellowCards}/${redCards}`,

        saves,
        goalsConceded,

        corners: countByType(counts, 'corner_taken'),
        touches,
        touchesOppositionBox,
        duels: duelsWon,
        duelsWon,
        ballLosses,
        expectedGoals: xgEstimated,
        xgEstimated,
        counts,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.totalEvents - a.totalEvents || a.name.localeCompare(b.name));
}

function formatCellValue(row, columnId) {
  if (columnId === 'player') {
    return `${row.name} (${row.position})`;
  }

  if (columnId === 'rating') {
    return row.totalEvents > 0 ? row.rating.toFixed(1) : '-';
  }

  const value = row[columnId];
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (PLAYER_STATS_EXPECTED_VALUE_COLUMNS.has(columnId)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : '-';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return value;
}

function buildPlayerStatsByTab(playerRows) {
  const byTab = {};

  PLAYER_STATS_TAB_CONFIG.forEach((tabConfig) => {
    const rows = playerRows
      .filter(tabConfig.include)
      .sort(tabConfig.sort)
      .map((row) => {
        const cells = {};
        tabConfig.columns.forEach((column) => {
          cells[column.id] = formatCellValue(row, column.id);
        });

        return {
          player_id: row.player_id,
          positionLabel: row.positionLabel || row.position || '-',
          cells,
        };
      });

    byTab[tabConfig.id] = {
      id: tabConfig.id,
      label: tabConfig.label,
      columns: tabConfig.columns,
      rows,
    };
  });

  return {
    tabs: PLAYER_STATS_TAB_CONFIG.map((tabConfig) => ({ id: tabConfig.id, label: tabConfig.label })),
    byTab,
  };
}

export function buildPlayerDetailModalData(
  playerId,
  events,
  players,
  lineupsByMatch = {},
  scope = 'all',
  side = 'our',
  options = {},
) {
  const player = players.find((entry) => entry.id === playerId);

  if (!player) {
    return null;
  }

  const row = buildPlayerStatsRows(events, players, lineupsByMatch, scope, side, options).find(
    (entry) => entry.player_id === playerId,
  );

  if (!row) {
    return {
      player,
      summary: {
        minutes: 0,
        starts: 0,
        subApps: 0,
        rating: 0,
        totalEvents: 0,
        passesAS: '0/0',
        passAccuracyPct: 0,
        crossesAS: '0/0',
        dribblesAS: '0/0',
        aerialAS: '0/0',
        cardsSummary: '0/0/0',
        penaltiesSummary: '0/0/0',
      },
      categories: [],
    };
  }

  const counts = row.counts;

  return {
    player,
    summary: {
      minutes: row.minutes,
      starts: row.starts,
      subApps: row.subApps,
      rating: row.rating,
      totalEvents: row.totalEvents,
      passesAS: row.passesAS,
      passAccuracyPct: row.passAccuracyPct,
      crossesAS: row.crossesAS,
      dribblesAS: row.dribblesAS,
      aerialAS: row.aerialAS,
      cardsSummary: row.cardsSummary,
      penaltiesSummary: row.penaltiesSummary,
    },
    categories: [
      {
        label: 'Availability',
        items: [
          { label: 'Minutes', value: row.minutes },
          { label: 'Starts', value: row.starts },
          { label: 'Sub appearances', value: row.subApps },
        ],
      },
      {
        label: 'Passing',
        items: [
          { label: 'Passes', value: row.passesAS },
          { label: 'Long passes', value: row.longPassesAS },
          { label: 'Crosses', value: row.crossesAS },
          { label: 'Successful passes', value: row.successfulPasses },
          { label: 'Failed passes', value: row.passFail },
          { label: 'Key passes', value: countByType(counts, 'key_pass') },
          { label: 'Assists', value: row.assists },
          { label: 'Ball losses', value: countByType(counts, 'ball_loss') },
        ],
      },
      {
        label: 'Attack',
        items: [
          { label: 'Dribbles', value: row.dribblesAS },
          { label: 'Big chances (create)', value: row.bigChancesCreated },
          { label: 'Big chances (detailed)', value: row.bigChancesDetailed },
          { label: 'Big chances (total)', value: row.bigChancesWon },
          { label: 'Big chances missed', value: row.bigChancesMissed },
          { label: 'Penalties won', value: row.penaltiesWon },
          { label: 'Penalties (W/S/M)', value: row.penaltiesSummary },
          { label: 'Offsides', value: row.offsides },
          { label: 'Free kicks', value: row.freeKicksWon },
          { label: 'Throw ins', value: row.throwInsWon },
          { label: 'Corners taken', value: countByType(counts, 'corner_taken') },
          { label: 'Touches in opposition box', value: row.touchesOppositionBox },
        ],
      },
      {
        label: 'Shots',
        items: [
          { label: 'Total shots', value: row.totalShots },
          { label: 'Successful shots', value: row.successfulShots },
          { label: 'Big chances (create)', value: row.bigChancesCreated },
          { label: 'Big chances (detailed)', value: row.bigChancesDetailed },
          { label: 'Big chances (total)', value: row.bigChancesWon },
          { label: 'Big chances missed', value: row.bigChancesMissed },
          { label: 'Penalties scored', value: row.penaltiesScored },
          { label: 'Penalties missed', value: row.penaltiesMissed },
          { label: 'Goals', value: row.goals },
          { label: 'Shots off target', value: countByType(counts, 'shot_off') },
          { label: 'Hit the woodwork', value: row.hitWoodwork },
          { label: 'Blocked shots', value: countByType(counts, 'shot_blocked') },
          { label: 'Headers', value: row.shotHeader },
          { label: 'Shots inside box', value: row.shotInsideBox },
          { label: 'Shots outside box', value: row.shotOutsideBox },
        ],
      },
      {
        label: 'Defense',
        items: [
          { label: 'Aerial duels', value: row.aerialAS },
          { label: 'Tackles won', value: countByType(counts, 'tackle_win') },
          { label: 'Interceptions', value: countByType(counts, 'interception') },
          { label: 'Clearances', value: countByType(counts, 'clearance') },
          { label: 'Blocks', value: countByType(counts, 'block') },
          { label: 'Fouls won', value: row.foulWon },
          { label: 'Fouls', value: countByType(counts, 'foul_committed') },
          { label: 'Errors leading to shot', value: countByType(counts, 'error_leads_shot') },
          { label: 'Errors leading to goal', value: countByType(counts, 'error_leads_goal') },
        ],
      },
      {
        label: 'Goalkeeping',
        items: [
          { label: 'Saves', value: countByType(counts, 'save') },
          { label: 'Goals conceded', value: countByType(counts, 'goal_conceded') },
        ],
      },
    ],
  };
}

function normalizeSeasonTag(value) {
  return String(value || '').trim();
}

function sortMatchesByTimeline(matches = []) {
  return [...matches].sort((matchA, matchB) => {
    if ((matchA.date || '') !== (matchB.date || '')) {
      return (matchA.date || '').localeCompare(matchB.date || '');
    }

    return (matchA.created_at || '').localeCompare(matchB.created_at || '');
  });
}

export function buildSeasonScope(matches = [], selectedSeason = 'all', includeDrafts = false) {
  const normalizedSeason = selectedSeason === 'all' ? 'all' : String(selectedSeason || '').trim();

  const filteredMatches = matches.filter((match) => {
    if (!includeDrafts && match.status !== 'completed') {
      return false;
    }

    if (normalizedSeason === 'all') {
      return true;
    }

    const matchCompetitionId = String(match.competition_id || '').trim();
    const matchCompetitionName = normalizeSeasonTag(match.competition_name);
    const matchSeasonTag = normalizeSeasonTag(match.season_tag);

    if (normalizedSeason === 'unassigned') {
      return !matchCompetitionId && !matchCompetitionName && !matchSeasonTag;
    }

    if (matchCompetitionId) {
      return matchCompetitionId === normalizedSeason;
    }

    if (matchCompetitionName) {
      return matchCompetitionName === normalizedSeason;
    }

    return matchSeasonTag === normalizeSeasonTag(normalizedSeason);
  });

  return sortMatchesByTimeline(filteredMatches);
}

export function buildSeasonTrend(matchesInScope = [], events = [], lineupsByMatch = {}) {
  void lineupsByMatch;

  const timelineMatches = sortMatchesByTimeline(matchesInScope);

  return timelineMatches.map((match, index) => {
    const matchEvents = events.filter((event) => event.match_id === match.id);
    const sectionBundle = buildStatsSections(matchEvents);

    return {
      matchId: match.id,
      order: index + 1,
      matchOrderLabel: `M${index + 1}`,
      date: match.date,
      opponent: match.opponent,
      totalPoints: sectionBundle.totals.totalPoints,
      goals: sectionBundle.totals.goals,
      xg: sectionBundle.estimated.xg,
    };
  });
}

export function buildSeasonLeaderboard(
  eventsInScope,
  players,
  lineupsByMatch = {},
  matchIdsInScope = [],
  options = {},
) {
  const scopedEvents = Array.isArray(eventsInScope) ? eventsInScope : [];
  const fallbackMatchIds = [...new Set(scopedEvents.map((event) => event.match_id).filter(Boolean))];
  const effectiveMatchIds = matchIdsInScope.length ? matchIdsInScope : fallbackMatchIds;
  const lineupsForScope = {};

  effectiveMatchIds.forEach((matchId) => {
    if (lineupsByMatch[matchId]) {
      lineupsForScope[matchId] = lineupsByMatch[matchId];
    }
  });

  return buildPlayerStatsRows(scopedEvents, players, lineupsForScope, 'all', 'our', options)
    .filter((row) => row.totalEvents > 0 || row.minutes > 0 || row.starts > 0 || row.subApps > 0)
    .sort((rowA, rowB) => rowB.rating - rowA.rating || rowB.totalEvents - rowA.totalEvents);
}

export function buildMatchSummaryTimeline(events = [], playersById = {}, matchId = '') {
  const matchEvents = events
    .filter((event) => event?.match_id === matchId)
    .filter((event) => !event.mirror_generated);
  const assistAttribution = buildGoalAssistAttribution(matchEvents);
  const scopedEvents = matchEvents
    .filter((event) => SUMMARY_TIMELINE_EVENT_TYPES.has(event.type))
    .filter((event) => {
      if (event.type === 'goal') {
        return true;
      }

      if (event.type === 'penalty_won') {
        return !event.is_derived && event.penalty_outcome === 'missed';
      }

      return !event.is_derived;
    });
  const sorted = sortEventsByTimeline(scopedEvents);

  let runningOurScore = 0;
  let runningOppScore = 0;
  let firstHalfOurGoals = 0;
  let firstHalfOppGoals = 0;
  let secondHalfOurGoals = 0;
  let secondHalfOppGoals = 0;

  const rows = sorted.map((event) => {
    const eventSide = getEventSide(event);
    const isFirstHalf = getSummaryHalfFromEvent(event) === 'first';
    let eventKind = 'event';
    let displayLabel = getPlayerName(playersById, event.player_id, eventSide);
    let scoreBadge = '';

    if (event.type === 'goal') {
      eventKind = event.source_action === 'penalty_won' ? 'penalty_goal' : 'goal';
      if (event.goal_source_type === 'own_goal') {
        displayLabel = 'Own Goal';
      }
      if (eventSide === 'opponent') {
        runningOppScore += 1;
        if (isFirstHalf) {
          firstHalfOppGoals += 1;
        } else {
          secondHalfOppGoals += 1;
        }
      } else {
        runningOurScore += 1;
        if (isFirstHalf) {
          firstHalfOurGoals += 1;
        } else {
          secondHalfOurGoals += 1;
        }
      }
      scoreBadge = `${runningOurScore}-${runningOppScore}`;

      const assistPlayerId = assistAttribution.byGoalId[event.id] || '';
      if (assistPlayerId) {
        const assistName = getPlayerName(playersById, assistPlayerId, eventSide);
        displayLabel = `${displayLabel} (${assistName})`;
      }
    } else if (event.type === 'substitution') {
      eventKind = 'substitution';
      const playerInLabel = getPlayerName(playersById, event.player_in_id, eventSide);
      const playerOutLabel = getPlayerName(playersById, event.player_out_id || event.player_id, eventSide);
      displayLabel = `${playerInLabel} (${playerOutLabel})`;
    } else if (event.type === 'penalty_won') {
      eventKind = 'penalty_miss';
      displayLabel = getPlayerName(playersById, event.penalty_taker_id || event.player_id, eventSide);
    } else if (event.type === 'blue_card' || event.type === 'yellow_card' || event.type === 'red_card') {
      eventKind = 'card';
    }

    return {
      id: event.id,
      side: eventSide,
      minuteLabel: formatSummaryMinuteLabel(event),
      displayLabel,
      eventKind,
      scoreBadge,
      half: isFirstHalf ? 'first' : 'second',
      cardType:
        event.type === 'blue_card' || event.type === 'yellow_card' || event.type === 'red_card'
          ? event.type
          : '',
    };
  });

  return {
    firstHalfScore: `${firstHalfOurGoals}-${firstHalfOppGoals}`,
    secondHalfScore: `${secondHalfOurGoals}-${secondHalfOppGoals}`,
    firstHalfEvents: rows.filter((row) => row.half === 'first'),
    secondHalfEvents: rows.filter((row) => row.half === 'second'),
    totalEvents: rows.length,
  };
}

export function buildDashboardMetrics(events, players, lineupsByMatch = {}, scope = 'all', side = 'our', options = {}) {
  const scopedSide = normalizeStatsSide(side);
  const scopedAllSideEvents = scope === 'all' ? events : events.filter((event) => event.match_id === scope);
  const possessionTimeline = buildTimelinePossession(scopedAllSideEvents, { kickoffSide: 'our' });
  const scopedEvents = getScopedEvents(events, scope, scopedSide);
  const sectionBundle = buildStatsSections(scopedEvents, { timelinePossession: possessionTimeline });

  const eventTypeCounts = Object.entries(sectionBundle.counts)
    .map(([type, count]) => ({
      type,
      label: EVENT_TYPE_LABELS[type] || type,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const zoneCounts = ZONES.map((zone) => ({
    id: zone.id,
    label: zone.label,
    count: scopedEvents.filter((event) => event.zone === zone.id).length,
  }));

  const minuteBins = buildMinuteBins(scopedEvents, 5);
  const playerRows =
    scopedSide === 'opponent'
      ? []
      : buildPlayerStatsRows(events, players, lineupsByMatch, scope, 'our', options);

  return {
    totals: sectionBundle.totals,
    estimated: sectionBundle.estimated,
    statsSections: sectionBundle.statsSections,
    statsSectionOrder: STATS_SECTION_ORDER,
    statsSectionLabels: STATS_SECTION_LABELS,
    eventTypeCounts,
    zoneCounts,
    minuteBins,
    side: scopedSide,
    playerRows,
    playerStats: buildPlayerStatsByTab(playerRows),
  };
}
