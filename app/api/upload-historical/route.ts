import { NextRequest, NextResponse } from 'next/server';
import {
  parseXLSX,
  validateUploadedData,
  calculateFileHash,
} from '@/lib/retrain-utils';
import { runTraining } from '@/lib/training-service';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { HistoricalUpload } from '@/types/retrain';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'historical');
const METADATA_FILE = path.join(UPLOAD_DIR, 'metadata.json');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getCurrentTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
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
      `${getCurrentTimestamp()} [UPLOAD] Failed to load metadata:`,
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
      `${getCurrentTimestamp()} [UPLOAD] Failed to save metadata:`,
      err
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      console.error(`${getCurrentTimestamp()} [UPLOAD] No file provided`);
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Support both File and Blob (Node.js: Blob, browser: File)
    // @ts-ignore
    const fileName = file.name || 'uploaded.xlsx';
    // @ts-ignore
    const fileSize =
      typeof file.size === 'number' ? file.size : file._size || 0;

    // Validate file type
    if (!fileName.endsWith('.xlsx')) {
      console.error(
        `${getCurrentTimestamp()} [UPLOAD] Invalid file type: ${fileName}`
      );
      return NextResponse.json(
        { error: 'Only .xlsx files allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(
      `${getCurrentTimestamp()} [UPLOAD] Receiving file: ${fileName} (${fileSizeMB} MB)`
    );

    if (fileSize > MAX_FILE_SIZE) {
      console.error(
        `${getCurrentTimestamp()} [UPLOAD] File too large: ${fileSizeMB}MB`
      );
      return NextResponse.json(
        { error: 'File exceeds 10MB limit' },
        { status: 413 }
      );
    }

    // Calculate file hash for duplicate detection
    const fileHash = await calculateFileHash(file);
    const metadata = loadMetadata();
    const duplicate = metadata.find((u) => u.fileHash === fileHash);

    if (duplicate) {
      console.warn(
        `${getCurrentTimestamp()} [UPLOAD] Duplicate file detected: ${fileHash}`
      );
      return NextResponse.json(
        { error: 'This file was already uploaded', existingUpload: duplicate },
        { status: 409 }
      );
    }

    // Parse XLSX file
    let parsedData;
    try {
      parsedData = await parseXLSX(file);
      console.log(
        `${getCurrentTimestamp()} [UPLOAD] Parsed ${parsedData.length} rows`
      );
    } catch (err) {
      console.error(
        `${getCurrentTimestamp()} [UPLOAD] Failed to parse XLSX:`,
        err
      );
      return NextResponse.json(
        {
          error: 'Failed to parse Excel file',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    // Validate data structure
    const arrayData = parsedData.map((row) => [row.date, row.total_m3]);
    arrayData.unshift(['date', 'total_m3']); // Add header row

    const validation = validateUploadedData(arrayData as unknown[][]);

    if (!validation.valid) {
      console.error(
        `${getCurrentTimestamp()} [UPLOAD] Validation failed:`,
        validation.errors
      );
      return NextResponse.json(
        {
          error: 'Invalid data structure',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    console.log(
      `${getCurrentTimestamp()} [UPLOAD] Validation passed, ${
        validation.errors.length
      } errors, ${validation.warnings.length} warnings`
    );

    if (validation.warnings.length > 0) {
      console.warn(
        `${getCurrentTimestamp()} [UPLOAD] Warnings:`,
        validation.warnings
      );
    }

    // Determine date range
    const dates = parsedData.map((d) => d.date).sort();
    const dateRange = {
      start: dates[0],
      end: dates[dates.length - 1],
    };

    console.log(
      `${getCurrentTimestamp()} [UPLOAD] Detected type: ${
        validation.dataType
      }, range: ${dateRange.start} to ${dateRange.end}`
    );

    // Save file with unique name
    const uploadId = randomUUID();
    const timestamp = Date.now();
    const savedFilename = `upload_${timestamp}.xlsx`;
    const savedPath = path.join(UPLOAD_DIR, savedFilename);

    const buffer = await file.arrayBuffer();
    fs.writeFileSync(savedPath, Buffer.from(buffer));
    console.log(`${getCurrentTimestamp()} [UPLOAD] Saved to: ${savedPath}`);

    // Create upload record (filename = savedFilename, not file.name)
    const upload: HistoricalUpload = {
      id: uploadId,
      filename: savedFilename,
      uploadedAt: new Date().toISOString(),
      dataType: validation.dataType,
      rowCount: parsedData.length,
      dateRange,
      fileHash,
      status: 'uploaded',
    };

    // Update metadata
    metadata.push(upload);
    saveMetadata(metadata);
    console.log(`${getCurrentTimestamp()} [UPLOAD] Updated metadata.json`);

    // Auto-trigger training to generate forecast
    console.log(
      `${getCurrentTimestamp()} [UPLOAD] Auto-triggering forecast generation...`
    );

    let trainingResult = null;
    try {
      trainingResult = await runTraining(upload.id, true);
      if (trainingResult.success) {
        console.log(
          `${getCurrentTimestamp()} [UPLOAD] Forecast generated successfully!`
        );
      } else {
        console.warn(
          `${getCurrentTimestamp()} [UPLOAD] Auto-training failed:`,
          trainingResult.error
        );
      }
    } catch (trainErr) {
      console.warn(
        `${getCurrentTimestamp()} [UPLOAD] Auto-training error:`,
        trainErr
      );
      // Continue - upload was successful, training can be done manually
    }

    return NextResponse.json({
      success: true,
      upload: {
        id: upload.id,
        filename: upload.filename,
        dataType: upload.dataType,
        rowCount: upload.rowCount,
        dateRange: upload.dateRange,
      },
      training: trainingResult,
    });
  } catch (err) {
    console.error(`${getCurrentTimestamp()} [UPLOAD] Unexpected error:`, err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
