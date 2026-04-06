import { SEEDED_PLAYERS } from '../domain/constants';

const DB_NAME = 'football_event_tracker';
const DB_VERSION = 3;
const BACKUP_SCHEMA_VERSION = 1;

const STORES = {
  players: 'players',
  matches: 'matches',
  lineups: 'lineups',
  events: 'events',
  settings: 'settings',
  competitions: 'competitions',
  opponents: 'opponents',
};

const TEAM_PROFILE_KEY = 'team_profile';
const DEFAULT_TEAM_PROFILE = {
  id: TEAM_PROFILE_KEY,
  name: 'Moda Old Boys',
  logo_url: '',
  primary_color: '#1f6a3a',
};

let dbPromise;

const BACKUP_STORE_ORDER = [
  STORES.players,
  STORES.matches,
  STORES.lineups,
  STORES.events,
  STORES.settings,
  STORES.competitions,
  STORES.opponents,
];

function toPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'));
  });
}

function slugifyBackupReason(value) {
  const normalized = String(value || 'manual')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'manual';
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.minute !== b.minute) {
      return a.minute - b.minute;
    }

    if (a.second !== b.second) {
      return a.second - b.second;
    }

    return a.created_at.localeCompare(b.created_at);
  });
}

function sanitizePlayerBySide(event) {
  if (event?.side === 'opponent') {
    return { ...event, player_id: '' };
  }

  return event;
}

function sortLineups(lineups) {
  return [...lineups].sort((a, b) => {
    if (a.slot_order !== b.slot_order) {
      return a.slot_order - b.slot_order;
    }

    return a.created_at.localeCompare(b.created_at);
  });
}

function openDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        // Migration guard: keep upgrades additive (new stores/indexes only).
        // Avoid destructive operations such as deleteObjectStore/clear.
        const database = request.result;
        const upgradeTransaction = request.transaction;

        let playersStore;
        if (!database.objectStoreNames.contains(STORES.players)) {
          playersStore = database.createObjectStore(STORES.players, { keyPath: 'id' });
          playersStore.createIndex('order', 'order', { unique: false });
        } else if (upgradeTransaction) {
          playersStore = upgradeTransaction.objectStore(STORES.players);
        }

        if (playersStore && !playersStore.indexNames.contains('order')) {
          playersStore.createIndex('order', 'order', { unique: false });
        }
        if (playersStore && !playersStore.indexNames.contains('is_active')) {
          playersStore.createIndex('is_active', 'is_active', { unique: false });
        }

        if (!database.objectStoreNames.contains(STORES.matches)) {
          const matchesStore = database.createObjectStore(STORES.matches, { keyPath: 'id' });
          matchesStore.createIndex('status', 'status', { unique: false });
          matchesStore.createIndex('date', 'date', { unique: false });
        }

        if (!database.objectStoreNames.contains(STORES.lineups)) {
          const lineupsStore = database.createObjectStore(STORES.lineups, { keyPath: 'id' });
          lineupsStore.createIndex('match_id', 'match_id', { unique: false });
          lineupsStore.createIndex('player_id', 'player_id', { unique: false });
        }

        if (!database.objectStoreNames.contains(STORES.events)) {
          const eventsStore = database.createObjectStore(STORES.events, { keyPath: 'id' });
          eventsStore.createIndex('match_id', 'match_id', { unique: false });
          eventsStore.createIndex('player_id', 'player_id', { unique: false });
          eventsStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!database.objectStoreNames.contains(STORES.settings)) {
          database.createObjectStore(STORES.settings, { keyPath: 'id' });
        }

        let competitionsStore;
        if (!database.objectStoreNames.contains(STORES.competitions)) {
          competitionsStore = database.createObjectStore(STORES.competitions, { keyPath: 'id' });
          competitionsStore.createIndex('type', 'type', { unique: false });
          competitionsStore.createIndex('name', 'name', { unique: false });
        } else if (upgradeTransaction) {
          competitionsStore = upgradeTransaction.objectStore(STORES.competitions);
        }

        if (competitionsStore && !competitionsStore.indexNames.contains('type')) {
          competitionsStore.createIndex('type', 'type', { unique: false });
        }
        if (competitionsStore && !competitionsStore.indexNames.contains('name')) {
          competitionsStore.createIndex('name', 'name', { unique: false });
        }

        let opponentsStore;
        if (!database.objectStoreNames.contains(STORES.opponents)) {
          opponentsStore = database.createObjectStore(STORES.opponents, { keyPath: 'id' });
          opponentsStore.createIndex('is_active', 'is_active', { unique: false });
          opponentsStore.createIndex('name', 'name', { unique: false });
        } else if (upgradeTransaction) {
          opponentsStore = upgradeTransaction.objectStore(STORES.opponents);
        }

        if (opponentsStore && !opponentsStore.indexNames.contains('is_active')) {
          opponentsStore.createIndex('is_active', 'is_active', { unique: false });
        }
        if (opponentsStore && !opponentsStore.indexNames.contains('name')) {
          opponentsStore.createIndex('name', 'name', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

async function withStore(storeName, mode, callback) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await callback(store, transaction);
  await waitForTransaction(transaction);
  return result;
}

async function seedPlayersIfNeeded() {
  const playerCount = await withStore(STORES.players, 'readonly', (store) => toPromise(store.count()));

  if (playerCount > 0) {
    return;
  }

  await withStore(STORES.players, 'readwrite', (store) => {
    SEEDED_PLAYERS.forEach((player) => {
      store.put({
        ...player,
        primary_position: normalizePosition(player.primary_position || player.position || ''),
        extra_positions: [],
        is_active: player.is_active !== false,
      });
    });
  });
}

async function seedTeamProfileIfNeeded() {
  const existingProfile = await withStore(STORES.settings, 'readonly', (store) =>
    toPromise(store.get(TEAM_PROFILE_KEY)),
  );

  if (existingProfile) {
    return;
  }

  const now = new Date().toISOString();
  await withStore(STORES.settings, 'readwrite', (store) => {
    store.put({
      ...DEFAULT_TEAM_PROFILE,
      updated_at: now,
    });
  });
}

function normalizePosition(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeShirtNumber(value) {
  return String(value ?? '').trim();
}

function normalizePositionList(values, excludedValue = '') {
  const excluded = normalizePosition(excludedValue);
  const list = Array.isArray(values) ? values : [];
  const normalized = list
    .map((item) => normalizePosition(item))
    .filter(Boolean)
    .filter((item) => item !== excluded);
  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
}

function normalizePlayerRecord(player) {
  const primaryPosition = normalizePosition(player.primary_position || player.position || '');
  const extraPositions = normalizePositionList(player.extra_positions, primaryPosition);

  return {
    ...player,
    shirt_number: normalizeShirtNumber(player.shirt_number || ''),
    primary_position: primaryPosition,
    position: primaryPosition,
    extra_positions: extraPositions,
    is_active: player.is_active !== false,
  };
}

function normalizeCompetitionType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'cup' ? 'cup' : 'league';
}

export async function initDatabase() {
  await openDatabase();
  await seedPlayersIfNeeded();
  await seedTeamProfileIfNeeded();
}

function normalizeImportedRecord(storeName, record) {
  if (!record || typeof record !== 'object' || record.id === undefined || record.id === null) {
    return null;
  }

  if (storeName === STORES.players) {
    return normalizePlayerRecord(record);
  }

  if (storeName === STORES.events) {
    return sanitizePlayerBySide({
      ...record,
      minute: Number(record.minute) || 0,
      second: Number(record.second) || 0,
      points: Number(record.points) || 0,
      created_at: record.created_at || new Date().toISOString(),
    });
  }

  if (storeName === STORES.competitions) {
    return {
      ...record,
      type: normalizeCompetitionType(record.type),
      name: String(record.name || '').trim(),
    };
  }

  if (storeName === STORES.opponents) {
    return {
      ...record,
      name: String(record.name || '').trim(),
      competition_ids: [...new Set(Array.isArray(record.competition_ids) ? record.competition_ids.filter(Boolean) : [])],
      is_active: record.is_active !== false,
    };
  }

  return record;
}

function parseBackupPayload(payload) {
  const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    throw new Error('Invalid backup payload');
  }

  if (!parsedPayload.stores || typeof parsedPayload.stores !== 'object') {
    throw new Error('Invalid backup payload: missing stores');
  }

  return parsedPayload;
}

export async function exportDatabaseBackup() {
  await initDatabase();

  const stores = {};
  for (const storeName of BACKUP_STORE_ORDER) {
    stores[storeName] = await withStore(storeName, 'readonly', (store) => toPromise(store.getAll()));
  }

  return {
    meta: {
      app: 'football_event_tracker',
      exported_at: new Date().toISOString(),
      db_name: DB_NAME,
      db_version: DB_VERSION,
      schema_version: BACKUP_SCHEMA_VERSION,
    },
    stores,
  };
}

export async function importDatabaseBackup(payload, options = {}) {
  await initDatabase();

  const mode = options.mode || 'merge';
  if (mode !== 'merge') {
    throw new Error('Only merge import mode is supported');
  }

  const parsedPayload = parseBackupPayload(payload);
  const result = {
    mode,
    inserted: 0,
    updated: 0,
    skipped: 0,
    byStore: {},
  };

  for (const storeName of BACKUP_STORE_ORDER) {
    const incomingRecords = Array.isArray(parsedPayload.stores[storeName]) ? parsedPayload.stores[storeName] : [];
    const existingKeys = await withStore(storeName, 'readonly', (store) => toPromise(store.getAllKeys()));
    const existingKeySet = new Set(existingKeys);
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    await withStore(storeName, 'readwrite', (store) => {
      incomingRecords.forEach((record) => {
        const normalizedRecord = normalizeImportedRecord(storeName, record);
        if (!normalizedRecord || normalizedRecord.id === undefined || normalizedRecord.id === null) {
          skipped += 1;
          return;
        }

        if (existingKeySet.has(normalizedRecord.id)) {
          updated += 1;
        } else {
          inserted += 1;
          existingKeySet.add(normalizedRecord.id);
        }

        store.put(normalizedRecord);
      });
    });

    result.inserted += inserted;
    result.updated += updated;
    result.skipped += skipped;
    result.byStore[storeName] = {
      total: incomingRecords.length,
      inserted,
      updated,
      skipped,
    };
  }

  return result;
}

export function downloadBackupFile(payload, reason = 'manual') {
  const serialized = JSON.stringify(payload, null, 2);
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reasonSlug = slugifyBackupReason(reason);

  anchor.href = url;
  anchor.download = `football_event_tracker_backup_${reasonSlug}_${timestamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function listPlayers() {
  const players = await withStore(STORES.players, 'readonly', (store) => toPromise(store.getAll()));
  return players
    .map((player) => normalizePlayerRecord(player))
    .sort((a, b) => {
      if ((a.order ?? 0) !== (b.order ?? 0)) {
        return (a.order ?? 0) - (b.order ?? 0);
      }

      return (a.name || '').localeCompare(b.name || '');
    });
}

export async function createPlayer({
  name,
  shirt_number = '',
  position,
  primary_position,
  extra_positions = [],
  photo_data_url = '',
  is_active = true,
}) {
  const normalizedName = String(name || '').trim();
  const normalizedPosition = normalizePosition(primary_position || position || '');

  if (!normalizedName) {
    throw new Error('Player name is required');
  }

  const currentPlayers = await listPlayers();
  const nextOrder = currentPlayers.reduce((maxOrder, player) => Math.max(maxOrder, Number(player.order) || 0), 0) + 1;
  const now = new Date().toISOString();

  const player = {
    id: createId('player'),
    name: normalizedName,
    shirt_number: normalizeShirtNumber(shirt_number),
    primary_position: normalizedPosition,
    position: normalizedPosition,
    extra_positions: normalizePositionList(extra_positions, normalizedPosition),
    photo_data_url: String(photo_data_url || ''),
    order: nextOrder,
    is_active: Boolean(is_active),
    created_at: now,
    updated_at: now,
  };

  await withStore(STORES.players, 'readwrite', (store) => {
    store.put(player);
  });

  return normalizePlayerRecord(player);
}

export async function updatePlayer(playerId, patch = {}) {
  const existingPlayer = await withStore(STORES.players, 'readonly', (store) => toPromise(store.get(playerId)));

  if (!existingPlayer) {
    throw new Error('Player not found');
  }

  const nextName = patch.name !== undefined ? String(patch.name || '').trim() : existingPlayer.name;
  const nextPrimaryPosition = normalizePosition(
    patch.primary_position !== undefined
      ? patch.primary_position
      : patch.position !== undefined
      ? patch.position
      : existingPlayer.primary_position || existingPlayer.position,
  );
  const nextExtraPositions = normalizePositionList(
    patch.extra_positions !== undefined ? patch.extra_positions : existingPlayer.extra_positions,
    nextPrimaryPosition,
  );
  const nextShirtNumber =
    patch.shirt_number !== undefined
      ? normalizeShirtNumber(patch.shirt_number)
      : normalizeShirtNumber(existingPlayer.shirt_number || '');
  const nextPhotoDataUrl =
    patch.photo_data_url !== undefined ? String(patch.photo_data_url || '') : String(existingPlayer.photo_data_url || '');

  if (!nextName) {
    throw new Error('Player name is required');
  }

  const updatedPlayer = {
    ...existingPlayer,
    ...patch,
    name: nextName,
    shirt_number: nextShirtNumber,
    primary_position: nextPrimaryPosition,
    position: nextPrimaryPosition,
    extra_positions: nextExtraPositions,
    photo_data_url: nextPhotoDataUrl,
    is_active: patch.is_active !== undefined ? Boolean(patch.is_active) : existingPlayer.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  await withStore(STORES.players, 'readwrite', (store) => {
    store.put(updatedPlayer);
  });

  return normalizePlayerRecord(updatedPlayer);
}

export async function togglePlayerActive(playerId, isActive) {
  return updatePlayer(playerId, { is_active: Boolean(isActive) });
}

export async function getTeamProfile() {
  const profile = await withStore(STORES.settings, 'readonly', (store) =>
    toPromise(store.get(TEAM_PROFILE_KEY)),
  );

  return {
    ...DEFAULT_TEAM_PROFILE,
    ...(profile || {}),
    name: String(profile?.name || DEFAULT_TEAM_PROFILE.name).trim() || DEFAULT_TEAM_PROFILE.name,
    logo_url: String(profile?.logo_url || ''),
    primary_color: String(profile?.primary_color || DEFAULT_TEAM_PROFILE.primary_color),
  };
}

export async function saveTeamProfile(patch = {}) {
  const existingProfile = await getTeamProfile();
  const nextProfile = {
    ...existingProfile,
    ...patch,
    id: TEAM_PROFILE_KEY,
    name: String((patch.name ?? existingProfile.name) || '').trim() || DEFAULT_TEAM_PROFILE.name,
    logo_url: String(patch.logo_url ?? existingProfile.logo_url ?? ''),
    primary_color: String(patch.primary_color ?? existingProfile.primary_color ?? DEFAULT_TEAM_PROFILE.primary_color),
    updated_at: new Date().toISOString(),
  };

  await withStore(STORES.settings, 'readwrite', (store) => {
    store.put(nextProfile);
  });

  return nextProfile;
}

export async function listCompetitions() {
  const competitions = await withStore(STORES.competitions, 'readonly', (store) => toPromise(store.getAll()));
  return [...competitions].sort((competitionA, competitionB) => {
    if ((competitionA.type || '') !== (competitionB.type || '')) {
      return (competitionA.type || '').localeCompare(competitionB.type || '');
    }

    return (competitionA.name || '').localeCompare(competitionB.name || '');
  });
}

export async function createCompetition({ type = 'league', name }) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    throw new Error('Competition name is required');
  }

  const now = new Date().toISOString();
  const competition = {
    id: createId('competition'),
    type: normalizeCompetitionType(type),
    name: normalizedName,
    created_at: now,
    updated_at: now,
  };

  await withStore(STORES.competitions, 'readwrite', (store) => {
    store.put(competition);
  });

  return competition;
}

export async function updateCompetition(competitionId, patch = {}) {
  const existingCompetition = await withStore(STORES.competitions, 'readonly', (store) =>
    toPromise(store.get(competitionId)),
  );

  if (!existingCompetition) {
    throw new Error('Competition not found');
  }

  const nextName = patch.name !== undefined ? String(patch.name || '').trim() : existingCompetition.name;
  if (!nextName) {
    throw new Error('Competition name is required');
  }

  const updatedCompetition = {
    ...existingCompetition,
    ...patch,
    type: patch.type !== undefined ? normalizeCompetitionType(patch.type) : normalizeCompetitionType(existingCompetition.type),
    name: nextName,
    updated_at: new Date().toISOString(),
  };

  await withStore(STORES.competitions, 'readwrite', (store) => {
    store.put(updatedCompetition);
  });

  return updatedCompetition;
}

function normalizeCompetitionIds(values = []) {
  const source = Array.isArray(values) ? values : [];
  return [...new Set(source.map((value) => String(value || '').trim()).filter(Boolean))];
}

export async function listOpponents() {
  const opponents = await withStore(STORES.opponents, 'readonly', (store) => toPromise(store.getAll()));
  return [...opponents]
    .map((opponent) => ({
      ...opponent,
      logo_data_url: String(opponent.logo_data_url || ''),
      competition_ids: normalizeCompetitionIds(opponent.competition_ids),
      is_active: opponent.is_active !== false,
    }))
    .sort((opponentA, opponentB) => (opponentA.name || '').localeCompare(opponentB.name || ''));
}

export async function createOpponent({
  name,
  logo_data_url = '',
  competition_ids = [],
  is_active = true,
}) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    throw new Error('Opponent name is required');
  }

  const now = new Date().toISOString();
  const opponent = {
    id: createId('opponent'),
    name: normalizedName,
    logo_data_url: String(logo_data_url || ''),
    competition_ids: normalizeCompetitionIds(competition_ids),
    is_active: Boolean(is_active),
    created_at: now,
    updated_at: now,
  };

  await withStore(STORES.opponents, 'readwrite', (store) => {
    store.put(opponent);
  });

  return opponent;
}

export async function updateOpponent(opponentId, patch = {}) {
  const existingOpponent = await withStore(STORES.opponents, 'readonly', (store) =>
    toPromise(store.get(opponentId)),
  );

  if (!existingOpponent) {
    throw new Error('Opponent not found');
  }

  const nextName = patch.name !== undefined ? String(patch.name || '').trim() : existingOpponent.name;
  if (!nextName) {
    throw new Error('Opponent name is required');
  }

  const updatedOpponent = {
    ...existingOpponent,
    ...patch,
    name: nextName,
    logo_data_url:
      patch.logo_data_url !== undefined ? String(patch.logo_data_url || '') : String(existingOpponent.logo_data_url || ''),
    competition_ids:
      patch.competition_ids !== undefined
        ? normalizeCompetitionIds(patch.competition_ids)
        : normalizeCompetitionIds(existingOpponent.competition_ids),
    is_active: patch.is_active !== undefined ? Boolean(patch.is_active) : existingOpponent.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  await withStore(STORES.opponents, 'readwrite', (store) => {
    store.put(updatedOpponent);
  });

  return updatedOpponent;
}

export async function toggleOpponentActive(opponentId, isActive) {
  return updateOpponent(opponentId, { is_active: Boolean(isActive) });
}

export async function listMatches() {
  const matches = await withStore(STORES.matches, 'readonly', (store) => toPromise(store.getAll()));
  return sortMatches(matches);
}

export async function getMatch(matchId) {
  return withStore(STORES.matches, 'readonly', (store) => toPromise(store.get(matchId)));
}

export async function getLatestDraftMatch() {
  const matches = await listMatches();
  return matches.find((match) => match.status === 'draft') ?? null;
}

export async function createDraftMatch(
  {
    date,
    opponent,
    competition_id = '',
    competition_type = '',
    competition_name = '',
    round_number = '',
    opponent_formation = '',
    opponent_id = '',
    opponent_logo_data_url = '',
    season_tag = '',
    team_logo_url = '',
    opponent_logo_url = '',
  },
  playerIds = [],
) {
  const now = new Date().toISOString();
  const normalizedRoundNumber = Number(round_number);
  const match = {
    id: createId('match'),
    date,
    opponent: opponent?.trim() || 'TBD',
    competition_id: String(competition_id || '').trim(),
    competition_type: String(competition_type || '').trim(),
    competition_name: String(competition_name || '').trim(),
    round_number: Number.isFinite(normalizedRoundNumber) && normalizedRoundNumber > 0 ? normalizedRoundNumber : undefined,
    opponent_formation: String(opponent_formation || '').trim(),
    opponent_id: String(opponent_id || '').trim(),
    opponent_logo_data_url: String(opponent_logo_data_url || ''),
    team_logo_url: team_logo_url?.trim() || '',
    opponent_logo_url: opponent_logo_url?.trim() || '',
    season_tag: String(season_tag || '').trim(),
    phase: 'first_half',
    status: 'draft',
    created_at: now,
  };

  const database = await openDatabase();
  const transaction = database.transaction([STORES.matches, STORES.lineups], 'readwrite');

  transaction.objectStore(STORES.matches).put(match);

  const lineupsStore = transaction.objectStore(STORES.lineups);
  playerIds.forEach((playerId) => {
    lineupsStore.put({
      id: createId('lineup'),
      match_id: match.id,
      player_id: playerId,
      role: 'starter',
      created_at: now,
    });
  });

  await waitForTransaction(transaction);
  return match;
}

export async function updateMatch(matchId, patch) {
  const existingMatch = await getMatch(matchId);

  if (!existingMatch) {
    throw new Error('Match not found');
  }

  const updatedMatch = {
    ...existingMatch,
    ...patch,
  };

  await withStore(STORES.matches, 'readwrite', (store) => {
    store.put(updatedMatch);
  });

  return updatedMatch;
}

export async function updateMatchStatus(matchId, status) {
  return updateMatch(matchId, { status });
}

export async function listLineupsByMatch(matchId) {
  const lineups = await withStore(STORES.lineups, 'readonly', (store) =>
    toPromise(store.index('match_id').getAll(matchId)),
  );

  return sortLineups(lineups);
}

export async function replaceLineup(matchId, lineupEntries) {
  const existingLineups = await listLineupsByMatch(matchId);
  const now = new Date().toISOString();

  await withStore(STORES.lineups, 'readwrite', (store) => {
    existingLineups.forEach((lineup) => {
      store.delete(lineup.id);
    });

    lineupEntries.forEach((entry) => {
      store.put({
        id: entry.id ?? createId('lineup'),
        match_id: matchId,
        player_id: entry.player_id,
        role: entry.role ?? 'starter',
        slot_id: entry.slot_id,
        slot_label: entry.slot_label,
        slot_order: entry.slot_order,
        row_index: entry.row_index,
        column_index: entry.column_index,
        created_at: entry.created_at ?? now,
      });
    });
  });

  return listLineupsByMatch(matchId);
}

export async function listEventsByMatch(matchId) {
  const events = await withStore(STORES.events, 'readonly', (store) =>
    toPromise(store.index('match_id').getAll(matchId)),
  );

  return sortEvents(events);
}

export async function createEvent(eventData) {
  const event = sanitizePlayerBySide({
    ...eventData,
    id: eventData.id ?? createId('event'),
    minute: Number(eventData.minute),
    second: Number(eventData.second),
    points: Number(eventData.points),
    created_at: eventData.created_at ?? new Date().toISOString(),
  });

  await withStore(STORES.events, 'readwrite', (store) => {
    store.put(event);
  });

  return event;
}

export async function saveEvent(eventData) {
  const event = sanitizePlayerBySide({
    ...eventData,
    minute: Number(eventData.minute),
    second: Number(eventData.second),
    points: Number(eventData.points),
  });

  await withStore(STORES.events, 'readwrite', (store) => {
    store.put(event);
  });

  return event;
}

export async function deleteEvent(eventId) {
  await withStore(STORES.events, 'readwrite', (store) => {
    store.delete(eventId);
  });
}

export async function deleteDraftMatchCascade(matchId) {
  const targetMatch = await getMatch(matchId);
  if (!targetMatch) {
    throw new Error('Match not found');
  }
  if (targetMatch.status !== 'draft') {
    throw new Error('Only draft matches can be deleted');
  }

  const [lineups, events] = await Promise.all([listLineupsByMatch(matchId), listEventsByMatch(matchId)]);
  const database = await openDatabase();
  const transaction = database.transaction([STORES.matches, STORES.lineups, STORES.events], 'readwrite');
  const matchesStore = transaction.objectStore(STORES.matches);
  const lineupsStore = transaction.objectStore(STORES.lineups);
  const eventsStore = transaction.objectStore(STORES.events);

  lineups.forEach((lineup) => {
    lineupsStore.delete(lineup.id);
  });
  events.forEach((event) => {
    eventsStore.delete(event.id);
  });
  matchesStore.delete(matchId);

  await waitForTransaction(transaction);
}

export { STORES, sortEvents, sortLineups, sortMatches };
