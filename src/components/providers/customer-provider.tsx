'use client';

import { createContext, useContext } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';

export interface CurrentCustomer {
  customerId: string | undefined | null;
  customerName: string | undefined | null;
}

interface CurrentUserContext extends CurrentCustomer {
  setCustomerName: (name?: string) => void;
}

const CustomerContext = createContext<CurrentUserContext>({
  customerId: undefined,
  customerName: undefined,
  setCustomerName: () => {},
});

export function useCustomer() {
  return useContext(CustomerContext);
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useLocalStorage<string | undefined>('userEmail', undefined);

  // Use email directly as customer ID for easier debugging in console
  const userId = userEmail;

  return (
    <CustomerContext.Provider
      value={{
        customerId: userId,
        customerName: userEmail,
        setCustomerName: (name?: string) => setUserEmail(name),
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}
