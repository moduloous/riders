import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// The global Axios instance. All API calls use this.
export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Automatically attach the Nexor JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexor_rider_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize all success responses: the backend wraps everything in { success, data, message }
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the envelope so callers get data directly
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const backendMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      null;

    // Detect network errors (no response = backend unreachable or CORS)
    const isNetworkError = !error?.response;

    // Normalize into a structured error object
    const normalized = {
      status,
      message: isNetworkError
        ? 'Cannot connect to the Nexor server. Is the backend running on port 3000?'
        : humanizeError(status, backendMessage),
      raw: backendMessage,
      isNetworkError,
    };

    if (status === 401) {
      // Session expired — clear token and redirect to login
      localStorage.removeItem('nexor_rider_token');
      localStorage.removeItem('nexor_rider_data');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(normalized);
  },
);

function humanizeError(status: number | undefined, raw: string | null): string {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You are not registered as a Nexor rider.';
  if (status === 404) return 'Not found.';
  if (status === 409) return 'This delivery is no longer available.';
  if (status === 400 && raw) return raw; // pass through validation messages verbatim
  if (status && status >= 500) return 'Something went wrong. Please try again.';
  if (raw) return raw;
  return 'An unexpected error occurred.';
}

export default apiClient;
