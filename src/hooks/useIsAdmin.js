import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyProfile } from "../services/profile";

// Lightweight admin check for public pages that show extra controls to admins.
// Returns { isAdmin, loading }.
export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    getMyProfile()
      .then((profile) => {
        if (!cancelled) setIsAdmin(profile?.role === "admin");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading };
};
