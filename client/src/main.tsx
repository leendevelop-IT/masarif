import { trpc } from "@/lib/trpc";
import { ERR } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  httpBatchLink,
  httpLink,
  splitLink,
  TRPCClientError,
} from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

// When the session has expired, every protected call fails with the generic
// UNAUTHORIZED message. Clearing the cached user sends the app back to the
// sign-in screen. Other UNAUTHORIZED errors (a wrong password) are left to
// the form that made the call.
const handleUnauthorized = (error: unknown) => {
  if (
    error instanceof TRPCClientError &&
    error.data?.code === "UNAUTHORIZED" &&
    error.message === ERR.UNAUTHORIZED
  ) {
    queryClient.setQueriesData({ queryKey: [["auth", "me"]] }, null);
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error")
    handleUnauthorized(event.query.state.error);
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error")
    handleUnauthorized(event.mutation.state.error);
});

const fetchSameOrigin: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: "same-origin" });

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      // An upload carries the whole file; it travels alone so the server can
      // give that one route a larger body limit than everything else.
      condition: op => op.path === "finance.uploadAttachment",
      true: httpLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch: fetchSameOrigin,
      }),
      false: httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch: fetchSameOrigin,
      }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
