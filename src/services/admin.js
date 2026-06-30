import { supabase } from "../lib/supabaseClient";

export const getAllPlayers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, total_points, role, avatar_url, phone, club_name, created_at"
    )
    .order("total_points", { ascending: false });

  if (error) throw error;
  return data;
};

export const getAllSubmissions = async () => {
  const { data, error } = await supabase
    .from("point_submissions")
    .select(
      `
      *,
      profiles:player_id (
        full_name,
        email,
        total_points
      )
    `
    )
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const approveSubmission = async (submission) => {
  const { player_id, id, requested_points } = submission;

  const { error: txError } = await supabase.from("point_transactions").insert([
    {
      player_id,
      submission_id: id,
      points_added: requested_points,
    },
  ]);

  if (txError) throw txError;

  const { error: updateError } = await supabase.rpc("increment_points", {
    user_id: player_id,
    points: requested_points,
  });

  if (updateError) throw updateError;

  const { error: statusError } = await supabase
    .from("point_submissions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (statusError) throw statusError;
};

export const declineSubmission = async (id) => {
  const { error } = await supabase
    .from("point_submissions")
    .update({
      status: "declined",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
};