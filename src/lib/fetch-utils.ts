import { getAuthToken } from '@/components/providers/auth-provider';

export interface CustomerDetails {
  customerId?: string;
  customerName?: string;
}

export const buildAuthHeaders = ({
  customerId,
  customerName,
}: CustomerDetails) => {
  return {
    'x-auth-id': customerId ?? '',
    'x-customer-name': customerName ?? '',
  };
};

export const authenticatedFetcher = async <T>(
  url: string,
  userDetails: CustomerDetails,
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

export const jwtAuthFetcher = async <T>(
  path: string,
): Promise<T> => {
  const url = new URL(path, process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL);
  const token = getAuthToken();

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = new Error(
      'Auth request: An error occurred while fetching the data.',
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
};
