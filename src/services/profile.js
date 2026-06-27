import { supabase } from "../lib/supabaseClient";

export const getMyProfile = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
};

// Update the current user's own profile row. Pass only the fields to change.
export const updateMyProfile = async (fields) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Upload a new profile picture to Storage and return its public URL.
export const uploadProfileAvatar = async (file) => {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `profile-avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
};

// Change the account email (Supabase sends a confirmation to the new address).
export const updateMyEmail = async (email) => {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
};

// Change the account password.
export const updateMyPassword = async (password) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};