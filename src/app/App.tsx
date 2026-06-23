/**
 * @file App.tsx
 * @description QueryClient/RouterProvider를 묶어 앱 런타임 컨텍스트를 제공한다.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { appRouter } from "./router";
import { AuthProvider } from "../lib/auth-context";

/** React Query 전역 캐시 인스턴스 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
