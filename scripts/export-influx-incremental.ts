import { queryWaterReadings } from '../lib/influxdb';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

// CONFIG
const DEVICE_ID = process.env.EXPORT_DEVICE_ID || 'default-device';
const EXPORT_DIR = process.env.EXPORT_DIR || './data/exports';
const EXPORT_FILE = path.join(EXPORT_DIR, `${DEVICE_ID}-water-readings.xlsx`);

// Helper: Get last timestamp from existing Excel file
function getLastTimestampFromExcel(): number {
  if (!fs.existsSync(EXPORT_FILE)) return 0;

  try {
    const workbook = XLSX.readFile(EXPORT_FILE);
    const sheetName = 'WaterReadings';
    if (!workbook.Sheets[sheetName]) return 0;

    const rows = XLSX.utils.sheet_to_json<{ Timestamp: string }>(
      workbook.Sheets[sheetName]
    );
    if (rows.length === 0) return 0;

    // Get the latest timestamp from existing data
    const timestamps = rows
      .map((r) => new Date(r.Timestamp).getTime())
      .filter((t) => !isNaN(t));
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  } catch (err) {
    console.error('[WARN] Failed to read existing Excel file:', err);
    return 0;
  }
}

// Helper: Ensure export directory exists
function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

// Main export function
async function exportIncremental() {
  ensureExportDir();
  const lastTs = getLastTimestampFromExcel();

  console.log(
    `[INFO] Last exported timestamp: ${
      lastTs ? new Date(lastTs).toISOString() : 'none (export all data)'
    }`
  );

  // Query all readings from InfluxDB (semua data yang ada)
  // Jika ada timestamp terakhir, query dari sana. Jika tidak, query semua dari awal.
  const range = lastTs > 0 ? new Date(lastTs).toISOString() : '-10y'; // Query semua data atau dari timestamp terakhir

  let readings;
  try {
    console.log(`[INFO] Querying InfluxDB with range: ${range}`);
    readings = await queryWaterReadings(DEVICE_ID, range);
    console.log(`[INFO] Found ${readings.length} total readings from InfluxDB`);
  } catch (err) {
    console.error('[ERROR] Failed to query InfluxDB:', err);
    process.exit(1);
  }

  // Filter hanya data baru (timestamp > lastTs)
  const newReadings = readings.filter((r) => r.timestamp.getTime() > lastTs);

  if (newReadings.length === 0) {
    console.log('[INFO] No new readings to export.');
    return;
  }

  console.log(`[INFO] Found ${newReadings.length} new readings to export`);

  // Prepare worksheet data
  const rows = newReadings.map((r) => ({
    Timestamp: r.timestamp.toISOString(),
    DeviceID: r.deviceId,
    FlowRate: r.flowRate,
    TotalVolume: r.totalVolume,
    SolenoidState: r.solenoidState ? 'ON' : 'OFF',
  }));

  // Load or create workbook
  let workbook: XLSX.WorkBook;
  if (fs.existsSync(EXPORT_FILE)) {
    console.log(`[INFO] Loading existing Excel file: ${EXPORT_FILE}`);
    workbook = XLSX.readFile(EXPORT_FILE);
  } else {
    console.log(`[INFO] Creating new Excel file: ${EXPORT_FILE}`);
    workbook = XLSX.utils.book_new();
  }

  // Append to worksheet
  const sheetName = 'WaterReadings';
  let worksheet: XLSX.WorkSheet;
  if (workbook.Sheets[sheetName]) {
    worksheet = workbook.Sheets[sheetName];
    const existingRows = XLSX.utils.sheet_to_json(worksheet);
    const allRows = existingRows.concat(rows);
    worksheet = XLSX.utils.json_to_sheet(allRows);
    console.log(
      `[INFO] Appended ${rows.length} rows to existing sheet (total: ${allRows.length} rows)`
    );
  } else {
    worksheet = XLSX.utils.json_to_sheet(rows);
    workbook.SheetNames.push(sheetName);
    console.log(`[INFO] Created new sheet with ${rows.length} rows`);
  }

  workbook.Sheets[sheetName] = worksheet;
  XLSX.writeFile(workbook, EXPORT_FILE);

  console.log(
    `[SUCCESS] Exported ${newReadings.length} new readings to ${EXPORT_FILE}`
  );
}

// Run
exportIncremental().catch((err) => {
  console.error('[FATAL] Uncaught error:', err);
  process.exit(1);
});
