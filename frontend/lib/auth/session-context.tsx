"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UserRole, TrustLevel } from "@open-derja/shared";

export type Session = {
  userId: string;
  role: UserRole;
  trustLevel: TrustLevel;
  emailVerified: boolean;
} | null;

type SessionContextValue = {
  session: Session;
  setSession: (session: Session) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: Session;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session>(initialSession);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
