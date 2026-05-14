import { QueryClient } from '@tanstack/react-query';

/**
 * Enterprise-grade QueryClient configuration.
 * Optimized for B2B Marketplace with sensible caching defaults.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes (standard for B2B product catalogs)
      staleTime: 1000 * 60 * 5,
      // Keep data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests once by default
      retry: 1,
      // Prevent refetch on window focus to reduce noise during development
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Global error handling for mutations could be added here
      retry: false,
    },
  },
});
