
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildDashboardMetrics, buildSeasonLeaderboard, buildSeasonScope, buildSeasonTrend } from '../domain/dashboardStats';

const TEAM_TABS = ['profile', 'squad', 'opponents', 'season'];

function normalizePosition(value) {
  return String(value || '').trim().toUpperCase();
}

function formatCompetitionLabel(competition) {
  if (!competition) return 'Unassigned';
  return `${competition.type === 'cup' ? 'Cup' : 'League'} • ${competition.name}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function toMultiValue(value) {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function TeamView({
  teamProfile,
  matches,
  players,
  allEvents,
  lineupsByMatch = {},
  competitions = [],
  opponents = [],
  teamScope,
  onTeamScopeChange,
  onSaveTeamProfile,
  onCreatePlayer,
  onUpdatePlayer,
  onTogglePlayerActive,
  onCreateOpponent,
  onUpdateOpponent,
  onToggleOpponentActive,
  onUpdateCompetition,
  onDownloadBackup,
  onImportBackup,
  dataSafetyStatus = null,
  blockedDeactivatePlayerIds,
}) {
  const [tab, setTab] = useState('profile');
  const [error, setError] = useState('');
  const [profileOverrides, setProfileOverrides] = useState({});
  const [playerDrafts, setPlayerDrafts] = useState({});
  const [opponentDrafts, setOpponentDrafts] = useState({});
  const [competitionDrafts, setCompetitionDrafts] = useState({});
  const [newPlayer, setNewPlayer] = useState({ name: '', shirt_number: '', primary_position: '', photo_data_url: '' });
  const [newOpponent, setNewOpponent] = useState({ name: '', logo_data_url: '', competition_ids: [] });
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);

  const playersById = useMemo(
    () =>
      players.reduce((lookup, player) => {
        lookup[player.id] = player;
        return lookup;
      }, {}),
    [players],
  );

  const competitionsById = useMemo(
    () =>
      competitions.reduce((lookup, competition) => {
        lookup[competition.id] = competition;
        return lookup;
      }, {}),
    [competitions],
  );
  const matchesById = useMemo(
    () =>
      matches.reduce((lookup, match) => {
        lookup[match.id] = match;
        return lookup;
      }, {}),
    [matches],
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [players]);

  const scopeOptions = useMemo(
    () => [
      { id: 'all', label: 'All Competitions' },
      ...competitions.map((competition) => ({ id: competition.id, label: formatCompetitionLabel(competition) })),
      { id: 'unassigned', label: 'Unassigned' },
    ],
    [competitions],
  );

  const safeScope = useMemo(
    () => (scopeOptions.some((option) => option.id === teamScope) ? teamScope : 'all'),
    [scopeOptions, teamScope],
  );

  useEffect(() => {
    if (safeScope !== teamScope) onTeamScopeChange(safeScope);
  }, [onTeamScopeChange, safeScope, teamScope]);

  const seasonMatches = useMemo(
    () => buildSeasonScope(matches, safeScope, includeDrafts),
    [includeDrafts, matches, safeScope],
  );

  const seasonMatchIds = useMemo(() => new Set(seasonMatches.map((match) => match.id)), [seasonMatches]);
  const seasonEvents = useMemo(() => allEvents.filter((event) => seasonMatchIds.has(event.match_id)), [allEvents, seasonMatchIds]);
  const seasonMetrics = useMemo(
    () => buildDashboardMetrics(seasonEvents, players, lineupsByMatch, 'all', 'our', { matchesById }),
    [lineupsByMatch, matchesById, players, seasonEvents],
  );
  const seasonTrend = useMemo(
    () => buildSeasonTrend(seasonMatches, allEvents, lineupsByMatch),
    [allEvents, lineupsByMatch, seasonMatches],
  );
  const seasonLeaderboard = useMemo(
    () =>
      buildSeasonLeaderboard(seasonEvents, players, lineupsByMatch, [...seasonMatchIds], {
        matchesById,
      }),
    [lineupsByMatch, matchesById, players, seasonEvents, seasonMatchIds],
  );
  const profileDraft = useMemo(
    () => ({
      name: profileOverrides.name ?? teamProfile?.name ?? 'Moda Old Boys',
      logo_url: profileOverrides.logo_url ?? teamProfile?.logo_url ?? '',
      primary_color: profileOverrides.primary_color ?? teamProfile?.primary_color ?? '#1f6a3a',
    }),
    [profileOverrides, teamProfile],
  );

  const onUploadProfileLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const logo = await fileToDataUrl(file);
      setProfileOverrides((current) => ({ ...current, logo_url: logo }));
    } catch {
      setError('Could not read team logo file');
    }
  };

  const onSaveProfile = async () => {
    if (!String(profileDraft.name || '').trim()) {
      setError('Team name is required');
      return;
    }
    try {
      setError('');
      await onSaveTeamProfile(profileDraft);
      setProfileOverrides({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save team profile');
    }
  };

  const onUploadNewPlayerPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const photo = await fileToDataUrl(file);
      setNewPlayer((current) => ({ ...current, photo_data_url: photo }));
    } catch {
      setError('Could not read player photo');
    }
  };

  const onCreatePlayerRow = async () => {
    if (!String(newPlayer.name || '').trim()) {
      setError('Player name is required');
      return;
    }
    try {
      setError('');
      await onCreatePlayer({
        name: newPlayer.name,
        shirt_number: String(newPlayer.shirt_number || '').trim(),
        primary_position: normalizePosition(newPlayer.primary_position),
        photo_data_url: newPlayer.photo_data_url,
      });
      setNewPlayer({ name: '', shirt_number: '', primary_position: '', photo_data_url: '' });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create player');
    }
  };

  const onSavePlayerRow = async (playerId) => {
    const sourcePlayer = playersById[playerId];
    const draft = playerDrafts[playerId] || {
      name: sourcePlayer?.name || '',
      shirt_number: String(sourcePlayer?.shirt_number || '').trim(),
      primary_position: normalizePosition(sourcePlayer?.primary_position || sourcePlayer?.position || ''),
    };
    try {
      setError('');
      await onUpdatePlayer(playerId, {
        name: draft.name || '',
        shirt_number: String(draft.shirt_number || '').trim(),
        primary_position: normalizePosition(draft.primary_position || ''),
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update player');
    }
  };

  const onUploadPlayerPhoto = async (playerId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const photo = await fileToDataUrl(file);
      await onUpdatePlayer(playerId, { photo_data_url: photo });
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Could not update player photo');
    }
  };

  const onUploadNewOpponentLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const logo = await fileToDataUrl(file);
      setNewOpponent((current) => ({ ...current, logo_data_url: logo }));
    } catch {
      setError('Could not read opponent logo');
    }
  };

  const onCreateOpponentRow = async () => {
    if (!String(newOpponent.name || '').trim()) {
      setError('Opponent name is required');
      return;
    }
    try {
      setError('');
      await onCreateOpponent(newOpponent);
      setNewOpponent({ name: '', logo_data_url: '', competition_ids: [] });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create opponent');
    }
  };

  const onSaveOpponentRow = async (opponentId) => {
    const sourceOpponent = opponents.find((opponent) => opponent.id === opponentId);
    const draft = opponentDrafts[opponentId] || {
      name: sourceOpponent?.name || '',
      competition_ids: Array.isArray(sourceOpponent?.competition_ids) ? sourceOpponent.competition_ids : [],
    };
    try {
      setError('');
      await onUpdateOpponent(opponentId, {
        name: draft.name || '',
        competition_ids: Array.isArray(draft.competition_ids) ? draft.competition_ids : [],
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update opponent');
    }
  };

  const onUploadOpponentLogo = async (opponentId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const logo = await fileToDataUrl(file);
      await onUpdateOpponent(opponentId, { logo_data_url: logo });
    } catch (logoError) {
      setError(logoError instanceof Error ? logoError.message : 'Could not update opponent logo');
    }
  };

  const onDownloadBackupClick = async () => {
    if (!onDownloadBackup || isBackingUp || isImportingBackup) {
      return;
    }

    try {
      setError('');
      setIsBackingUp(true);
      await onDownloadBackup();
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Could not download backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const onImportBackupFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onImportBackup || isImportingBackup || isBackingUp) {
      return;
    }

    try {
      setError('');
      setIsImportingBackup(true);
      await onImportBackup(file);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not import backup');
    } finally {
      setIsImportingBackup(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.1 }}>
      <Paper sx={{ p: 1 }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {TEAM_TABS.map((item) => (
            <Button key={item} size="small" variant={tab === item ? 'contained' : 'outlined'} onClick={() => setTab(item)} sx={{ minHeight: 32 }}>
              {item.toUpperCase()}
            </Button>
          ))}
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {tab === 'profile' ? (
        <Paper sx={{ p: 1.05, display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">TEAM PROFILE</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Avatar src={profileDraft.logo_url || undefined} alt={profileDraft.name} sx={{ width: 58, height: 58 }} />
            <Button variant="outlined" component="label">
              Upload Team Logo
              <input hidden type="file" accept="image/*" onChange={onUploadProfileLogo} />
            </Button>
          </Stack>
          <TextField size="small" label="Team Name" value={profileDraft.name} onChange={(event) => setProfileOverrides((current) => ({ ...current, name: event.target.value }))} />
          <TextField size="small" label="Primary Color" value={profileDraft.primary_color} onChange={(event) => setProfileOverrides((current) => ({ ...current, primary_color: event.target.value }))} />
          <Button variant="contained" onClick={() => void onSaveProfile()}>Save</Button>

          <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.8 }}>
            <Typography variant="subtitle2">Data Safety</Typography>
            <Typography variant="body2" color="text.secondary">
              Download JSON backups before risky actions and restore with merge import.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
              <Button
                variant="outlined"
                onClick={() => void onDownloadBackupClick()}
                disabled={isBackingUp || isImportingBackup || !onDownloadBackup}
              >
                {isBackingUp ? 'Downloading...' : 'Download Backup'}
              </Button>
              <Button
                variant="outlined"
                component="label"
                disabled={isBackingUp || isImportingBackup || !onImportBackup}
              >
                {isImportingBackup ? 'Importing...' : 'Import Backup (.json)'}
                <input hidden type="file" accept="application/json,.json" onChange={(event) => { void onImportBackupFile(event); }} />
              </Button>
            </Stack>
            {dataSafetyStatus?.message ? (
              <Alert severity={dataSafetyStatus.severity || 'info'}>
                {dataSafetyStatus.message}
              </Alert>
            ) : null}
          </Paper>
        </Paper>
      ) : null}

      {tab === 'squad' ? (
        <Paper sx={{ p: 1.05, display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">SQUAD</Typography>

          <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.8 }}>
            <Typography variant="subtitle2">Add Player</Typography>
            <TextField size="small" label="Name" value={newPlayer.name} onChange={(event) => setNewPlayer((current) => ({ ...current, name: event.target.value }))} />
            <TextField size="small" label="Shirt Number" value={newPlayer.shirt_number} onChange={(event) => setNewPlayer((current) => ({ ...current, shirt_number: event.target.value }))} />
            <TextField size="small" label="Primary Position" value={newPlayer.primary_position} onChange={(event) => setNewPlayer((current) => ({ ...current, primary_position: event.target.value }))} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" component="label">
                Upload Photo
                <input hidden type="file" accept="image/*" onChange={onUploadNewPlayerPhoto} />
              </Button>
              {newPlayer.photo_data_url ? <Chip size="small" color="success" label="Photo selected" /> : null}
            </Stack>
            <Button variant="contained" onClick={() => void onCreatePlayerRow()}>Add Player</Button>
          </Paper>

          <Typography variant="subtitle2">Players</Typography>
          {sortedPlayers.map((player) => {
            const draft = playerDrafts[player.id] || {
              name: player.name || '',
              shirt_number: String(player.shirt_number || '').trim(),
              primary_position: normalizePosition(player.primary_position || player.position || ''),
            };
            const extraPositions = Array.isArray(player.extra_positions) ? player.extra_positions : [];
            const blocked = blockedDeactivatePlayerIds?.has?.(player.id) || false;

            return (
              <Paper key={player.id} variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.8 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.8} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <Stack direction="row" spacing={0.7} alignItems="center" sx={{ minWidth: 220 }}>
                    <Avatar src={player.photo_data_url || undefined} alt={player.name} sx={{ width: 30, height: 30 }} />
                    <Typography sx={{ fontWeight: 700 }}>{player.name}</Typography>
                    {player.shirt_number ? <Chip size="small" variant="outlined" label={`#${player.shirt_number}`} /> : null}
                    <Chip size="small" label={player.is_active === false ? 'Inactive' : 'Active'} color={player.is_active === false ? 'default' : 'success'} />
                  </Stack>
                  <TextField size="small" label="Name" value={draft.name} onChange={(event) => setPlayerDrafts((current) => ({ ...current, [player.id]: { ...current[player.id], name: event.target.value } }))} sx={{ flex: 1 }} />
                  <TextField size="small" label="Shirt" value={draft.shirt_number} onChange={(event) => setPlayerDrafts((current) => ({ ...current, [player.id]: { ...current[player.id], shirt_number: event.target.value } }))} sx={{ width: 90 }} />
                  <TextField size="small" label="Primary" value={draft.primary_position} onChange={(event) => setPlayerDrafts((current) => ({ ...current, [player.id]: { ...current[player.id], primary_position: event.target.value } }))} sx={{ width: 120 }} />
                </Stack>
                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                  {(extraPositions.length ? extraPositions : ['-']).map((position) => <Chip key={`${player.id}-${position}`} size="small" variant="outlined" label={`Extra: ${position}`} />)}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
                  <Button variant="outlined" onClick={() => void onSavePlayerRow(player.id)}>Save</Button>
                  <Button variant="outlined" component="label">
                    Upload Photo
                    <input hidden type="file" accept="image/*" onChange={(event) => { void onUploadPlayerPhoto(player.id, event); }} />
                  </Button>
                  <Button variant="outlined" color={player.is_active === false ? 'primary' : 'error'} disabled={player.is_active !== false && blocked} onClick={() => void onTogglePlayerActive(player.id, player.is_active === false)}>
                    {player.is_active === false ? 'Reactivate' : 'Deactivate'}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Paper>
      ) : null}

      {tab === 'opponents' ? (
        <Paper sx={{ p: 1.05, display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">OPPONENTS</Typography>

          <Paper variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.8 }}>
            <Typography variant="subtitle2">Add Opponent</Typography>
            <TextField size="small" label="Name" value={newOpponent.name} onChange={(event) => setNewOpponent((current) => ({ ...current, name: event.target.value }))} />
            <FormControl size="small" fullWidth>
              <InputLabel>Competitions</InputLabel>
              <Select
                multiple
                label="Competitions"
                value={newOpponent.competition_ids}
                onChange={(event) => setNewOpponent((current) => ({ ...current, competition_ids: toMultiValue(event.target.value) }))}
                renderValue={(selected) => {
                  const selectedIds = Array.isArray(selected) ? selected : [];
                  if (!selectedIds.length) return 'No competition';
                  return selectedIds.map((competitionId) => competitionsById[competitionId]?.name || competitionId).join(', ');
                }}
              >
                {competitions.map((competition) => <MenuItem key={competition.id} value={competition.id}>{formatCompetitionLabel(competition)}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" component="label">
              Upload Logo
              <input hidden type="file" accept="image/*" onChange={onUploadNewOpponentLogo} />
            </Button>
            <Button variant="contained" onClick={() => void onCreateOpponentRow()}>Add Opponent</Button>
          </Paper>

          <Typography variant="subtitle2">Competitions</Typography>
          {competitions.map((competition) => {
            const draft = competitionDrafts[competition.id] || { name: competition.name || '', type: competition.type === 'cup' ? 'cup' : 'league' };

            return (
              <Paper key={competition.id} variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.8 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.8}>
                  <FormControl size="small" sx={{ width: 130 }}>
                    <InputLabel>Type</InputLabel>
                    <Select label="Type" value={draft.type} onChange={(event) => setCompetitionDrafts((current) => ({ ...current, [competition.id]: { ...current[competition.id], type: event.target.value } }))}>
                      <MenuItem value="league">League</MenuItem>
                      <MenuItem value="cup">Cup</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Name" value={draft.name} onChange={(event) => setCompetitionDrafts((current) => ({ ...current, [competition.id]: { ...current[competition.id], name: event.target.value } }))} sx={{ flex: 1 }} />
                  <Button variant="outlined" onClick={() => void onUpdateCompetition(competition.id, { name: draft.name, type: draft.type })}>Save</Button>
                </Stack>
              </Paper>
            );
          })}

          <Typography variant="subtitle2">Opponents</Typography>
          {opponents.map((opponent) => {
            const draft = opponentDrafts[opponent.id] || { name: opponent.name || '', competition_ids: [] };
            return (
              <Paper key={opponent.id} variant="outlined" sx={{ p: 1, display: 'grid', gap: 0.8 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.8} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <Stack direction="row" spacing={0.7} alignItems="center" sx={{ minWidth: 220 }}>
                    <Avatar src={opponent.logo_data_url || undefined} alt={opponent.name} sx={{ width: 30, height: 30 }} />
                    <Typography sx={{ fontWeight: 700 }}>{opponent.name}</Typography>
                    <Chip size="small" label={opponent.is_active === false ? 'Inactive' : 'Active'} color={opponent.is_active === false ? 'default' : 'success'} />
                  </Stack>
                  <TextField size="small" label="Name" value={draft.name} onChange={(event) => setOpponentDrafts((current) => ({ ...current, [opponent.id]: { ...current[opponent.id], name: event.target.value } }))} sx={{ flex: 1 }} />
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Competitions</InputLabel>
                    <Select multiple label="Competitions" value={draft.competition_ids} onChange={(event) => setOpponentDrafts((current) => ({ ...current, [opponent.id]: { ...current[opponent.id], competition_ids: toMultiValue(event.target.value) } }))}
                      renderValue={(selected) => {
                        const selectedIds = Array.isArray(selected) ? selected : [];
                        if (!selectedIds.length) return 'No competition';
                        return selectedIds.map((competitionId) => competitionsById[competitionId]?.name || competitionId).join(', ');
                      }}
                    >
                      {competitions.map((competition) => <MenuItem key={competition.id} value={competition.id}>{formatCompetitionLabel(competition)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
                  <Button variant="outlined" onClick={() => void onSaveOpponentRow(opponent.id)}>Save</Button>
                  <Button variant="outlined" component="label">
                    Upload Logo
                    <input hidden type="file" accept="image/*" onChange={(event) => { void onUploadOpponentLogo(opponent.id, event); }} />
                  </Button>
                  <Button variant="outlined" color={opponent.is_active === false ? 'primary' : 'error'} onClick={() => void onToggleOpponentActive(opponent.id, opponent.is_active === false)}>
                    {opponent.is_active === false ? 'Reactivate' : 'Deactivate'}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Paper>
      ) : null}

      {tab === 'season' ? (
        <Paper sx={{ p: 1.05, display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">SEASON DASHBOARD</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 260 } }}>
              <InputLabel>Competition Scope</InputLabel>
              <Select label="Competition Scope" value={safeScope} onChange={(event) => onTeamScopeChange(event.target.value)}>
                {scopeOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Switch checked={includeDrafts} onChange={(event) => setIncludeDrafts(event.target.checked)} />
              <Typography variant="body2">Include Drafts</Typography>
            </Stack>
          </Stack>

          <Box sx={{ display: 'grid', gap: 0.8, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Matches</Typography><Typography variant="h6">{seasonMatches.length}</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Goals</Typography><Typography variant="h6">{seasonMetrics.totals.goals}</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Shots</Typography><Typography variant="h6">{seasonMetrics.totals.totalShots}</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Total Points</Typography><Typography variant="h6">{seasonMetrics.totals.totalPoints}</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Estimated xG</Typography><Typography variant="h6">{seasonMetrics.estimated.xg}</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Conversion</Typography><Typography variant="h6">{seasonMetrics.estimated.conversionPct}%</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Substitutions</Typography><Typography variant="h6">{seasonMetrics.totals.substitutions}</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">Passes (A/S)</Typography><Typography variant="h6">{seasonMetrics.totals.passesAS}</Typography></Paper>
          </Box>

          <Paper variant="outlined" sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.8 }}>Trend (M1/M2/...)</Typography>
            <Box sx={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonTrend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="matchOrderLabel" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="totalPoints" stroke="#1f6a3a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="goals" stroke="#9f1641" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="xg" stroke="#1d4e89" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Typography variant="subtitle2">Player Leaderboard</Typography>
          {!seasonLeaderboard.length ? <Alert severity="info">No player data in this scope.</Alert> : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell><TableCell align="right">Rating</TableCell><TableCell align="right">Minutes</TableCell><TableCell align="right">Goals</TableCell><TableCell align="right">Assists</TableCell><TableCell align="right">Passes (A/S)</TableCell><TableCell align="right">Big Chances</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seasonLeaderboard.map((row) => {
                    const player = playersById[row.player_id];
                    return (
                      <TableRow key={row.player_id}>
                        <TableCell>
                          <Stack direction="row" spacing={0.7} alignItems="center">
                            <Avatar src={player?.photo_data_url || undefined} alt={row.name} sx={{ width: 24, height: 24 }} />
                            <span>{row.name}</span>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{row.totalEvents > 0 ? row.rating.toFixed(1) : '-'}</TableCell>
                        <TableCell align="right">{row.minutes}</TableCell>
                        <TableCell align="right">{row.goals}</TableCell>
                        <TableCell align="right">{row.assists}</TableCell>
                        <TableCell align="right">{row.passesAS}</TableCell>
                        <TableCell align="right">{row.bigChancesWon}/{row.bigChancesMissed}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="subtitle2">Match List</Typography>
          <Stack spacing={0.7}>
            {seasonMatches.map((match) => {
              const competitionLabel = match.competition_id ? formatCompetitionLabel(competitionsById[match.competition_id]) : match.competition_name || 'Unassigned';
              const roundLabel = match.competition_type === 'cup' ? 'Round' : 'Week';
              return (
                <Paper key={match.id} variant="outlined" sx={{ p: 0.9 }}>
                  <Typography sx={{ fontWeight: 700 }}>{match.date} - {match.opponent || 'TBD'}</Typography>
                  <Typography variant="body2" color="text.secondary">{competitionLabel} - {roundLabel}: {match.round_number || '-'} - {match.status}</Typography>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
}

