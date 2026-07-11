import axios from 'axios';

// Task 1: Secure API Client Setup
// We configure Axios to ALWAYS send credentials (HttpOnly cookies) with every request.
// This ensures we never have to touch raw JWTs on the client-side or store them in localStorage,
// completely neutralizing traditional XSS token theft attacks.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // You could handle token refresh or redirect to login here
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
