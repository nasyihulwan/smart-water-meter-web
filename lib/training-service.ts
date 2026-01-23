import { exportInfluxDataForTraining } from '@/lib/influxdb';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { HistoricalUpload, TrainingResult } from '@/types/retrain';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'historical');
const METADATA_FILE = path.join(UPLOAD_DIR, 'metadata.json');
const FORECAST_OUTPUT = path.join(
  process.cwd(),
  'data',
  'forecast_output.json'
);
const PYTHON_SERVER_URL =
  process.env.PYTHON_SERVER_URL || 'http://localhost:5000';
const TRAINING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function getCurrentTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
}

export function loadMetadata(): HistoricalUpload[] {
  if (!fs.existsSync(METADATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(
      `${getCurrentTimestamp()} [TRAINING] Failed to load metadata:`,
      err
    );
    return [];
  }
}

export function saveMetadata(metadata: HistoricalUpload[]) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error(
      `${getCurrentTimestamp()} [TRAINING] Failed to save metadata:`,
      err
    );
  }
}

export interface TrainingServiceResult {
  success: boolean;
  error?: string;
  trainingTime?: string;
  metrics?: {
    mae: number;
    rmse: number;
    mape: number;
    trainSize: number;
    testSize: number;
  };
  forecastSummary?: {
    dailyPredictions: number;
    weeklyPredictions: number;
    monthlyPredictions: number;
  };
}

/**
 * Run training for a given upload ID
 * This function can be called directly without going through API routes
 */
export async function runTraining(
  uploadId: string,
  useInfluxData: boolean = true
): Promise<TrainingServiceResult> {
  const startTime = Date.now();

  try {
    console.log(
      `${getCurrentTimestamp()} [TRAINING] Starting training for upload: ${uploadId}`
    );

    // Load metadata and find upload
    const metadata = loadMetadata();
    const upload = metadata.find((u) => u.id === uploadId);

    if (!upload) {
      console.error(
        `${getCurrentTimestamp()} [TRAINING] Upload not found: ${uploadId}`
      );
      return { success: false, error: 'Upload ID not found' };
    }

    // Update status to training
    upload.status = 'training';
    saveMetadata(metadata);

    // Use the filename saved in metadata
    const uploadPath = path.join(UPLOAD_DIR, upload.filename);
    if (!fs.existsSync(uploadPath)) {
      console.error(
        `${getCurrentTimestamp()} [TRAINING] Upload file not found: ${
          upload.filename
        }`
      );
      upload.status = 'failed';
      saveMetadata(metadata);
      return { success: false, error: 'Upload file not found' };
    }

    // Read uploaded file
    const fileBuffer = fs.readFileSync(uploadPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json<{
      date: string | number;
      total_m3: number;
    }>(workbook.Sheets[sheetName]);

    // Convert Excel serial dates to string format
    const historicalData = rawData.map((row) => {
      let dateStr: string;
      if (typeof row.date === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(row.date);
        if (excelDate) {
          const year = excelDate.y;
          const month = String(excelDate.m).padStart(2, '0');
          const day = String(excelDate.d).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else {
          dateStr = String(row.date);
        }
      } else {
        dateStr = String(row.date).trim();
      }
      return { date: dateStr, total_m3: row.total_m3 };
    });

    console.log(
      `${getCurrentTimestamp()} [TRAINING] Loaded ${
        historicalData.length
      } rows from historical data`
    );

    // Optionally export InfluxDB data
    let influxData: Array<{ date: string; total_m3: number }> = [];
    if (useInfluxData) {
      try {
        console.log(
          `${getCurrentTimestamp()} [TRAINING] Exporting 30 days from InfluxDB...`
        );
        influxData = await exportInfluxDataForTraining(
          'water_meter_01',
          '-30d',
          'daily'
        );
        console.log(
          `${getCurrentTimestamp()} [TRAINING] Exported ${
            influxData.length
          } rows from InfluxDB`
        );
      } catch (err) {
        console.warn(
          `${getCurrentTimestamp()} [TRAINING] Failed to export InfluxDB data:`,
          err
        );
      }
    }

    // Combine data
    const combinedData = [...historicalData, ...influxData];
    const uniqueData = Array.from(
      new Map(combinedData.map((item) => [item.date, item])).values()
    ).sort((a, b) => a.date.localeCompare(b.date));

    console.log(
      `${getCurrentTimestamp()} [TRAINING] Combined data: ${
        uniqueData.length
      } unique rows`
    );

    // Send to Python server
    console.log(
      `${getCurrentTimestamp()} [TRAINING] Sending to Python server...`
    );

    // Create XLSX file from combined data
    const wsData = [
      ['date', 'total_m3'],
      ...uniqueData.map((row) => [row.date, row.total_m3]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const xlsxBuffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    // Create multipart form data
    const boundary =
      '----FormBoundary' + Math.random().toString(36).substring(2);
    const CRLF = '\r\n';

    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="training_data.xlsx"`,
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      '',
      '',
    ].join(CRLF);

    const footer = CRLF + `--${boundary}--` + CRLF;

    const headerBuffer = Buffer.from(header, 'utf-8');
    const footerBuffer = Buffer.from(footer, 'utf-8');
    const bodyBuffer = Buffer.concat([headerBuffer, xlsxBuffer, footerBuffer]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRAINING_TIMEOUT);

    let response;
    try {
      response = await fetch(`${PYTHON_SERVER_URL}/api/train`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: bodyBuffer,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        console.error(
          `${getCurrentTimestamp()} [TRAINING] Training timeout after 5 minutes`
        );
        upload.status = 'failed';
        saveMetadata(metadata);
        return { success: false, error: 'Training timeout after 5 minutes' };
      }

      console.error(
        `${getCurrentTimestamp()} [TRAINING] Python server error:`,
        err
      );
      upload.status = 'failed';
      saveMetadata(metadata);
      return {
        success: false,
        error:
          'Training server unavailable. Please ensure Python server is running on localhost:5000',
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `${getCurrentTimestamp()} [TRAINING] Python server returned error:`,
        errorText
      );
      upload.status = 'failed';
      saveMetadata(metadata);
      return { success: false, error: `Training failed: ${errorText}` };
    }

    console.log(
      `${getCurrentTimestamp()} [TRAINING] Received response from Python server`
    );

    // Parse response
    const trainingResponse = await response.json();

    // Save forecast_output.json
    const forecastDir = path.dirname(FORECAST_OUTPUT);
    if (!fs.existsSync(forecastDir)) {
      fs.mkdirSync(forecastDir, { recursive: true });
    }
    fs.writeFileSync(
      FORECAST_OUTPUT,
      JSON.stringify(trainingResponse, null, 2)
    );
    console.log(
      `${getCurrentTimestamp()} [TRAINING] Saved forecast_output.json`
    );

    // Calculate training time
    const trainingTime = Math.round((Date.now() - startTime) / 1000);
    const trainingTimeStr = `${trainingTime}s`;

    // Extract metrics from response
    const metrics = trainingResponse.metrics || {
      mae: 0,
      rmse: 0,
      mape: 0,
      train_size: uniqueData.length,
      test_size: 0,
    };

    const forecastSummary = {
      dailyPredictions: trainingResponse.daily?.length || 0,
      weeklyPredictions: trainingResponse.weekly?.length || 0,
      monthlyPredictions: trainingResponse.monthly?.length || 0,
    };

    console.log(
      `${getCurrentTimestamp()} [TRAINING] Training completed! MAPE: ${
        metrics.mape?.toFixed?.(2) || metrics.mape
      }%`
    );

    // Update metadata with training result
    const trainingResult: TrainingResult = {
      success: true,
      trainingTime: trainingTimeStr,
      metrics: {
        mae: metrics.mae,
        rmse: metrics.rmse,
        mape: metrics.mape,
        trainSize: metrics.train_size || metrics.trainSize,
        testSize: metrics.test_size || metrics.testSize,
      },
      forecastSummary,
    };

    upload.status = 'trained';
    upload.trainingResult = trainingResult;
    saveMetadata(metadata);

    return {
      success: true,
      trainingTime: trainingTimeStr,
      metrics: trainingResult.metrics,
      forecastSummary,
    };
  } catch (err) {
    console.error(`${getCurrentTimestamp()} [TRAINING] Unexpected error:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
