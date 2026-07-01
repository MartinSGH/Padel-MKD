import { RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import routes from "./routes";
import "./index.css";
import "./i18n";
import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <RouterProvider router={routes} />
      </NotificationsProvider>
    </AuthProvider>
  </StrictMode>
);