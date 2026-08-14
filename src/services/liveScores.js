import { supabase } from "../lib/supabaseClient";
import { recomputeDraw, finishedMapFromRows } from "../lib/drawAdvance";
import {
  computePoints,
  buildLabelToPlayers,
  THIRD_PLACE_ROUND,
} from "../lib/points";
import { writeTournamentPoints } from "./ranking";
import { getTournamentRegistrations } from "./registrations";

// One live match by its bracket position.
export const getMatch = async (tournamentId, round, matchIndex) => {
  const { data, error } = await supabase
    .from("live_scores")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("round", round)
    .eq("match_index", matchIndex)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// Admin: start (or restart) a match. Upserts the positional row → status live.
export const startMatch = async ({
  tournamentId,
  round,
  matchIndex,
  teamA,
  teamB,
  config,
  state,
}) => {
  const { data, error } = await supabase
    .from("live_scores")
    .upsert(
      {
        tournament_id: tournamentId,
        round,
        match_index: matchIndex,
        team_a: teamA,
        team_b: teamB,
        config,
        state,
        status: "live",
        winner: null,
        started_at: new Date().toISOString(),
        ended_at: null,
      },
      { onConflict: "tournament_id,round,match_index" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Admin: persist the running scoring state (called on every point / undo).
export const saveState = async (id, state) => {
  const { error } = await supabase
    .from("live_scores")
    .update({ state })
    .eq("id", id);
  if (error) throw error;
};

// After any result change: (1) reflow the draw so winners advance and the
// 3rd-place match fills, and (2) recompute the tournament's ranking points.
const afterResultChange = async (tournamentId) => {
  const [{ data: rows, error: e1 }, { data: tn, error: e2 }] =
    await Promise.all([
      supabase
        .from("live_scores")
        .select("round, match_index, status, winner, team_a, team_b")
        .eq("tournament_id", tournamentId),
      supabase.from("tournaments").select("draw").eq("id", tournamentId).single(),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const draw = tn?.draw;

  // 1) advance the draw (via an RPC so referees — who can't update tournaments
  // directly — can also finish matches; it only touches the draw column).
  if (draw) {
    const nextDraw = recomputeDraw(draw, finishedMapFromRows(rows || []));
    const { error: drawErr } = await supabase.rpc("set_tournament_draw", {
      p_tournament_id: tournamentId,
      p_draw: nextDraw,
    });
    if (drawErr) throw drawErr;
  }

  // 2) recompute ranking points from the finished matches
  const finished = (rows || []).filter((r) => r.status === "finished");
  const regs = await getTournamentRegistrations(tournamentId).catch(() => []);
  const labelToPlayers = buildLabelToPlayers(regs);
  const getMatchCount = (round) =>
    round === THIRD_PLACE_ROUND ? 0 : draw?.rounds?.[round]?.length ?? 0;
  const points = computePoints(finished, labelToPlayers, getMatchCount);
  await writeTournamentPoints(tournamentId, points);
};

// Admin: finish a match with the final state → mark finished + advance the draw.
export const endMatch = async (id, tournamentId, state, winner) => {
  const { error } = await supabase
    .from("live_scores")
    .update({
      state,
      status: "finished",
      winner,
      ended_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await afterResultChange(tournamentId);
};

// Admin: discard a match entirely (reset it back to "not started"). Removes the
// row and reflows the draw so any winner it had advanced is cleared.
export const discardMatch = async (id, tournamentId) => {
  const { error } = await supabase.from("live_scores").delete().eq("id", id);
  if (error) throw error;
  await afterResultChange(tournamentId);
};

// Admin: edit an already-finished match → save + reflow the draw.
export const editMatch = async (id, tournamentId, state, winner) => {
  const { error } = await supabase
    .from("live_scores")
    .update({ state, winner, status: winner ? "finished" : "live" })
    .eq("id", id);
  if (error) throw error;
  await afterResultChange(tournamentId);
};

// Status + live score of every started match in one tournament (to show the
// live result directly on the bracket, e.g. on a big screen).
export const getTournamentMatches = async (tournamentId) => {
  const { data, error } = await supabase
    .from("live_scores")
    .select("round, match_index, status, winner, state")
    .eq("tournament_id", tournamentId);
  if (error) throw error;
  return data || [];
};

// All matches currently in progress (any tournament), with the tournament name.
export const getLiveMatches = async () => {
  const { data, error } = await supabase
    .from("live_scores")
    .select("*, tournaments(name)")
    .eq("status", "live")
    .order("started_at", { ascending: true });
  if (error) throw error;
  return data || [];
};

// Realtime + polling fallback for a single match. Returns an unsubscribe fn.
export const subscribeToMatch = (tournamentId, round, matchIndex, onChange) => {
  const channel = supabase
    .channel(`live-${tournamentId}-${round}-${matchIndex}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_scores",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        const row = payload.new || payload.old;
        if (row && row.round === round && row.match_index === matchIndex) {
          onChange();
        }
      }
    )
    .subscribe();
  const poll = setInterval(onChange, 5000);
  return () => {
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
};

// Realtime + polling fallback for every match in one tournament.
export const subscribeTournament = (tournamentId, onChange) => {
  const channel = supabase
    .channel(`live-tn-${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_scores",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onChange()
    )
    .subscribe();
  const poll = setInterval(onChange, 6000);
  return () => {
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
};

// Realtime + polling fallback for the live-matches list. Returns unsubscribe fn.
export const subscribeToLive = (onChange) => {
  const channel = supabase
    .channel("live-matches")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_scores" },
      () => onChange()
    )
    .subscribe();
  const poll = setInterval(onChange, 8000);
  return () => {
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
};
