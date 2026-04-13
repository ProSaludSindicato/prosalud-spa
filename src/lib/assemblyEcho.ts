import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    assemblyEcho?: Echo;
    Pusher?: typeof Pusher;
  }
}

let echoInstance: Echo | null = null;

/**
 * Instancia singleton de Echo para canales de asamblea (Reverb).
 * Sin variables de entorno, devuelve null y los consumidores deben usar polling.
 */
export const getAssemblyEcho = (): Echo | null => {
  if (echoInstance) {
    return echoInstance;
  }

  const key = import.meta.env.VITE_REVERB_APP_KEY;
  const host = import.meta.env.VITE_REVERB_HOST;

  if (!key?.trim() || !host?.trim()) {
    return null;
  }

  window.Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: host,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
    enabledTransports: ["ws", "wss"],
  });

  window.assemblyEcho = echoInstance;
  return echoInstance;
};
