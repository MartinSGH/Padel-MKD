import { supabase } from "../lib/supabaseClient";

// Safe, names-only list of all players — used to populate the partner picker.
// Uses a SECURITY DEFINER RPC so every logged-in user can read it (a plain
// view respects profiles RLS, which hid the list from non-admin players).
export const getPlayerDirectory = async () => {
  const { data, error } = await supabase.rpc("get_players");
  if (error) throw error;
  return data || [];
};

// Registration rows for a tournament. Row-level security limits this to the
// admin (all rows) or the current user's own entry — non-admins won't get the
// full list of names.
export const getTournamentRegistrations = async (tournamentId) => {
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

// Public count of registered pairs (no names exposed). Everyone can read this.
export const getRegistrationCount = async (tournamentId) => {
  const { data, error } = await supabase.rpc("get_registration_count", {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
  return data || 0;
};

// Players already in a pair, per category — used to exclude them from the
// partner picker. Returns { player_id, category } rows only, no names, so a
// player taken in one category can still be picked in another.
export const getTakenPlayerIds = async (tournamentId) => {
  const { data, error } = await supabase.rpc("get_taken_player_ids", {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
  return data || [];
};

// Register the current (logged-in) user with a chosen partner.
export const registerForTournament = async ({
  tournamentId,
  partnerId,
  category,
}) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("You must be logged in to register.");

  const { data, error } = await supabase
    .from("registrations")
    .insert([
      {
        tournament_id: tournamentId,
        player_id: user.id,
        partner_id: partnerId || null,
        category: category || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Invite / change / remove the partner on an existing registration. Passing a
// falsy partnerId removes the partner. Goes through the set_partner RPC so the
// invited player gets a notification and the pairing starts as "pending".
export const updateRegistrationPartner = async (registrationId, partnerId) => {
  const { error } = await supabase.rpc("set_partner", {
    p_registration_id: registrationId,
    p_partner_id: partnerId || null,
  });
  if (error) throw error;
};

// The invited player accepts (true) or declines (false) a partner invitation.
export const respondToPartnerInvite = async (registrationId, accept) => {
  const { error } = await supabase.rpc("respond_to_partner_invite", {
    p_registration_id: registrationId,
    p_accept: accept,
  });
  if (error) throw error;
};

export const withdrawRegistration = async (id) => {
  const { error } = await supabase.from("registrations").delete().eq("id", id);
  if (error) throw error;
};
