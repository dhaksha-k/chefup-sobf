const KEY = "adminAuthed";

export const isAuthed = () => localStorage.getItem(KEY) === "true";

export const login = (u: string, p: string) => {
  const ok = u === "farmdoutxchefup2025" && p === "conf_sobf124";
  if (ok) localStorage.setItem(KEY, "true");
  return ok;
};

export const logout = () => localStorage.removeItem(KEY);
