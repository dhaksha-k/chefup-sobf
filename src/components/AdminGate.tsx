import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthed } from "../lib/adminAuth";

export default function AdminGate({ children }: { children: ReactNode }) {
  return isAuthed() ? <>{children}</> : <Navigate to="/admin-login" replace />;
}
