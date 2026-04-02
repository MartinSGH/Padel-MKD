import { supabase } from "../lib/supabaseClient";

export const createPointSubmission = async ({
  tournament_name,
  tournament_link,
  tournament_date,
  requested_points,
}) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("point_submissions")
    .insert([
      {
        player_id: user.id,
        tournament_name,
        tournament_link,
        tournament_date,
        requested_points: Number(requested_points),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getMySubmissions = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("point_submissions")
    .select("*")
    .eq("player_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data;
};