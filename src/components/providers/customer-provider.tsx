'use client';

import { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';

export interface CurrentCustomer {
  customerId: string | undefined | null;
  customerName: string | undefined | null;
}

interface CurrentUserContext extends CurrentCustomer {
  customerIds: string[];
  setCustomerName: (name?: string) => void;
  addCustomerId: (id: string) => void;
  removeCustomerId: (id: string) => void;
  switchCustomer: (id: string) => void;
}

const CustomerContext = createContext<CurrentUserContext>({
  customerId: undefined,
  customerName: undefined,
  customerIds: [],
  setCustomerName: () => {},
  addCustomerId: () => {},
  removeCustomerId: () => {},
  switchCustomer: () => {},
});

export function useCustomer() {
  return useContext(CustomerContext);
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [activeCustomerId, setActiveCustomerId] = useLocalStorage<string | undefined>('activeCustomerId', undefined);
  const [customerIds, setCustomerIds] = useLocalStorage<string[]>('customerIds', []);

  // For backwards compatibility, also check userEmail
  const [userEmail] = useLocalStorage<string | undefined>('userEmail', undefined);

  // Use activeCustomerId if set, otherwise fall back to userEmail for backwards compatibility
  const currentCustomerId = activeCustomerId || userEmail;

  // Compute effective customerIds list - include current customer even if not in stored array
  const effectiveCustomerIds =
    currentCustomerId && !customerIds.includes(currentCustomerId) ? [currentCustomerId, ...customerIds] : customerIds;

  const addCustomerId = useCallback(
    (id: string) => {
      setCustomerIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
      setActiveCustomerId(id);
    },
    [setCustomerIds, setActiveCustomerId],
  );

  const removeCustomerId = useCallback(
    (id: string) => {
      setCustomerIds((prev) => prev.filter((cid) => cid !== id));
      // If removing the active customer, switch to another or clear
      if (currentCustomerId === id) {
        const remaining = customerIds.filter((cid) => cid !== id);
        setActiveCustomerId(remaining.length > 0 ? remaining[0] : undefined);
      }
    },
    [setCustomerIds, currentCustomerId, customerIds, setActiveCustomerId],
  );

  const switchCustomer = useCallback(
    (id: string) => {
      setActiveCustomerId(id);
      // Ensure the ID is in the list
      setCustomerIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
      // Navigate to workflows list to avoid showing another user's data
      window.location.href = '/workflows';
    },
    [setActiveCustomerId, setCustomerIds],
  );

  const setCustomerName = useCallback(
    (name?: string) => {
      if (name) {
        addCustomerId(name);
      }
    },
    [addCustomerId],
  );

  return (
    <CustomerContext.Provider
      value={{
        customerId: currentCustomerId,
        customerName: currentCustomerId,
        customerIds: effectiveCustomerIds,
        setCustomerName,
        addCustomerId,
        removeCustomerId,
        switchCustomer,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}
