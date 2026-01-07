'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Download,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { formatMetrics } from '@/lib/retrain-utils';
import type { TrainingResult } from '@/types/retrain';
import { useRouter } from 'next/navigation';

interface TrainingResultsProps {
  result: TrainingResult;
  onTrainAgain: () => void;
}

export function TrainingResults({
  result,
  onTrainAgain,
}: TrainingResultsProps) {
  const router = useRouter();

  const metrics = formatMetrics(result.metrics);

  const getBadgeVariant = (
    color: 'green' | 'yellow' | 'orange' | 'red'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (color) {
      case 'green':
        return 'default';
      case 'yellow':
        return 'secondary';
      case 'orange':
        return 'secondary';
      case 'red':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getColorClass = (color: 'green' | 'yellow' | 'orange' | 'red') => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'orange':
        return 'bg-orange-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDownloadReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      trainingTime: result.trainingTime,
      metrics: result.metrics,
      forecastSummary: result.forecastSummary,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {result.success ? (
          <>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold">
                Training Completed Successfully!
              </h2>
              <p className="text-sm text-muted-foreground">
                Training Time: {result.trainingTime}
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <h2 className="text-xl font-semibold">Training Failed</h2>
              <p className="text-sm text-muted-foreground">
                Please try again or check the logs
              </p>
            </div>
          </>
        )}
      </div>

      {result.success && (
        <>
          {/* Evaluation Metrics */}
          <Card className="p-6 mb-6 bg-muted/50">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Evaluation Metrics</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  MAE (Mean Absolute Error)
                </p>
                <p className="text-2xl font-bold">{metrics.maeFormatted}</p>
                <p className="text-xs text-muted-foreground">m³/period</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  RMSE (Root Mean Square Error)
                </p>
                <p className="text-2xl font-bold">{metrics.rmseFormatted}</p>
                <p className="text-xs text-muted-foreground">m³/period</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  MAPE (Mean Absolute % Error)
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{metrics.mapeFormatted}</p>
                  <div className="flex items-center gap-1">
                    <div
                      className={`h-3 w-3 rounded-full ${getColorClass(
                        metrics.mapeColor
                      )}`}
                    />
                    <Badge variant={getBadgeVariant(metrics.mapeColor)}>
                      {metrics.mapeColor === 'green' && 'Excellent'}
                      {metrics.mapeColor === 'yellow' && 'Good'}
                      {metrics.mapeColor === 'orange' && 'Fair'}
                      {metrics.mapeColor === 'red' && 'Needs Improvement'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm font-medium mb-1">Interpretation:</p>
              <p className="text-sm text-muted-foreground">
                {metrics.interpretation}
              </p>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              <p>
                Training Set: {result.metrics.trainSize} samples • Test Set:{' '}
                {result.metrics.testSize} samples
              </p>
            </div>
          </Card>

          {/* Forecast Summary */}
          <Card className="p-6 mb-6 bg-muted/50">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Forecast Summary</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {result.forecastSummary.dailyPredictions}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Daily Predictions
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {result.forecastSummary.weeklyPredictions}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Weekly Predictions
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {result.forecastSummary.monthlyPredictions}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Monthly Predictions
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Forecast
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadReport}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>

            <Button variant="outline" onClick={onTrainAgain} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Train Again
            </Button>
          </div>
        </>
      )}

      {!result.success && (
        <div className="flex justify-end">
          <Button variant="default" onClick={onTrainAgain}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
}
