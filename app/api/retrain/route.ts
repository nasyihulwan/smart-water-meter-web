import { NextRequest, NextResponse } from 'next/server';
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

function loadMetadata(): HistoricalUpload[] {
  if (!fs.existsSync(METADATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(
      `${getCurrentTimestamp()} [RETRAIN] Failed to load metadata:`,
      err
    );
    return [];
  }
}

function saveMetadata(metadata: HistoricalUpload[]) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error(
      `${getCurrentTimestamp()} [RETRAIN] Failed to save metadata:`,
      err
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { uploadId, useInfluxData = true } = body;

    if (!uploadId) {
      console.error(`${getCurrentTimestamp()} [RETRAIN] No uploadId provided`);
      return NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      );
    }

    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Starting retrain for upload: ${uploadId}`
    );

    // Load metadata and find upload
    const metadata = loadMetadata();
    const upload = metadata.find((u) => u.id === uploadId);

    if (!upload) {
      console.error(
        `${getCurrentTimestamp()} [RETRAIN] Upload not found: ${uploadId}`
      );
      return NextResponse.json(
        { error: 'Upload ID not found' },
        { status: 404 }
      );
    }

    // Update status to training
    upload.status = 'training';
    saveMetadata(metadata);

    // Find the uploaded file
    const files = fs.readdirSync(UPLOAD_DIR);
    const uploadFile = files.find((f) =>
      f.includes(upload.uploadedAt.split('T')[0].replace(/-/g, ''))
    );

    if (!uploadFile) {
      console.error(
        `${getCurrentTimestamp()} [RETRAIN] Upload file not found for: ${uploadId}`
      );
      upload.status = 'failed';
      saveMetadata(metadata);
      return NextResponse.json(
        { error: 'Upload file not found' },
        { status: 404 }
      );
    }

    const uploadPath = path.join(UPLOAD_DIR, uploadFile);

    // Read uploaded file
    const workbook = XLSX.readFile(uploadPath);
    const sheetName = workbook.SheetNames[0];
    const historicalData = XLSX.utils.sheet_to_json<{
      date: string;
      total_m3: number;
    }>(workbook.Sheets[sheetName]);

    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Loaded ${
        historicalData.length
      } rows from historical data`
    );

    // Optionally export InfluxDB data
    let influxData: Array<{ date: string; total_m3: number }> = [];
    if (useInfluxData) {
      try {
        console.log(
          `${getCurrentTimestamp()} [RETRAIN] Exporting 30 days from InfluxDB...`
        );
        influxData = await exportInfluxDataForTraining(
          'water_meter_01',
          '-30d',
          'daily'
        );
        console.log(
          `${getCurrentTimestamp()} [RETRAIN] Exported ${
            influxData.length
          } rows from InfluxDB`
        );
      } catch (err) {
        console.warn(
          `${getCurrentTimestamp()} [RETRAIN] Failed to export InfluxDB data:`,
          err
        );
        // Continue without InfluxDB data
      }
    }

    // Combine data
    const combinedData = [...historicalData, ...influxData];
    const uniqueData = Array.from(
      new Map(combinedData.map((item) => [item.date, item])).values()
    ).sort((a, b) => a.date.localeCompare(b.date));

    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Combined data: ${
        uniqueData.length
      } unique rows`
    );

    // Send to Python server
    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Sending to Python server...`
    );
    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Training in progress... (estimated 60s)`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRAINING_TIMEOUT);

    let response;
    try {
      response = await fetch(`${PYTHON_SERVER_URL}/api/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: uniqueData }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        console.error(
          `${getCurrentTimestamp()} [RETRAIN] Training timeout after 5 minutes`
        );
        upload.status = 'failed';
        saveMetadata(metadata);
        return NextResponse.json(
          { error: 'Training timeout after 5 minutes' },
          { status: 408 }
        );
      }

      console.error(
        `${getCurrentTimestamp()} [RETRAIN] Python server error:`,
        err
      );
      upload.status = 'failed';
      saveMetadata(metadata);
      return NextResponse.json(
        {
          error:
            'Training server unavailable. Please ensure Python server is running on localhost:5000',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `${getCurrentTimestamp()} [RETRAIN] Python server returned error:`,
        errorText
      );
      upload.status = 'failed';
      saveMetadata(metadata);
      return NextResponse.json(
        { error: 'Training failed', details: errorText },
        { status: 500 }
      );
    }

    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Received response from Python server`
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
      `${getCurrentTimestamp()} [RETRAIN] Saved forecast_output.json`
    );

    // Calculate training time
    const trainingTime = Math.round((Date.now() - startTime) / 1000);
    const trainingTimeStr = `${trainingTime}s`;

    // Extract metrics from response
    const metrics = trainingResponse.metadata?.metrics || {
      mae: 0,
      rmse: 0,
      mape: 0,
      trainSize: uniqueData.length,
      testSize: 0,
    };

    const forecastSummary = {
      dailyPredictions: trainingResponse.daily?.length || 0,
      weeklyPredictions: trainingResponse.weekly?.length || 0,
      monthlyPredictions: trainingResponse.monthly?.length || 0,
    };

    console.log(
      `${getCurrentTimestamp()} [RETRAIN] Training completed! MAPE: ${metrics.mape.toFixed(
        2
      )}%`
    );

    // Update metadata with training result
    const trainingResult: TrainingResult = {
      success: true,
      trainingTime: trainingTimeStr,
      metrics,
      forecastSummary,
    };

    upload.status = 'trained';
    upload.trainingResult = trainingResult;
    saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      message: 'Model retrained successfully',
      trainingTime: trainingTimeStr,
      metrics,
      forecastSummary,
    });
  } catch (err) {
    console.error(`${getCurrentTimestamp()} [RETRAIN] Unexpected error:`, err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
