// Shared helpers for tournament dates and status.

const parseDate = (str) => (str ? new Date(`${str}T00:00:00`) : null);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const localeFor = (lang) => (lang === "mk" ? "mk-MK" : "en-GB");

// "04–05 July 2026", "28 June – 5 July 2026", "12 March 2026", etc.
export const formatDateRange = (startStr, endStr, lang = "en") => {
  const locale = localeFor(lang);
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  const full = { day: "numeric", month: "long", year: "numeric" };

  if (!start && !end) return "";
  if (start && !end) return start.toLocaleDateString(locale, full);
  if (!start && end) return end.toLocaleDateString(locale, full);

  if (startStr === endStr) return start.toLocaleDateString(locale, full);

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString(
      locale,
      { month: "long" }
    )} ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
    })} – ${end.toLocaleDateString(locale, full)}`;
  }

  return `${start.toLocaleDateString(locale, full)} – ${end.toLocaleDateString(
    locale,
    full
  )}`;
};

// "cancelled" | "postponed" | "finished" | "ongoing" | "upcoming"
export const getTournamentTiming = (tournament) => {
  if (tournament.status === "cancelled") return "cancelled";
  if (tournament.status === "postponed") return "postponed";

  const today = startOfToday();
  const start = parseDate(tournament.start_date);
  const end = parseDate(tournament.end_date) || start;

  if (end && end < today) return "finished";
  if (start && start > today) return "upcoming";
  if (start && end && start <= today && today <= end) return "ongoing";
  return "upcoming";
};

// For the Upcoming / Past filter — based purely on the dates.
export const isPastTournament = (tournament) => {
  const today = startOfToday();
  const end = parseDate(tournament.end_date) || parseDate(tournament.start_date);
  return end ? end < today : false;
};

export const isRegistrationOpen = (tournament) => {
  if (!tournament.registration_url) return false;
  if (tournament.status === "cancelled") return false;
  if (tournament.registration_deadline) {
    const dl = parseDate(tournament.registration_deadline);
    if (dl && dl < startOfToday()) return false;
  }
  return true;
};

export const getTournamentYear = (tournament) => {
  const d = parseDate(tournament.start_date);
  return d ? d.getFullYear() : null;
};

export const getTournamentMonth = (tournament) => {
  const d = parseDate(tournament.start_date);
  return d ? d.getMonth() : null; // 0-11
};

export const formatSingleDate = (str, lang = "en") => {
  const d = parseDate(str);
  if (!d) return "";
  return d.toLocaleDateString(localeFor(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
