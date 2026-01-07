export interface HistoricalUpload {
  id: string;
  filename: string;
  uploadedAt: string;
  dataType: 'daily' | 'monthly';
  rowCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  fileHash: string;
  status: 'uploaded' | 'training' | 'trained' | 'failed';
  trainingResult?: TrainingResult;
}

export interface TrainingResult {
  success: boolean;
  trainingTime: string;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
    trainSize: number;
    testSize: number;
  };
  forecastSummary: {
    dailyPredictions: number;
    weeklyPredictions: number;
    monthlyPredictions: number;
  };
}

export interface TrainingStatus {
  status:
    | 'idle'
    | 'uploading'
    | 'validating'
    | 'training'
    | 'saving'
    | 'completed'
    | 'error';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  log: Array<{
    timestamp: string;
    message: string;
    level: 'info' | 'warning' | 'error';
  }>;
}

export interface ExportOptions {
  range: string;
  format: 'daily' | 'monthly';
  includeMetadata: boolean;
}
