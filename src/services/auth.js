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