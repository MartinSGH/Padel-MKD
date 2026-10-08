import { useState } from "react";

const storageKey = (id) => `admin-section-collapsed:${id}`;

// Collapsed/expanded state for an admin panel section, remembered per section
// in localStorage. Sections start collapsed so the panel stays short.
// Returns { collapsed, toggle }.
export const useCollapsedSection = (id, defaultCollapsed = true) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(id));
      return stored === null ? defaultCollapsed : stored === "1";
    } catch {
      return defaultCollapsed;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey(id), next ? "1" : "0");
      } catch {
        // Storage unavailable (private mode etc.) — state just isn't remembered.
      }
      return next;
    });
  };

  return { collapsed, toggle };
};
