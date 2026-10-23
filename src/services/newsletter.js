import { supabase } from "../lib/supabaseClient";

// Footer "Subscribe" (see supabase/newsletter_setup.sql).
export const subscribeToNewsletter = async (email) => {
  const { error } = await supabase.rpc("newsletter_subscribe", {
    p_email: email,
  });
  if (error) throw error;
};

// Unsubscribe link in the emails. Resolves to the address, or null when the
// link is invalid.
export const unsubscribeFromEmails = async (token) => {
  const { data, error } = await supabase.rpc("newsletter_unsubscribe", {
    p_token: token,
  });
  if (error) throw error;
  return data;
};

// Admin — footer subscribers who haven't unsubscribed.
export const getNewsletterSubscribers = async () => {
  const { data, error } = await supabase
    .from("email_contacts")
    .select("email, created_at")
    .eq("newsletter", true)
    .eq("opted_out", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

// Who an announcement email can go to (Admin → News / Tournaments).
export const EMAIL_AUDIENCES = [
  {
    value: "none",
    label: "Don't send an email",
  },
  {
    value: "everyone",
    label: "Everyone — all registered users and newsletter subscribers",
  },
  { value: "players", label: "Only players (registered users)" },
  { value: "subscribers", label: "Only newsletter subscribers" },
  { value: "manual", label: "Choose registered users manually" },
];

// Admin — emails a news article or tournament through the send-email Edge
// Function. Resolves to { sent, failed, recipients }.
export const sendAnnouncementEmail = async ({
  kind,
  id,
  audience,
  userIds,
}) => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { kind, id, audience, userIds },
  });
  if (error) {
    // The function's own error message is in the response body.
    let message = error.message;
    try {
      message = (await error.context?.json())?.error || message;
    } catch {
      // body wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }
  return data;
};

// Picker state for a form: new items are emailed to everyone by default,
// edits to nobody.
export const emailTargetFor = (isNew) => ({
  audience: isNew ? "everyone" : "none",
  userIds: [],
});

// "Email sent to 12 people" style summary of a send-email result.
export const describeEmailResult = ({ sent, failed, recipients }) => {
  if (!recipients) return "No one to email — the chosen audience is empty.";
  const people = (n) => `${n} ${n === 1 ? "person" : "people"}`;
  return failed
    ? `Email sent to ${people(sent)}; ${failed} failed (see the send-email function logs).`
    : `Email sent to ${people(sent)}.`;
};
