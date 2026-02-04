import React, { useState, useEffect } from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SessionTimerProps {
  startTime: Date;
  className?: string;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  startTime,
  className
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const diff = Math.floor((now - start) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-medium",
        isPaused ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" : "bg-muted text-foreground"
      )}>
        <Clock className={cn("h-4 w-4 shrink-0", isPaused ? "text-amber-600" : "text-muted-foreground")} />
        <span className="tabular-nums">{formatTime(elapsed)}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setIsPaused(!isPaused)}
        aria-label={isPaused ? "Retomar cronômetro" : "Pausar cronômetro"}
      >
        {isPaused ? (
          <Play className="h-4 w-4 text-amber-600" />
        ) : (
          <Pause className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
};
