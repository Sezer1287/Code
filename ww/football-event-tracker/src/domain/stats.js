export function deriveTeamStats(events) {
  return events.reduce(
    (stats, event) => {
      stats.total_events += 1;
      stats.total_points += Number(event.points) || 0;
      stats.by_type[event.type] = (stats.by_type[event.type] || 0) + 1;
      return stats;
    },
    {
      total_events: 0,
      total_points: 0,
      by_type: {},
    },
  );
}

export function derivePlayerRatings(events) {
  const perPlayer = new Map();

  events.forEach((event) => {
    const current = perPlayer.get(event.player_id) || {
      player_id: event.player_id,
      events: 0,
      points: 0,
    };

    current.events += 1;
    current.points += Number(event.points) || 0;

    perPlayer.set(event.player_id, current);
  });

  return [...perPlayer.values()]
    .map((entry) => ({
      ...entry,
      rating: Number((6 + entry.points / Math.max(entry.events, 1)).toFixed(2)),
    }))
    .sort((a, b) => b.rating - a.rating);
}
