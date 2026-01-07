import type { HistoryRecord } from '@/types/history';
import * as XLSX from 'xlsx';

export interface TrainingResponse {
  success: boolean;
  message: string;
  details?: {
    dataPoints: number;
    trainedOn: string;
  };
}

/**
 * Trigger background model training after data input
 * This function handles the entire training process silently
 */
export async function triggerBackgroundTraining(
  records: HistoryRecord[]
): Promise<TrainingResponse> {
  try {
    // 1. Convert records to XLSX format matching Python server expectations
    const trainingData = records.map((record) => {
      return {
        date: record.month, // YYYY-MM format for monthly data
        total_m3: record.volumeM3, // Volume in m³
      };
    });

    // Sort by date
    trainingData.sort((a, b) => a.date.localeCompare(b.date));

    // 2. Create XLSX file
    const ws = XLSX.utils.json_to_sheet(trainingData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Convert to binary
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 3. Prepare FormData with file upload
    const formData = new FormData();
    formData.append('file', blob, 'historical_data.xlsx');

    // 4. Send to Python server
    const PYTHON_SERVER_URL =
      process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://0.0.0.0:5000';

    console.log('[HISTORY-TRAINING] Sending XLSX file to Python server:', {
      url: `${PYTHON_SERVER_URL}/api/train`,
      dataPoints: trainingData.length,
      sampleData: trainingData.slice(0, 3),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minute timeout

    try {
      const response = await fetch(`${PYTHON_SERVER_URL}/api/train`, {
        method: 'POST',
        body: formData, // Send as multipart/form-data, not JSON
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        const errorMessage =
          errorData.error || errorData.message || 'Gagal memproses data';

        console.error('Python server error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          fullResponse: errorData,
        });

        // Return user-friendly error instead of throwing
        return {
          success: false,
          message: `Gagal memproses data: ${errorMessage}. Data Anda tetap tersimpan dan dapat dicoba lagi nanti.`,
        };
      }

      // Get the forecast result
      const result = await response.json();

      // Save forecast to forecast_output.json via API
      try {
        await fetch('/api/save-forecast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result.data), // Python returns { data: {...} }
        });
        console.log('[HISTORY-TRAINING] Forecast saved successfully');
      } catch (saveError) {
        console.warn(
          '[HISTORY-TRAINING] Failed to save forecast file:',
          saveError
        );
        // Don't fail the whole operation if save fails
      }

      return {
        success: true,
        message: 'Data berhasil diproses dan siap untuk prediksi!',
        details: {
          dataPoints: trainingData.length,
          trainedOn: new Date().toISOString(),
        },
      };
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          success: false,
          message:
            'Proses memakan waktu terlalu lama. Data Anda tetap tersimpan dan dapat dicoba lagi nanti.',
        };
      }

      // Don't throw, return error response
      console.error('Fetch error:', fetchError);
      return {
        success: false,
        message:
          'Tidak dapat terhubung ke server pemrosesan. Data Anda tetap tersimpan dan dapat dicoba lagi nanti.',
      };
    }
  } catch (error) {
    console.error('Training error:', error);

    // Handle different error types gracefully
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return {
          success: false,
          message:
            'Sistem sedang tidak dapat memproses data. Data Anda tetap tersimpan dan dapat dicoba lagi nanti.',
        };
      }

      return {
        success: false,
        message: error.message || 'Gagal memproses data. Silakan coba lagi.',
      };
    }

    return {
      success: false,
      message: 'Gagal memproses data. Pastikan sistem berjalan dengan baik.',
    };
  }
}

/**
 * Check if there's pending data that needs processing
 */
export function checkPendingProcessing(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const pending = localStorage.getItem('history_needs_processing');
    return pending === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark data as needing processing
 */
export function markNeedsProcessing(value: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    if (value) {
      localStorage.setItem('history_needs_processing', 'true');
    } else {
      localStorage.removeItem('history_needs_processing');
    }
  } catch (error) {
    console.error('Failed to update processing flag:', error);
  }
}
