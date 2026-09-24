import { supabase } from "../lib/supabaseClient";
import {
  withCategoryDraw,
  withoutCategoryDraw,
  renameCategoryDraw,
} from "../lib/drawSet";

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

// ---- Per-category draws (see src/lib/drawSet.js) -------------------------
// Each one re-reads the CURRENT draw column first, so publishing one category
// never overwrites another category's draw (or results advanced meanwhile).
const updateDrawColumn = async (id, change) => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("draw")
    .eq("id", id)
    .single();
  if (error) throw error;
  return updateTournament(id, { draw: change(data?.draw ?? null) });
};

// Publish / replace the draw of one category (null category = uncategorized).
export const saveCategoryDraw = (id, category, draw) =>
  updateDrawColumn(id, (cur) => withCategoryDraw(cur, category, draw));

// Remove one category's draw; the others stay published.
export const removeCategoryDraw = (id, category) =>
  updateDrawColumn(id, (cur) => withoutCategoryDraw(cur, category));

// Re-label a draw's category, keeping its results attached.
export const setDrawCategory = (id, fromCategory, toCategory) =>
  updateDrawColumn(id, (cur) =>
    renameCategoryDraw(cur, fromCategory, toCategory)
  );
