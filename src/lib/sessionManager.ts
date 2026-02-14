import { db as firebaseDb } from '@/lib/firebaseClient';
import {
  collection,
  addDoc,
  updateDoc,
  doc as fbDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

interface Session {
  id: string;
  user_id: string;
  session_id: string;
  created_at: any;
  last_activity_at: any;
  ended_at?: any;
  is_active: boolean;
  device_info: string;
  ip_address?: string;
  inactivity_timeout_minutes: number;
}

const INACTIVITY_TIMEOUT_MINUTES = 30; // Session expires after 30 minutes of inactivity
const ACTIVITY_CHECK_INTERVAL = 60000; // Check for inactivity every 1 minute
const SESSION_KEY = 'marketplace_session_id';

class SessionManager {
  private sessionId: string | null = null;
  private userId: string | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private onSessionExpired: (() => void) | null = null;

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    const browserInfo = this.getBrowserInfo();
    return `${browserInfo} - ${ua.substring(0, 100)}`;
  }

  /**
   * Get browser info
   */
  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  }

  /**
   * Create a new session in the database
   */
  async createSession(userId: string): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const deviceInfo = this.getDeviceInfo();

      // Get user's IP (if available from your backend)
      const ipAddress = await this.getUserIpAddress();

      // Create session document
      const sessionRef = collection(firebaseDb, 'sessions');
      const docRef = await addDoc(sessionRef, {
        user_id: userId,
        session_id: sessionId,
        created_at: serverTimestamp(),
        last_activity_at: serverTimestamp(),
        ended_at: null,
        is_active: true,
        device_info: deviceInfo,
        ip_address: ipAddress || 'unknown',
        inactivity_timeout_minutes: INACTIVITY_TIMEOUT_MINUTES,
      });

      // Also update authentication/users collection
      try {
        const authUserQ = query(
          collection(firebaseDb, 'authentication/users'),
          where('uid', '==', userId)
        );
        const authUserSnap = await getDocs(authUserQ);
        
        if (authUserSnap.size > 0) {
          const authUserDoc = authUserSnap.docs[0];
          await updateDoc(authUserDoc.ref, {
            session_id: sessionId,
            is_online: true,
            last_active: serverTimestamp(),
            device_info: deviceInfo,
            ip_address: ipAddress || 'unknown',
          });
        }
      } catch (e) {
        console.warn('Could not update authentication/users:', e);
      }

      // Store in memory and local storage
      this.sessionId = sessionId;
      this.userId = userId;
      localStorage.setItem(SESSION_KEY, sessionId);
      localStorage.setItem('userId', userId);
      sessionStorage.setItem('lastActivityTime', Date.now().toString());

      // Log session creation
      await this.logSessionEvent('session_created', userId, sessionId);

      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get user's IP address (requires backend endpoint or IPAPI)
   */
  private async getUserIpAddress(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || null;
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
      return null;
    }
  }

  /**
   * Update last activity time for a session
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      if (!sessionId) return;

      // Find session
      const sessionQ = query(
        collection(firebaseDb, 'sessions'),
        where('session_id', '==', sessionId)
      );
      const sessionSnap = await getDocs(sessionQ);

      if (sessionSnap.size > 0) {
        const sessionDoc = sessionSnap.docs[0];
        await updateDoc(sessionDoc.ref, {
          last_activity_at: serverTimestamp(),
        });
      }

      // Also update authentication/users
      if (this.userId) {
        try {
          const authUserQ = query(
            collection(firebaseDb, 'authentication/users'),
            where('uid', '==', this.userId)
          );
          const authUserSnap = await getDocs(authUserQ);
          
          if (authUserSnap.size > 0) {
            const authUserDoc = authUserSnap.docs[0];
            await updateDoc(authUserDoc.ref, {
              last_active: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn('Could not update last_active:', e);
        }
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * End a session
   */
  async endSession(sessionId?: string, reason: string = 'logout'): Promise<void> {
    try {
      const id = sessionId || this.sessionId;
      if (!id) return;

      // Find and end session
      const sessionQ = query(
        collection(firebaseDb, 'sessions'),
        where('session_id', '==', id)
      );
      const sessionSnap = await getDocs(sessionQ);

      if (sessionSnap.size > 0) {
        const sessionDoc = sessionSnap.docs[0];
        await updateDoc(sessionDoc.ref, {
          is_active: false,
          ended_at: serverTimestamp(),
        });
      }

      // Update authentication/users to offline
      if (this.userId) {
        try {
          const authUserQ = query(
            collection(firebaseDb, 'authentication/users'),
            where('uid', '==', this.userId)
          );
          const authUserSnap = await getDocs(authUserQ);
          
          if (authUserSnap.size > 0) {
            const authUserDoc = authUserSnap.docs[0];
            await updateDoc(authUserDoc.ref, {
              is_online: false,
              session_id: null,
            });
          }
        } catch (e) {
          console.warn('Could not update offline status:', e);
        }
      }

      // Log session end
      const userId = this.userId;
      if (userId) {
        await this.logSessionEvent('session_ended', userId, id, reason);
      }

      // Clear memory and localStorage
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('userId');
      this.sessionId = null;
      this.userId = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Start monitoring session inactivity
   */
  startInactivityMonitoring(onExpired: () => void): void {
    this.onSessionExpired = onExpired;

    // Setup activity listener
    const handleActivity = () => {
      this.resetInactivityTimer();
    };

    // Listen for user activity
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('touchstart', handleActivity);

    // Initial timer
    this.resetInactivityTimer();

    // Also check periodically if session is still active
    this.activityCheckInterval = setInterval(() => {
      this.checkSessionStatus();
    }, ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Stop monitoring inactivity
   */
  stopInactivityMonitoring(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    document.removeEventListener('mousemove', this.resetInactivityTimer);
    document.removeEventListener('keypress', this.resetInactivityTimer);
    document.removeEventListener('click', this.resetInactivityTimer);
    document.removeEventListener('scroll', this.resetInactivityTimer);
    document.removeEventListener('touchstart', this.resetInactivityTimer);
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer = (): void => {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Update last activity time in sessionStorage (for UI display)
    sessionStorage.setItem('lastActivityTime', Date.now().toString());

    // Update last activity in database
    if (this.sessionId) {
      this.updateSessionActivity(this.sessionId);
    }

    // Set new timeout
    this.inactivityTimer = setTimeout(async () => {
      console.log('Session expired due to inactivity');
      await this.endSession(this.sessionId, 'inactivity_timeout');
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
    }, INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
  };

  /**
   * Check if session is still active in database
   */
  private async checkSessionStatus(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const sessionQ = query(
        collection(firebaseDb, 'sessions'),
        where('session_id', '==', this.sessionId)
      );
      const sessionSnap = await getDocs(sessionQ);

      if (sessionSnap.size > 0) {
        const session = sessionSnap.docs[0].data() as Session;
        if (!session.is_active) {
          // Session was ended elsewhere
          console.log('Session was ended');
          this.stopInactivityMonitoring();
          if (this.onSessionExpired) {
            this.onSessionExpired();
          }
        }
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }
  }

  /**
   * Log session events
   */
  private async logSessionEvent(
    event: 'session_created' | 'session_ended' | 'session_activity',
    userId: string,
    sessionId: string,
    details?: string
  ): Promise<void> {
    try {
      const logsRef = collection(firebaseDb, 'session_logs');
      await addDoc(logsRef, {
        user_id: userId,
        session_id: sessionId,
        event,
        details: details || null,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging session event:', error);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId || localStorage.getItem(SESSION_KEY);
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId || localStorage.getItem('userId');
  }

  /**
   * Restore session from localStorage
   */
  restoreSession(): { sessionId: string | null; userId: string | null } {
    const sessionId = localStorage.getItem(SESSION_KEY);
    const userId = localStorage.getItem('userId');

    if (sessionId && userId) {
      this.sessionId = sessionId;
      this.userId = userId;
      // Initialize lastActivityTime if not set
      if (!sessionStorage.getItem('lastActivityTime')) {
        sessionStorage.setItem('lastActivityTime', Date.now().toString());
      }
    }

    return { sessionId, userId };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
export default SessionManager;
