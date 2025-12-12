'use client';

import { createContext, useContext } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';

import { cyrb64Hash } from '@/helpers/hash';

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
  const [userEmail, setUserEmail] = useLocalStorage<string | undefined>(
    'userEmail',
    undefined,
  );

  const userId = userEmail ? cyrb64Hash(userEmail) : undefined;

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
