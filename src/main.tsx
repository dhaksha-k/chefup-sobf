import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import Intro from "./routes/Intro";
import Quiz from "./routes/Quiz";
import ArchetypeReveal from "./routes/ArchetypeReveal";
import EmailCapture from "./routes/EmailCapture";
import TeaserDashboard from "./routes/TeaserDashboard";
import Confirmation from "./routes/Confirmation";
import PrintCard from "./routes/PrintCard";
import PublicCard from "./routes/PublicCard";
import AdminLogin from "./routes/AdminLogin";
import AdminGate from "./components/AdminGate";
import AdminPrintList from "./routes/AdminPrintList";

import "./styles/globals.css";

const router = createBrowserRouter([
  { path: "/", element: <Intro /> },
  { path: "/quiz", element: <Quiz /> },
  { path: "/email", element: <EmailCapture /> },
  { path: "/archetype", element: <ArchetypeReveal /> },
  { path: "/teaser", element: <TeaserDashboard /> },
  { path: "/done", element: <Confirmation /> },
  { path: "/v/:slug", element: <PublicCard /> },

  { path: "/admin-login", element: <AdminLogin /> },
  { path: "/admin", element: <AdminGate><AdminPrintList /></AdminGate> },
  { path: "/print", element: <AdminGate><PrintCard /></AdminGate> },

  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
