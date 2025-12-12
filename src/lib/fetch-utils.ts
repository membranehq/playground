import { getPersonalAccessToken } from '@/components/providers/console-auth-provider';
import { CurrentCustomer } from '@/components/providers/customer-provider';

export const buildAuthHeaders = ({
  customerId,
  customerName,
}: CurrentCustomer) => {
  return {
    'x-auth-id': customerId ?? '',
    'x-customer-name': customerName ?? '',
  };
};

export const authenticatedFetcher = async <T>(
  url: string,
  userDetails: CurrentCustomer,
): Promise<T> => {
  const res = await fetch(url, {
    headers: buildAuthHeaders(userDetails),
  });

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export const personalAccessTokenAuthFetcher = async <T>(
  path: string,
): Promise<T> => {
  const url = new URL(path, process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getPersonalAccessToken()}`,
    },
  });

  if (!res.ok) {
    const error = new Error(
      'PAT Auth request: An error occurred while fetching the data.',
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
};
