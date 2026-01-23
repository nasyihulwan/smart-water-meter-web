'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileUpload,
  DataPreview,
  TemplateDownload,
  TrainingProgress,
  TrainingResults,
} from '@/components/retrain';
import {
  ArrowLeft,
  Download,
  Upload,
  Database,
  RefreshCw,
  Loader2,
  Package,
  Cog,
  Bot,
  BarChart3,
  Rocket,
} from 'lucide-react';
import { parseXLSX, validateUploadedData } from '@/lib/retrain-utils';
import type { TrainingStatus, TrainingResult } from '@/types/retrain';

export default function RetrainPage() {
  const router = useRouter();

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<
    Array<{ date: string; total_m3: number }>
  >([]);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    dataType: 'daily' | 'monthly';
  } | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    status: 'idle',
    progress: 0,
    currentStep: 'Waiting to start',
    log: [],
  });
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(
    null
  );
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [includeInfluxData, setIncludeInfluxData] = useState(true);
  const [exportRange, setExportRange] = useState('-30d');
  const [exportFormat, setExportFormat] = useState<'daily' | 'monthly'>(
    'daily'
  );

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    try {
      const data = await parseXLSX(file);
      setUploadedData(data);

      const arrayData = data.map((row) => [row.date, row.total_m3]);
      arrayData.unshift(['date', 'total_m3']);

      const validation = validateUploadedData(arrayData as unknown[][]);
      setValidationResult(validation);
    } catch (err) {
      console.error('Failed to parse file:', err);
      setValidationResult({
        valid: false,
        errors: ['Failed to parse Excel file'],
        warnings: [],
        dataType: 'daily',
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Show training in progress since upload now auto-triggers training
      setTrainingStatus({
        status: 'training',
        progress: 10,
        currentStep: 'Uploading and generating forecast...',
        log: [
          {
            timestamp: new Date().toLocaleTimeString(),
            message: 'Starting upload and auto-training',
            level: 'info',
          },
        ],
      });

      const response = await fetch('/api/upload-historical', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.status === 409 && result.existingUpload) {
        // File already uploaded, use existing upload id
        setCurrentUploadId(result.existingUpload.id);
        setTrainingStatus(null);
        alert('ℹ️ File already uploaded, using previous upload.');
        return;
      }

      if (!response.ok) {
        setTrainingStatus(null);
        throw new Error(result.error || 'Upload failed');
      }

      setCurrentUploadId(result.upload.id);

      // Check if auto-training was successful
      if (result.training?.success) {
        setTrainingStatus({
          status: 'success',
          progress: 100,
          currentStep: 'Training completed!',
          log: [
            {
              timestamp: new Date().toLocaleTimeString(),
              message: 'Upload and training completed successfully',
              level: 'info',
            },
          ],
        });
        setTrainingResult({
          success: true,
          trainingTime: result.training.trainingTime,
          metrics: result.training.metrics,
          forecastSummary: result.training.forecastSummary,
        });
        alert('✅ File uploaded and forecast generated successfully!');
      } else {
        setTrainingStatus(null);
        alert('✅ File uploaded! Click "Start Training" to generate forecast.');
      }
    } catch (err) {
      setTrainingStatus(null);
      alert(
        `❌ Upload failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportInflux = async () => {
    try {
      const url = `/api/export-influx?range=${exportRange}&format=${exportFormat}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `influx_export_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      alert('✅ InfluxDB data exported successfully!');
    } catch (err) {
      alert(
        `❌ Export failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    }
  };

  const handleStartTraining = async () => {
    if (!currentUploadId) return;

    setTrainingStatus({
      status: 'training',
      progress: 10,
      currentStep: 'Initializing training...',
      log: [
        {
          timestamp: new Date().toLocaleTimeString(),
          message: 'Starting training process',
          level: 'info',
        },
      ],
    });

    try {
      const response = await fetch('/api/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: currentUploadId,
          useInfluxData: includeInfluxData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Training failed');
      }

      setTrainingStatus({
        status: 'completed',
        progress: 100,
        currentStep: 'Training completed',
        log: [
          ...trainingStatus.log,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: 'Training completed successfully',
            level: 'info',
          },
        ],
      });

      setTrainingResult({
        success: true,
        trainingTime: result.trainingTime,
        metrics: result.metrics,
        forecastSummary: result.forecastSummary,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('unavailable')) {
        alert(`⚠️ Training Server Offline

The Python training server is not running.

To start the server:
1. Open terminal
2. cd server
3. python train_server.py

Then try again.`);
      }

      setTrainingStatus({
        status: 'error',
        progress: 0,
        currentStep: 'Training failed',
        log: [
          ...trainingStatus.log,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: errorMessage,
            level: 'error',
          },
        ],
      });
    }
  };

  const handleTrainAgain = () => {
    setSelectedFile(null);
    setUploadedData([]);
    setValidationResult(null);
    setTrainingStatus({
      status: 'idle',
      progress: 0,
      currentStep: 'Waiting to start',
      log: [],
    });
    setTrainingResult(null);
    setCurrentUploadId(null);
  };

  const workflowSteps = [
    {
      icon: Package,
      title: 'Data Collection',
      description: 'Upload historical data or export from InfluxDB',
      time: '1-2 minutes',
      details:
        'Gather water consumption data in daily or monthly format. Ensure data quality and consistency.',
    },
    {
      icon: Cog,
      title: 'Preprocessing',
      description: 'Validate, clean, and prepare data for training',
      time: '10-15 seconds',
      details:
        'Remove duplicates, handle missing values, normalize data format, and detect outliers.',
    },
    {
      icon: Bot,
      title: 'Model Training',
      description: 'Train Prophet algorithm on historical patterns',
      time: '30-45 seconds',
      details:
        'Facebook Prophet captures trends, seasonality, and holidays to generate accurate forecasts.',
    },
    {
      icon: BarChart3,
      title: 'Evaluation',
      description: 'Calculate accuracy metrics (MAE, RMSE, MAPE)',
      time: '5-10 seconds',
      details:
        'Test model on validation set and compute error metrics to assess prediction quality.',
    },
    {
      icon: Rocket,
      title: 'Deployment',
      description: 'Save forecast and update dashboard',
      time: '5 seconds',
      details:
        'Generate 30-day forecast, save results, and make predictions available in dashboard.',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Retrain Forecasting Model
            </h1>
            <p className="text-muted-foreground">
              Upload historical data or export from InfluxDB to improve
              predictions
            </p>
          </div>
        </div>
      </div>

      {/* Data Input Tabs */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Manual Upload
            </TabsTrigger>
            <TabsTrigger value="export">
              <Database className="mr-2 h-4 w-4" />
              Export from InfluxDB
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Manual Upload */}
          <TabsContent value="upload" className="space-y-6 mt-6">
            <TemplateDownload />

            <FileUpload
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
            />

            {uploadedData.length > 0 && validationResult && (
              <>
                <DataPreview
                  data={uploadedData}
                  dataType={validationResult.dataType}
                  validationResult={validationResult}
                />

                {validationResult.valid && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      size="lg"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Data
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab 2: Export from InfluxDB */}
          <TabsContent value="export" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Date Range</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'Last 7 days', value: '-7d' },
                    { label: 'Last 30 days', value: '-30d' },
                    { label: 'Last 90 days', value: '-90d' },
                    { label: 'Last 1 year', value: '-1y' },
                  ].map((preset) => (
                    <Button
                      key={preset.value}
                      variant={
                        exportRange === preset.value ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setExportRange(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Format</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={exportFormat === 'daily' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('daily')}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={exportFormat === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {exportFormat === 'daily'
                    ? 'Recommended for better accuracy (~5-10% error)'
                    : 'Lower accuracy (~10-15% error)'}
                </p>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleExportInflux} size="lg">
                <Download className="mr-2 h-4 w-4" />
                Export & Download
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Training Workflow */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Training Workflow</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {workflowSteps.map((step, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs text-muted-foreground">
                  STEP {index + 1}
                </div>
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {step.description}
              </p>
              <p className="text-xs text-muted-foreground">⏱️ {step.time}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Training Control */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="influx-data"
              checked={includeInfluxData}
              onChange={(e) => setIncludeInfluxData(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="influx-data" className="text-sm">
              Include recent InfluxDB data (last 90 days)
            </label>
            <span className="text-xs text-muted-foreground">
              (Recommended for better accuracy)
            </span>
          </div>

          {trainingStatus.status === 'idle' && !trainingResult && (
            <Button
              onClick={handleStartTraining}
              disabled={!currentUploadId}
              size="lg"
              className="w-full"
            >
              <Rocket className="mr-2 h-5 w-5" />
              Start Training
            </Button>
          )}

          {trainingStatus.status !== 'idle' &&
            trainingStatus.status !== 'completed' &&
            !trainingResult && <TrainingProgress status={trainingStatus} />}

          {trainingResult && (
            <TrainingResults
              result={trainingResult}
              onTrainAgain={handleTrainAgain}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
