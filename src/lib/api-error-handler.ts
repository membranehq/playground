/**
 * Handle API response errors, redirecting to auth page for 401 errors.
 * Returns the response if successful, throws an error otherwise.
 */
export async function handleApiResponse(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    try {
      const data = await response.json();
      throw new Error(data.error || 'Access denied');
    } catch (e) {
      if (e instanceof Error && e.message !== 'Access denied') {
        throw e;
      }
      throw new Error('Access denied');
    }
  }

  // Handle 401 Unauthorized - redirect to auth
  if (response.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }

  // For other errors, throw with the error message
  try {
    const data = await response.json();
    throw new Error(data.error || `Request failed with status ${response.status}`);
  } catch (e) {
    if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
      throw e;
    }
    throw new Error(`Request failed with status ${response.status}`);
  }
}

/**
 * Fetch wrapper that handles common API errors.
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  return handleApiResponse(response);
}
