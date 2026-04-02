import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getMyProfile } from "../services/profile";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(requireAdmin);

  useEffect(() => {
    if (requireAdmin && user) {
      getMyProfile().then((profile) => {
        setIsAdmin(profile.role === "admin");
        setCheckingRole(false);
      });
    }
  }, [user, requireAdmin]);

  if (loading || checkingRole) return <div style={{ padding: "40px" }}>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireAdmin: PropTypes.bool,
};