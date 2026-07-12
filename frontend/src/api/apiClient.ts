import axios from 'axios';
import { useAuthStore } from '../stores/auth-store';

// Create a configured Axios instance
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token if it exists
apiClient.interceptors.request.use(
  (config) => {
    // Zustand allows reading state directly outside of React components
    const token = useAuthStore.getState().tokens?.accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Unwrap NestJS envelope & Handle 401s
apiClient.interceptors.response.use(
  (response) => {
    // Our backend sends { success: true, data: ... }
    // We unwrap it here so components only deal with the actual data
    if (response.data && response.data.success !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    // If the error is 401 Unauthorized, the token is invalid or expired
    if (error.response?.status === 401) {
      // Dispatch logout directly via Zustand
      useAuthStore.getState().logout();
    }
    
    // Pass the standard ApiError envelope up to the caller
    const apiError = error.response?.data?.error || error.message;
    return Promise.reject(apiError);
  }
);

export default apiClient;
