import { supabase } from "../lib/supabaseClient";

// Safe, names-only list of all players — used to populate the partner picker
// and to resolve player/partner names in the participant list.
export const getPlayerDirectory = async () => {
  const { data, error } = await supabase
    .from("player_directory")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data;
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

export const withdrawRegistration = async (id) => {
  const { error } = await supabase.from("registrations").delete().eq("id", id);
  if (error) throw error;
};
