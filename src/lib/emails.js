// Unique, non-empty emails in their original order (case-insensitive).
export const uniqueEmails = (values) => {
  const seen = new Set();
  const emails = [];
  values.forEach((value) => {
    const email = (value || "").trim();
    if (!email || seen.has(email.toLowerCase())) return;
    seen.add(email.toLowerCase());
    emails.push(email);
  });
  return emails;
};
