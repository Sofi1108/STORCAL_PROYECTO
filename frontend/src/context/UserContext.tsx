import { createContext, useContext, ReactNode, useState } from "react";

export interface Customer {
  id: number;
  email: string;
  role: string;
}

interface UserContextType {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <UserContext.Provider
      value={{ customer, setCustomer, loading, setLoading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser debe usarse dentro de UserProvider");
  }
  return context;
}
