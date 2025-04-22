import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @ts-ignore
import { IdentityKitProvider, IdentityKitTheme, IdentityKitAuthType } from "@nfid/identitykit/react";
import { AuthProvider } from "./lib/auth-context";

const queryClient = new QueryClient();


const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <IdentityKitProvider theme={IdentityKitTheme.DARK} authType={"ACCOUNTS"}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </IdentityKitProvider>
  </StrictMode>,
);
