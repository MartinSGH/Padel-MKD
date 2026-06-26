import { supabase } from "../lib/supabaseClient";

const CLUB_LOGO_BUCKET = "club-logos";

// Public read — used by the landing carousel and the Clubs page.
export const getAllClubs = async () => {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

// Upload a logo image to Supabase Storage and return its public URL.
// Admin-only at the RLS level (see supabase/clubs_setup.sql).
export const uploadClubLogo = async (file) => {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(CLUB_LOGO_BUCKET)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(CLUB_LOGO_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Insert a new club. `club` = { name, address, hours, phone, email, logo_url, display_order }
export const addClub = async (club) => {
  const { data, error } = await supabase
    .from("clubs")
    .insert([club])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteClub = async (id) => {
  const { error } = await supabase.from("clubs").delete().eq("id", id);
  if (error) throw error;
};
