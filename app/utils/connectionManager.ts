type ConnectionCallbacks = {
  onOffline: () => void;
  onOnline: () => void;
};

let isOffline = false;
let offlineTimer: NodeJS.Timeout | null = null;

export function handleApiError(error: any, callbacks: ConnectionCallbacks) {
  const errorMessage = error?.message || "";
  
  const isInternalError =
    errorMessage.includes("API error 500") ||
    errorMessage.includes("Internal server error");

  if (isInternalError) {
    triggerOffline(callbacks);
    return "parece que estou offline"; 
  }

  return null; 
}

function triggerOffline({ onOffline, onOnline }: ConnectionCallbacks) {
  if (isOffline) return; // já está offline

  isOffline = true;
  onOffline(); 
  if (offlineTimer) clearTimeout(offlineTimer);

  offlineTimer = setTimeout(() => {
    isOffline = false;
    onOnline(); 
  }, 30000);
}

export function getConnectionState() {
  return isOffline ? "offline" : "online";
}
