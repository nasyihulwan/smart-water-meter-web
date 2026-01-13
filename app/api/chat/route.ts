// app/api/chat/route.ts
/**
 * API Route untuk Chatbot
 * - Menerima message dari frontend
 * - Query InfluxDB untuk water data
 * - Baca forecast_output.json untuk forecast data
 * - Kirim ke Python chatbot server
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getLatestReading,
  getTodayConsumption,
  getWeeklyConsumption,
  getMonthlyConsumption,
  queryAggregatedReadings,
} from '@/lib/influxdb';

// ==========================================
// TYPES
// ==========================================

interface ChatRequest {
  message: string;
  user_id?: string;
}

interface RealtimeData {
  flow_rate: number;
  total_volume: number;
  timestamp: string;
  solenoid_state?: boolean;
}

interface HistoricalDataPoint {
  timestamp: string;
  consumption: number;
  avgFlowRate: number;
}

interface WaterData {
  realtime: RealtimeData | null;
  today_consumption: number;
  weekly_consumption: number;
  monthly_consumption: number;
  historical: HistoricalDataPoint[];
}

// Forecast Types
interface DailyForecast {
  date: string;
  volumeInLiters: number;
  volumeInLiters_lower: number;
  volumeInLiters_upper: number;
}

interface WeeklyForecast {
  week: string;
  volumeInLiters: number;
  volumeInLiters_lower: number;
  volumeInLiters_upper: number;
}

interface MonthlyForecast {
  month: string;
  volumeInLiters: number;
  volumeInLiters_lower: number;
  volumeInLiters_upper: number;
}

interface ForecastMetadata {
  model: string;
  trained_on: string;
  last_data_date: string;
  prediction_date: string;
  forecast_start: string;
  forecast_end: string;
  unit: string;
  data_type: string;
  evaluation: {
    mae: number;
    rmse: number;
    mape: number;
    train_size: number;
    test_size: number;
  };
  note: string;
}

interface ForecastData {
  daily: DailyForecast[];
  weekly: WeeklyForecast[];
  monthly: MonthlyForecast[];
  metadata: ForecastMetadata;
}

interface PythonChatRequest {
  message: string;
  user_id: string;
  device_id: string;
  water_data: WaterData;
  forecast_data: ForecastData | null;
  include_debug?: boolean;
}

interface PythonChatResponse {
  response: string;
  intent: string;
  timestamp: string;
  debug?: Record<string, unknown>;
}

// ==========================================
// CONFIG
// ==========================================

const DEVICE_ID = 'water_meter_01';
const PYTHON_CHATBOT_URL =
  process.env.PYTHON_CHATBOT_URL || 'http://localhost:8000';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Fetch water data dari InfluxDB
 */
async function fetchWaterData(deviceId: string): Promise<WaterData> {
  try {
    const [
      latestReading,
      todayConsumption,
      weeklyConsumption,
      monthlyConsumption,
      historicalData,
    ] = await Promise.all([
      getLatestReading(deviceId).catch(() => null),
      getTodayConsumption(deviceId).catch(() => 0),
      getWeeklyConsumption(deviceId).catch(() => 0),
      getMonthlyConsumption(deviceId).catch(() => 0),
      queryAggregatedReadings(deviceId, '-7d', '1d').catch(() => []),
    ]);

    const realtime: RealtimeData | null = latestReading
      ? {
          flow_rate: latestReading.flowRate || 0,
          total_volume: latestReading.totalVolume || 0,
          timestamp: latestReading.timestamp.toISOString(),
          solenoid_state: latestReading.solenoidState,
        }
      : null;

    const historical: HistoricalDataPoint[] = historicalData.map((item) => ({
      timestamp: item.timestamp.toISOString(),
      consumption: item.consumption || 0,
      avgFlowRate: item.avgFlowRate || 0,
    }));

    return {
      realtime,
      today_consumption: todayConsumption || 0,
      weekly_consumption: weeklyConsumption || 0,
      monthly_consumption: monthlyConsumption || 0,
      historical,
    };
  } catch (error) {
    console.error('Error fetching water data:', error);
    return {
      realtime: null,
      today_consumption: 0,
      weekly_consumption: 0,
      monthly_consumption: 0,
      historical: [],
    };
  }
}

/**
 * Baca forecast data dari file JSON
 */
async function fetchForecastData(): Promise<ForecastData | null> {
  try {
    const forecastPath = path.join(
      process.cwd(),
      'data',
      'forecast_output.json'
    );
    const fileContent = await fs.readFile(forecastPath, 'utf-8');
    const forecastData: ForecastData = JSON.parse(fileContent);

    console.log('[Chat API] Forecast data loaded:', {
      dailyCount: forecastData.daily?.length || 0,
      weeklyCount: forecastData.weekly?.length || 0,
      monthlyCount: forecastData.monthly?.length || 0,
      model: forecastData.metadata?.model,
      predictionDate: forecastData.metadata?.prediction_date,
    });

    return forecastData;
  } catch (error) {
    console.error('Error reading forecast data:', error);
    return null;
  }
}

/**
 * Send chat request ke Python server
 */
async function sendToPythonChatbot(
  request: PythonChatRequest
): Promise<PythonChatResponse> {
  const response = await fetch(`${PYTHON_CHATBOT_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python chatbot error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ==========================================
// API ROUTE HANDLERS
// ==========================================

/**
 * POST /api/chat
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: ChatRequest = await request.json();

    // 2. Validate message
    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    const userId = body.user_id || 'web_user';

    console.log(`\n[Chat API] Message:  "${message}" from ${userId}`);

    // 3. Fetch water data dari InfluxDB
    console.log(`[Chat API] Fetching water data for device: ${DEVICE_ID}`);
    const waterData = await fetchWaterData(DEVICE_ID);

    // 4. Fetch forecast data dari JSON file
    console.log(`[Chat API] Loading forecast data... `);
    const forecastData = await fetchForecastData();

    console.log(`[Chat API] Data ready: `, {
      hasWaterData: !!waterData.realtime || waterData.today_consumption > 0,
      hasForecastData: !!forecastData,
    });

    // 5. Send ke Python chatbot
    console.log(`[Chat API] Sending to Python chatbot...`);

    const pythonRequest: PythonChatRequest = {
      message,
      user_id: userId,
      device_id: DEVICE_ID,
      water_data: waterData,
      forecast_data: forecastData,
      include_debug: process.env.NODE_ENV === 'development',
    };

    const pythonResponse = await sendToPythonChatbot(pythonRequest);

    console.log(
      `[Chat API] Response received - Intent: ${pythonResponse.intent}`
    );

    // 6. Return response
    return NextResponse.json({
      response: pythonResponse.response,
      intent: pythonResponse.intent,
      timestamp: pythonResponse.timestamp,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          device_id: DEVICE_ID,
          water_data_summary: {
            today_consumption: waterData.today_consumption,
            monthly_consumption: waterData.monthly_consumption,
            has_realtime: !!waterData.realtime,
          },
          forecast_summary: forecastData
            ? {
                model: forecastData.metadata?.model,
                monthly_forecast: forecastData.monthly?.[0]?.volumeInLiters,
              }
            : null,
        },
      }),
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);

    if (error instanceof Error && error.message.includes('fetch failed')) {
      return NextResponse.json(
        {
          error: 'Chatbot server tidak tersedia',
          response:
            'Maaf, server chatbot sedang tidak aktif.  Silakan coba lagi nanti.  🔧',
          intent: 'error',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        response: 'Maaf, terjadi kesalahan.  Silakan coba lagi.  🙏',
        intent: 'error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat - Health check
 */
export async function GET() {
  try {
    const pythonHealth = await fetch(`${PYTHON_CHATBOT_URL}/health`, {
      method: 'GET',
    })
      .then((res) => res.json())
      .catch(() => ({ status: 'unreachable' }));

    let influxStatus = 'unknown';
    try {
      const reading = await getLatestReading(DEVICE_ID);
      influxStatus = reading ? 'connected' : 'no_data';
    } catch {
      influxStatus = 'error';
    }

    // Check forecast file
    let forecastStatus = 'unknown';
    try {
      const forecastData = await fetchForecastData();
      forecastStatus = forecastData ? 'loaded' : 'not_found';
    } catch {
      forecastStatus = 'error';
    }

    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/chat',
      device_id: DEVICE_ID,
      python_chatbot: {
        url: PYTHON_CHATBOT_URL,
        status: pythonHealth.status || 'unknown',
      },
      influxdb: {
        status: influxStatus,
      },
      forecast: {
        status: forecastStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
