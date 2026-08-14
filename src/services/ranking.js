import { supabase } from "../lib/supabaseClient";

// Public ranking: every player's points across all tournaments, summed and
// sorted. Returns [{ player_id, player_name, points }].
export const getRanking = async () => {
  const { data, error } = await supabase
    .from("tournament_points")
    .select("player_id, player_name, points");
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

  return [...totals.values()].sort((a, b) => b.points - a.points);
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
      points: r.points,
    }))
  );
  if (insErr) throw insErr;
};
