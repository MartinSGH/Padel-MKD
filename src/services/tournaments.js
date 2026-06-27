import { supabase } from "../lib/supabaseClient";

const TOURNAMENT_FILES_BUCKET = "tournament-files";

// Upload a tournament image or PDF to Storage and return its public URL.
// `folder` is e.g. "images" or "documents". Admin-only at the RLS level.
export const uploadTournamentFile = async (file, folder = "files") => {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(TOURNAMENT_FILES_BUCKET)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(TOURNAMENT_FILES_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

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
