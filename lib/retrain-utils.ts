import * as XLSX from 'xlsx';

/**
 * Normalize date string to YYYY-MM-DD or YYYY-MM format
 */
export function normalizeDateString(dateValue: unknown): string {
  if (!dateValue) return '';

  const str = String(dateValue).trim();

  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}$/.test(str)) return str;

  // Handle Excel serial date number
  if (typeof dateValue === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(dateValue);
    if (excelDate) {
      const year = excelDate.y;
      const month = String(excelDate.m).padStart(2, '0');
      const day = String(excelDate.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Try to parse common date formats
  // DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, etc.
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str;
}

/**
 * Detect if date is daily (YYYY-MM-DD) or monthly (YYYY-MM)
 */
export function detectDataType(dateString: string): 'daily' | 'monthly' {
  const normalized = normalizeDateString(dateString);

  const dailyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const monthlyPattern = /^\d{4}-\d{2}$/;

  if (dailyPattern.test(normalized)) {
    return 'daily';
  } else if (monthlyPattern.test(normalized)) {
    return 'monthly';
  }

  // Default to daily for ambiguous cases
  return 'daily';
}

/**
 * Validate uploaded data structure
 */
export function validateUploadedData(data: unknown[][]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dataType: 'daily' | 'monthly';
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data exists
  if (!data || data.length === 0) {
    errors.push('No data found in file');
    return { valid: false, errors, warnings, dataType: 'daily' };
  }

  // Check if header row exists
  if (data.length < 2) {
    errors.push('File must contain at least header and one data row');
    return { valid: false, errors, warnings, dataType: 'daily' };
  }

  // Validate headers
  const headers = data[0];
  const requiredHeaders = ['date', 'total_m3'];
  const headerLower = headers.map((h: unknown) =>
    String(h).toLowerCase().trim()
  );

  for (const required of requiredHeaders) {
    if (!headerLower.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, dataType: 'daily' };
  }

  // Get column indices
  const dateIndex = headerLower.indexOf('date');
  const volumeIndex = headerLower.indexOf('total_m3');

  // Detect data type from first valid row
  let dataType: 'daily' | 'monthly' = 'daily';
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[dateIndex]) {
      const normalized = normalizeDateString(row[dateIndex]);
      dataType = detectDataType(normalized);
      break;
    }
  }

  // Validate data rows
  const datesSeen = new Set<string>();
  let validRows = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (!row || row.length === 0) {
      warnings.push(`Row ${i + 1}: Empty row, skipping`);
      continue;
    }

    const dateValue = row[dateIndex];
    const volumeValue = row[volumeIndex];

    // Validate date
    if (!dateValue) {
      warnings.push(`Row ${i + 1}: Missing date value, skipping`);
      continue;
    }

    // Normalize the date string
    const dateStr = normalizeDateString(dateValue);

    if (!dateStr) {
      warnings.push(`Row ${i + 1}: Could not parse date, skipping`);
      continue;
    }

    // Check for duplicates (using normalized date)
    if (datesSeen.has(dateStr)) {
      warnings.push(`Row ${i + 1}: Duplicate date ${dateStr}`);
    }
    datesSeen.add(dateStr);

    // Validate volume
    if (
      volumeValue === null ||
      volumeValue === undefined ||
      volumeValue === ''
    ) {
      warnings.push(`Row ${i + 1}: Missing total_m3 value, skipping`);
      continue;
    }

    const volumeNum = Number(volumeValue);
    if (isNaN(volumeNum)) {
      warnings.push(
        `Row ${i + 1}: Invalid total_m3 value (not a number), skipping`
      );
      continue;
    }

    if (volumeNum < 0) {
      warnings.push(`Row ${i + 1}: Negative total_m3 value, skipping`);
      continue;
    }

    validRows++;
  }

  if (validRows === 0) {
    errors.push('No valid data rows found');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dataType,
  };
}

/**
 * Format training metrics for display with color coding
 */
export function formatMetrics(metrics: {
  mae: number;
  rmse: number;
  mape: number;
}): {
  maeFormatted: string;
  rmseFormatted: string;
  mapeFormatted: string;
  mapeColor: 'green' | 'yellow' | 'orange' | 'red';
  interpretation: string;
} {
  const maeFormatted = metrics.mae.toFixed(3);
  const rmseFormatted = metrics.rmse.toFixed(3);
  const mapeFormatted = `${metrics.mape.toFixed(2)}%`;

  let mapeColor: 'green' | 'yellow' | 'orange' | 'red';
  let interpretation: string;

  if (metrics.mape < 10) {
    mapeColor = 'green';
    interpretation = 'Excellent - Model predictions are highly accurate';
  } else if (metrics.mape < 20) {
    mapeColor = 'yellow';
    interpretation = 'Good - Model predictions are reasonably accurate';
  } else if (metrics.mape < 30) {
    mapeColor = 'orange';
    interpretation = 'Fair - Model predictions have moderate errors';
  } else {
    mapeColor = 'red';
    interpretation =
      'Poor - Model predictions have high errors, consider retraining';
  }

  return {
    maeFormatted,
    rmseFormatted,
    mapeFormatted,
    mapeColor,
    interpretation,
  };
}

/**
 * Parse XLSX file - works in both browser and Node.js
 */
export async function parseXLSX(
  file: File | Blob
): Promise<Array<{ date: string; total_m3: number }>> {
  try {
    // Get ArrayBuffer from file (works in both browser and Node.js)
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Parse workbook
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('No sheets found in Excel file');
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true, // Keep raw values to handle Excel dates properly
      dateNF: 'yyyy-mm-dd', // Format dates properly
    });

    console.log('Parsed Excel data:', jsonData.slice(0, 5)); // Debug log

    // Check if we got any data
    if (!jsonData || jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Validate and parse
    const validation = validateUploadedData(jsonData as unknown[][]);

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Extract data
    const headers = (jsonData[0] as unknown[]).map((h: unknown) =>
      String(h).toLowerCase().trim()
    );
    const dateIndex = headers.indexOf('date');
    const volumeIndex = headers.indexOf('total_m3');

    const result: Array<{ date: string; total_m3: number }> = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown[];
      if (!row || row.length === 0) continue;

      // Use the normalizeDateString helper
      const dateStr = normalizeDateString(row[dateIndex]);
      const volume = Number(row[volumeIndex]);

      if (dateStr && !isNaN(volume)) {
        result.push({ date: dateStr, total_m3: volume });
      }
    }

    if (result.length === 0) {
      throw new Error('No valid data rows found after parsing');
    }

    console.log('Parsed result:', result.slice(0, 5)); // Debug log
    return result;
  } catch (err) {
    console.error('Excel parse error:', err);
    throw err;
  }
}

/**
 * Calculate file hash for duplicate detection - works in both browser and Node.js
 */
export async function calculateFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();

  // Check if we're in Node.js or browser
  if (typeof window === 'undefined') {
    // Node.js environment
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
  } else {
    // Browser environment
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }
}
