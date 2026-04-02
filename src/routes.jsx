import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
}




    ],
  },
]);
export default routes;
