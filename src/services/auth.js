import { supabase } from "../lib/supabaseClient";

// REGISTER
export const signUp = async ({
  email,
  password,
  firstName = "",
  lastName = "",
  sex = "",
  birthDate = "",
  placeOfBirth = "",
  phone = "",
  clubId = "",
  clubName = "",
  avatarUrl = "",
}) => {
  const fullName = `${firstName} ${lastName}`.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        sex,
        birth_date: birthDate,
        place_of_birth: placeOfBirth,
        phone,
        club_id: clubId,
        club_name: clubName,
        avatar_url: avatarUrl,
      },
    },
  });

  if (error) throw error;

  // Supabase does not return an error when an email is already registered
  // (to avoid leaking which emails exist). Instead it returns an obfuscated
  // user whose `identities` array is empty. Treat that as "email taken" so a
  // single email can only ever back a single account.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error(
      "An account with this email already exists. Please log in or reset your password."
    );
  }

  return data;
};

// LOGIN
export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

// LOGOUT
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// GET CURRENT USER
export const getUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user;
};

// FORGOT PASSWORD — send a reset link to the user's email.
// The link brings the user back to /reset-password with a recovery session,
// where they can set a new password.
export const sendPasswordReset = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
  return data;
};

// UPDATE PASSWORD — used on the reset page once the recovery session is active.
export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
};