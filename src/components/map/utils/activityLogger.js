// activityLogger.js

const LOG_STORAGE_KEY = 'pending_activities';
const BATCH_THRESHOLD = 5;
// Replace this with your actual API base URL from Postman {{logURL}}
const API_BASE_URL = import.meta.env.VITE_URL_PROJECT; 

class ActivityLogger {
  constructor() {
    // 1. Manage the Session ID (persists as long as the tab is open)
    this.sessionId = sessionStorage.getItem('analytics_session_id');
    if (!this.sessionId) {
      this.sessionId = 'sess-' + crypto.randomUUID();
      sessionStorage.setItem('analytics_session_id', this.sessionId);
    }

    // 2. Load unsent logs from a previous crash/close
    const storedLogs = localStorage.getItem(LOG_STORAGE_KEY);
    this.buffer = storedLogs ? JSON.parse(storedLogs) : [];
    
    if (this.buffer.length > 0) {
      this.flush();
    }

    // 3. Save logs if the user closes the tab
    window.addEventListener('beforeunload', () => this.flushOnExit());
  }

  /**
   * @param {string} eventType - e.g., "BUTTON_CLICK", "PAGE_VISIT"
   * @param {string} currentPage - e.g., "/home", "/PAYMENT"
   * @param {object} metadata - e.g., { browser: "Chrome", device: "desktop" }
   * @param {boolean} forceFlush - Send immediately, ignoring BATCH_THRESHOLD
   */
  logAction(eventType, currentPage = window.location.pathname, metadata = {}, forceFlush = false) {
    const eventEntry = {
      eventType,
      currentPage,
      timestamp: new Date().toISOString(),
      metadata: {
        referrer: document.referrer || "direct",
        device: window.innerWidth < 768 ? "mobile" : "desktop",
        ...metadata
      }
    };

    this.buffer.push(eventEntry);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.buffer));

    // Send immediately if forceFlush is true, otherwise wait for threshold
    if (forceFlush || this.buffer.length >= BATCH_THRESHOLD) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    // Use a fallback for users who haven't logged in yet so we capture pre-login events
    const ownerEmail = localStorage.getItem('ownerEmail') || 'guest_user';

    // Copy and clear buffer
    const eventsToSend = [...this.buffer];
    this.buffer = [];
    localStorage.removeItem(LOG_STORAGE_KEY);

    // Format exactly as Postman expects
    const payload = {
      sessionId: this.sessionId,
      userId: ownerEmail,
      events: eventsToSend
    };
    
    console.log("Flushing logs:", payload);
    
    try {
      await fetch(`${API_BASE_URL}/api/analytics/batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'client_name' : 'mapx'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Failed to send analytics batch", error);
      // Restore buffer on failure
      this.buffer = [...eventsToSend, ...this.buffer];
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.buffer));
    }
  }

  flushOnExit() {
    if (this.buffer.length === 0) return;
    
    const ownerEmail = localStorage.getItem('ownerEmail') || 'guest_user';

    const payload = {
      sessionId: this.sessionId,
      userId: ownerEmail,
      events: this.buffer
    };

    const blob = new Blob([JSON.stringify(payload)], {
      type: 'application/json'
    });
    console.log("Flushing on exit:", blob);
    navigator.sendBeacon(`${API_BASE_URL}/api/analytics/batch`, blob);
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
}

export const logger = new ActivityLogger();