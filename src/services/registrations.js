import { supabase } from "../lib/supabaseClient";

// Safe, names-only list of all players — used to populate the partner picker.
// Uses a SECURITY DEFINER RPC so every logged-in user can read it (a plain
// view respects profiles RLS, which hid the list from non-admin players).
export const getPlayerDirectory = async () => {
  const { data, error } = await supabase.rpc("get_players");
  if (error) throw error;
  return data || [];
};

// All registrations (pairs) for a single tournament.
export const getTournamentRegistrations = async (tournamentId) => {
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
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

// Add / change / remove the partner on an existing registration. Passing a
// falsy partnerId removes the partner. The DB trigger keeps partner_name in sync.
export const updateRegistrationPartner = async (registrationId, partnerId) => {
  const { error } = await supabase
    .from("registrations")
    .update({ partner_id: partnerId || null })
    .eq("id", registrationId);
  if (error) throw error;
};

export const withdrawRegistration = async (id) => {
  const { error } = await supabase.from("registrations").delete().eq("id", id);
  if (error) throw error;
};
