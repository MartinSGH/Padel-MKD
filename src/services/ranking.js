import { supabase } from "../lib/supabaseClient";

// Public ranking for one category ("Men's pairs" / "Women's pairs"): every
// player's points in it across all tournaments, summed and sorted.
// Returns [{ player_id, player_name, points }].
export const getRanking = async (category) => {
  const { data, error } = await supabase
    .from("tournament_points")
    .select("player_id, player_name, points")
    .eq("category", category);
  if (error) throw error;

  const totals = new Map();
  (data || []).forEach((row) => {
    const cur = totals.get(row.player_id) || {
      player_id: row.player_id,
      player_name: row.player_name,
      points: 0,
    };
    cur.points += row.points || 0;
    if (row.player_name) cur.player_name = row.player_name;
    totals.set(row.player_id, cur);
  });

  // Highest points first; tied players alphabetically so their order is stable.
  return [...totals.values()].sort(
    (a, b) =>
      b.points - a.points ||
      (a.player_name || "").localeCompare(b.player_name || "")
  );
};

// Every player's ranking points, for seeding the draw / ordering pair lists.
// Returns Map player_id → { total, byCategory: { [category]: points } }.
export const getPointsByPlayer = async () => {
  const PAGE = 1000; // Supabase caps a single select at 1000 rows
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tournament_points")
      .select("player_id, category, points")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }

  const map = new Map();
  rows.forEach((row) => {
    const cur = map.get(row.player_id) || { total: 0, byCategory: {} };
    const pts = row.points || 0;
    cur.total += pts;
    cur.byCategory[row.category] = (cur.byCategory[row.category] || 0) + pts;
    map.set(row.player_id, cur);
  });
  return map;
};

// A single player's total ranking points (for their profile).
export const getPlayerPoints = async (playerId) => {
  const { data, error } = await supabase
    .from("tournament_points")
    .select("points")
    .eq("player_id", playerId);
  if (error) throw error;
  return (data || []).reduce((sum, r) => sum + (r.points || 0), 0);
};

// Admin: replace a tournament's points rows with the freshly computed set.
export const writeTournamentPoints = async (tournamentId, rows) => {
  const { error: delErr } = await supabase
    .from("tournament_points")
    .delete()
    .eq("tournament_id", tournamentId);
  if (delErr) throw delErr;

  if (!rows.length) return;
  const { error: insErr } = await supabase.from("tournament_points").insert(
    rows.map((r) => ({
      tournament_id: tournamentId,
      player_id: r.player_id,
      player_name: r.player_name,
      category: r.category || "",
      points: r.points,
    }))
  );
  if (insErr) throw insErr;
};

// Admin: correct a player's Rank List total in one category. The total is the
// sum of the player's per-tournament rows, so the difference goes onto those
// rows: an increase is added to the most recent one, a decrease is taken off
// them newest-first (never below 0). profiles.total_points follows through the
// sync trigger.
export const setPlayerRankingPoints = async (playerId, category, newTotal) => {
  const { data, error } = await supabase
    .from("tournament_points")
    .select("tournament_id, points, updated_at")
    .eq("player_id", playerId)
    .eq("category", category)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) throw new Error("No ranking points found for this player.");

  let delta = newTotal - data.reduce((sum, r) => sum + (r.points || 0), 0);
  const changes = [];
  if (delta > 0) {
    changes.push({ row: data[0], points: (data[0].points || 0) + delta });
  } else {
    for (const row of data) {
      if (delta === 0) break;
      const take = Math.min(row.points || 0, -delta);
      if (take > 0) changes.push({ row, points: row.points - take });
      delta += take;
    }
  }

  for (const { row, points } of changes) {
    const { data: updated, error: upErr } = await supabase
      .from("tournament_points")
      .update({ points, updated_at: new Date().toISOString() })
      .eq("tournament_id", row.tournament_id)
      .eq("player_id", playerId)
      .eq("category", category)
      .select("player_id");
    if (upErr) throw upErr;
    // RLS blocks a non-admin silently (no error, no rows).
    if (!updated?.length) throw new Error("Not allowed to edit ranking points.");
  }
};
