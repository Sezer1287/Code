import { EVENT_TYPE_LABELS, ZONES } from './constants';

const zoneLabelById = ZONES.reduce((lookup, zone) => {
  lookup[zone.id] = zone.label;
  return lookup;
}, {});
const HALF_MINUTES = 25;
const FULL_TIME_MINUTES = 50;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatClockLabelFromMinuteSecond(minute, second) {
  return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function formatEventClockLabel(event) {
  const minuteValue = Math.max(0, Number(event.minute) || 0);
  const secondValue = clamp(Number(event.second) || 0, 0, 59);

  if (event?.event_period === 'first_half' && (minuteValue > HALF_MINUTES || (minuteValue === HALF_MINUTES && secondValue > 0))) {
    const extraSeconds = Math.max(0, (minuteValue - HALF_MINUTES) * 60 + secondValue);
    const extraMinute = Math.floor(extraSeconds / 60);
    const extraSecond = extraSeconds % 60;
    return `${HALF_MINUTES}+${formatClockLabelFromMinuteSecond(extraMinute, extraSecond)}`;
  }

  if (event?.event_period === 'second_half' && (minuteValue > FULL_TIME_MINUTES || (minuteValue === FULL_TIME_MINUTES && secondValue > 0))) {
    const extraSeconds = Math.max(0, (minuteValue - FULL_TIME_MINUTES) * 60 + secondValue);
    const extraMinute = Math.floor(extraSeconds / 60);
    const extraSecond = extraSeconds % 60;
    return `${FULL_TIME_MINUTES}+${formatClockLabelFromMinuteSecond(extraMinute, extraSecond)}`;
  }

  return formatClockLabelFromMinuteSecond(minuteValue, secondValue);
}

/**
 * @typedef {Object} EventCardViewModel
 * @property {string} id
 * @property {string} clockLabel
 * @property {string} playerLabel
 * @property {string} sideLabel
 * @property {string} eventLabel
 * @property {string} zoneLabel
 * @property {string} pointsLabel
 * @property {boolean} isSelected
 */

/**
 * @typedef {Object} UIState
 * @property {'balanced'} density
 * @property {boolean} shortcutsExpanded
 * @property {'all' | 'our' | 'opponent'} feedFilter
 * @property {boolean} attributionExpanded
 * @property {boolean} focusMode
 */

/**
 * @param {{ id: string, minute: number, second: number, points: number, player_id: string, type: string, zone: string, event_period?: string }} event
 * @param {Record<string, {name: string}>} playersById
 * @param {boolean} isSelected
 * @returns {EventCardViewModel}
 */
export function createEventCardViewModel(event, playersById, isSelected) {
  const points = Number(event.points) || 0;

  return {
    id: event.id,
    clockLabel: formatEventClockLabel(event),
    playerLabel: playersById[event.player_id]?.name || (event.player_id ? event.player_id : 'Unassigned'),
    sideLabel: event.side === 'opponent' ? 'Opponent' : 'Our Team',
    eventLabel: EVENT_TYPE_LABELS[event.type] || event.type,
    zoneLabel: zoneLabelById[event.zone] || event.zone,
    pointsLabel: points > 0 ? `+${points}` : String(points),
    isSelected,
  };
}

/**
 * @returns {UIState}
 */
export function createInitialUIState() {
  return {
    density: 'balanced',
    shortcutsExpanded: false,
    feedFilter: 'all',
    attributionExpanded: false,
    focusMode: false,
  };
}

