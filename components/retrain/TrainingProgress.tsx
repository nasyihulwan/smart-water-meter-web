'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, XCircle } from 'lucide-react';
import type { TrainingStatus } from '@/types/retrain';

interface TrainingProgressProps {
  status: TrainingStatus;
  onCancel?: () => void;
}

export function TrainingProgress({ status, onCancel }: TrainingProgressProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new log entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [status.log]);

  const getProgressColor = () => {
    if (status.status === 'error') return 'bg-red-500';
    if (status.status === 'completed') return 'bg-green-500';
    return 'bg-primary';
  };

  const getStatusIcon = () => {
    if (status.status === 'error') {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
    if (status.status === 'completed') {
      return <div className="h-6 w-6 text-green-500">✅</div>;
    }
    return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'idle':
        return 'Waiting to start...';
      case 'uploading':
        return 'Uploading file...';
      case 'validating':
        return 'Validating data...';
      case 'training':
        return 'Training in Progress...';
      case 'saving':
        return 'Saving results...';
      case 'completed':
        return 'Training Completed Successfully!';
      case 'error':
        return 'Training Failed';
      default:
        return 'Processing...';
    }
  };

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return 'Calculating...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} minute${mins > 1 ? 's' : ''} ${secs} second${
        secs !== 1 ? 's' : ''
      }`;
    }
    return `${secs} second${secs !== 1 ? 's' : ''}`;
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {getStatusIcon()}
        <h2 className="text-xl font-semibold">{getStatusText()}</h2>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{status.progress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Current Step & Time */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Current Step</p>
          <p className="font-medium">{status.currentStep}</p>
        </div>
        {status.estimatedTimeRemaining !== undefined &&
          status.status !== 'completed' &&
          status.status !== 'error' && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Estimated Time Remaining
              </p>
              <p className="font-medium">
                {formatTime(status.estimatedTimeRemaining)}
              </p>
            </div>
          )}
      </div>

      {/* Training Log */}
      {status.log.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Training Log:</p>
          <div
            ref={logRef}
            className="bg-muted rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-1"
          >
            {status.log.map((entry, index) => {
              const levelColor =
                entry.level === 'error'
                  ? 'text-red-500'
                  : entry.level === 'warning'
                  ? 'text-yellow-500'
                  : 'text-foreground';

              return (
                <div key={index} className={levelColor}>
                  <span className="text-muted-foreground">
                    [{entry.timestamp}]
                  </span>{' '}
                  {entry.level === 'error' && (
                    <AlertCircle className="inline h-3 w-3 mr-1" />
                  )}
                  {entry.message}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {onCancel &&
        status.status !== 'completed' &&
        status.status !== 'error' &&
        status.status !== 'idle' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Training
            </Button>
          </div>
        )}
    </Card>
  );
}
