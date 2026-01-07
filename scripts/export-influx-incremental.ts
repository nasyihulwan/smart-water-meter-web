import { queryWaterReadings } from '../lib/influxdb';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

// CONFIG
const DEVICE_ID = process.env.EXPORT_DEVICE_ID || 'water_meter_01';
const EXPORT_DIR = process.env.EXPORT_DIR || './data/exports';
const EXPORT_FILE = path.join(EXPORT_DIR, `${DEVICE_ID}-water-readings.xlsx`);

// Helper: Get last date from existing Excel file
function getLastDateFromExcel(): string | null {
  if (!fs.existsSync(EXPORT_FILE)) return null;

  try {
    const workbook = XLSX.readFile(EXPORT_FILE);
    const sheetName = 'WaterReadings';
    if (!workbook.Sheets[sheetName]) return null;

    const rows = XLSX.utils.sheet_to_json<{ Date: string }>(
      workbook.Sheets[sheetName]
    );
    if (rows.length === 0) return null;

    // Get the latest date from existing data
    const dates = rows.map((r) => r.Date).filter((d) => d);
    return dates.length > 0 ? dates[dates.length - 1] : null;
  } catch (err) {
    console.error('[WARN] Failed to read existing Excel file:', err);
    return null;
  }
}

// Helper: Format date as YY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Aggregate readings by day
function aggregateByDay(
  readings: Array<{ timestamp: Date; totalVolume: number; flowRate: number }>
): Map<string, number> {
  const dailyData = new Map<string, number>();

  for (const reading of readings) {
    const dateKey = formatDate(reading.timestamp);
    const currentMax = dailyData.get(dateKey) || 0;
    // Get max total_volume for each day
    if (reading.totalVolume > currentMax) {
      dailyData.set(dateKey, reading.totalVolume);
    }
  }

  return dailyData;
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
  const lastDate = getLastDateFromExcel();

  console.log(
    `[INFO] Last exported date: ${lastDate || 'none (export all data)'}`
  );

  // Query all readings from InfluxDB
  const range = '-10y'; // Query semua data

  let readings;
  try {
    console.log(`[INFO] Querying InfluxDB with range: ${range}`);
    readings = await queryWaterReadings(DEVICE_ID, range);
    console.log(`[INFO] Found ${readings.length} total readings from InfluxDB`);
  } catch (err) {
    console.error('[ERROR] Failed to query InfluxDB:', err);
    process.exit(1);
  }

  // Filter hanya data yang ada flow_rate nya
  const validReadings = readings.filter((r) => r.flowRate > 0);
  console.log(
    `[INFO] Found ${validReadings.length} readings with flow_rate > 0`
  );

  if (validReadings.length === 0) {
    console.log('[INFO] No readings with flow_rate to export.');
    return;
  }

  // Aggregate by day
  const dailyData = aggregateByDay(validReadings);
  console.log(`[INFO] Aggregated into ${dailyData.size} days`);

  // Filter hanya data baru (date > lastDate)
  const newDailyData = new Map<string, number>();
  for (const [date, volume] of dailyData) {
    if (!lastDate || date > lastDate) {
      newDailyData.set(date, volume);
    }
  }

  if (newDailyData.size === 0) {
    console.log('[INFO] No new daily data to export.');
    return;
  }

  console.log(`[INFO] Found ${newDailyData.size} new days to export`);

  // Prepare worksheet data
  const rows = Array.from(newDailyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by date
    .map(([date, totalM3]) => ({
      Date: date,
      Total_m3: totalM3,
      Total_Litre: totalM3 * 1000,
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
    `[SUCCESS] Exported ${rows.length} new daily records to ${EXPORT_FILE}`
  );
}

// Run
exportIncremental().catch((err) => {
  console.error('[FATAL] Uncaught error:', err);
  process.exit(1);
});
