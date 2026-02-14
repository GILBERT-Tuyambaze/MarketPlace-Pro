import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export const SessionStatus: React.FC = () => {
  const { user, sessionActive, inactivityTimeoutMinutes } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionActive || !inactivityTimeoutMinutes) {
      setTimeRemaining(null);
      return;
    }

    // Try to get time remaining from sessionStorage if available
    const updateTimeRemaining = () => {
      const lastActivityStr = sessionStorage.getItem('lastActivityTime');
      if (lastActivityStr) {
        const lastActivity = parseInt(lastActivityStr, 10);
        const now = Date.now();
        const elapsed = Math.floor((now - lastActivity) / 1000); // in seconds
        const timeoutSeconds = inactivityTimeoutMinutes * 60;
        const remaining = Math.max(0, timeoutSeconds - elapsed);
        setTimeRemaining(remaining);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, inactivityTimeoutMinutes]);

  if (!user || !sessionActive) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining !== null && timeRemaining < 300; // Less than 5 minutes

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        🟢 Session Active
      </Badge>
      {timeRemaining !== null && (
        <Badge 
          variant="outline" 
          className={isLowTime ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
        >
          {isLowTime && <AlertCircle className="h-3 w-3 mr-1" />}
          {formatTime(timeRemaining)} remaining
        </Badge>
      )}
    </div>
  );
};

export default SessionStatus;
