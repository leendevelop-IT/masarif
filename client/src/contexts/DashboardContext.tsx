import type { AuthUser } from "@/hooks/useAuth";
import type {
  DashboardData,
  TransactionRecord,
  TransactionType,
} from "@/lib/types";
import { createContext, useContext, type ReactNode } from "react";

type DashboardContextValue = {
  data: DashboardData;
  user: AuthUser;
  refresh: () => Promise<unknown>;
  openNewTransaction: (type?: TransactionType) => void;
  openEditTransaction: (record: TransactionRecord) => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
);

export function DashboardProvider({
  value,
  children,
}: {
  value: DashboardContextValue;
  children: ReactNode;
}) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context)
    throw new Error("useDashboard must be used within DashboardProvider");
  return context;
}
