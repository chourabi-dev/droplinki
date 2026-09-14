// Thin wrapper around Google Identity Services (GIS) for "Sign in with Google".
// Docs: https://developers.google.com/identity/gsi/web/reference/js-reference

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/**
 * Renders the official "Sign in with Google" button inside `container`.
 * `onCredential` receives the Google ID token (JWT) to send to the backend
 * at POST /api/auth/google for verification + session issuance.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void
): Promise<void> {
  if (!GOOGLE_CLIENT_ID) return;
  await loadGoogleScript();
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    ux_mode: "popup",
    callback: (response) => onCredential(response.credential),
  });

  container.innerHTML = "";
  window.google.accounts.id.renderButton(container, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    width: 340,
  });
}

export {};
