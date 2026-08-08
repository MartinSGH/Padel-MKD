import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import News from "./pages/News";
import Federation from "./pages/Federation";
import Wip from "./pages/Wip";
import Layout from "./layout/Layout";
import Training from "./components/NewsPage/Training";
import PlayingStyles from "./components/NewsPage/PlayingStyles";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import MySubmissions from "./pages/MySubmissions";
import SubmitPoints from "./pages/SubmitPoints";
import Admin from "./pages/Admin";
import Schedule2026 from "./pages/Schedule2026";
import NationalChampionship2026 from "./pages/NationalChampionship2026";
import Clubs from "./pages/Clubs";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
const routes = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Landing />,
      },
      {
        path: "/news",
        element: <News />,
      },
      {
        path: "/news/training",
        element: <Training />,
      },
      {
        path: "/news/play-styles",
        element: <PlayingStyles />,
      },
      {
        path: "/federation",
        element: <Federation />,
      },
      {
        path: "/schedule-2026",
        element: <Schedule2026 />,
      },
      {
        path: "/national-championship-2026",
        element: <NationalChampionship2026 />,
      },
      {
        path: "/clubs",
        element: <Clubs />,
      },
      {
        path: "/tournaments",
        element: <Tournaments />,
      },
      {
        path: "/tournaments/:id",
        element: <TournamentDetail />,
      },
      {
        path: "/wip",
        element: <Wip />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/reset-password",
        element: <ResetPassword />,
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/submit-points",
        element: (
          <ProtectedRoute>
            <SubmitPoints />
          </ProtectedRoute>
        ),
      },
      {
        path: "/my-submissions",
        element: (
          <ProtectedRoute>
            <MySubmissions />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin",
        element: (
          <ProtectedRoute requireAdmin={true}>
            <Admin />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
export default routes;
