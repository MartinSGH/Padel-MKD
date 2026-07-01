import { supabase } from "../lib/supabaseClient";

// All of the current user's notifications, newest first. RLS limits this to the
// signed-in user's own rows.
export const getMyNotifications = async () => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

// Mark specific notifications as read.
export const markNotificationsRead = async (ids) => {
  if (!ids || ids.length === 0) return;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids);
  if (error) throw error;
};
