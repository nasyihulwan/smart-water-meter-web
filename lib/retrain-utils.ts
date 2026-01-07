import * as XLSX from 'xlsx';

/**
 * Detect if date is daily (YYYY-MM-DD) or monthly (YYYY-MM)
 */
export function detectDataType(dateString: string): 'daily' | 'monthly' {
  const dailyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const monthlyPattern = /^\d{4}-\d{2}$/;

  if (dailyPattern.test(dateString)) {
    return 'daily';
  } else if (monthlyPattern.test(dateString)) {
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
      dataType = detectDataType(String(row[dateIndex]));
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
      errors.push(`Row ${i + 1}: Missing date value`);
      continue;
    }

    const dateStr = String(dateValue).trim();
    const expectedType = dataType;
    const actualType = detectDataType(dateStr);

    if (actualType !== expectedType) {
      errors.push(
        `Row ${
          i + 1
        }: Inconsistent date format. Expected ${expectedType}, got ${actualType}`
      );
      continue;
    }

    // Check for duplicates
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
      errors.push(`Row ${i + 1}: Missing total_m3 value`);
      continue;
    }

    const volumeNum = Number(volumeValue);
    if (isNaN(volumeNum)) {
      errors.push(`Row ${i + 1}: Invalid total_m3 value (not a number)`);
      continue;
    }

    if (volumeNum < 0) {
      errors.push(`Row ${i + 1}: Negative total_m3 value not allowed`);
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
 * Parse XLSX file in browser using 'xlsx' package
 */
export async function parseXLSX(
  file: File
): Promise<Array<{ date: string; total_m3: number }>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          reject(new Error('No sheets found in Excel file'));
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Validate and parse
        const validation = validateUploadedData(jsonData as unknown[][]);

        if (!validation.valid) {
          reject(
            new Error(`Validation failed: ${validation.errors.join(', ')}`)
          );
          return;
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

          const date = String(row[dateIndex]).trim();
          const volume = Number(row[volumeIndex]);

          if (date && !isNaN(volume)) {
            result.push({ date, total_m3: volume });
          }
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Calculate file hash for duplicate detection
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
