import { supabase } from "../lib/supabaseClient";

// Public read — used by the landing section, the Tournaments page and detail page.
export const getAllTournaments = async () => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
};

export const getTournamentById = async (id) => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

// Admin-only at the RLS level (see supabase/tournaments_setup.sql).
export const addTournament = async (tournament) => {
  const { data, error } = await supabase
    .from("tournaments")
    .insert([tournament])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTournament = async (id, fields) => {
  const { data, error } = await supabase
    .from("tournaments")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTournament = async (id) => {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  if (error) throw error;
};
