import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { useAuth } from "./AuthContext";
import {
  getMyNotifications,
  markNotificationsRead,
} from "../services/notifications";

const NotificationsContext = createContext();

// How often to re-poll for new notifications while the tab is open.
const POLL_MS = 45000;

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications(await getMyNotifications());
    } catch {
      // Ignore — a failed poll shouldn't break the app.
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    timerRef.current = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timerRef.current);
  }, [user, refresh]);

  // Mark some notifications read locally + on the server.
  const markRead = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
    try {
      await markNotificationsRead(ids);
    } catch {
      // Best effort; a later refresh will reconcile.
    }
  }, []);

  const value = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read);
    return {
      notifications,
      unread,
      unreadCount: unread.length,
      // Tournament ids the user has a pending (unread) partner invite for.
      pendingInviteTournamentIds: new Set(
        unread
          .filter((n) => n.type === "partner_invite")
          .map((n) => n.tournament_id)
      ),
      refresh,
      markRead,
    };
  }, [notifications, refresh, markRead]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

NotificationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useNotifications = () => useContext(NotificationsContext);
