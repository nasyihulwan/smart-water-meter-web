import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FORECAST_OUTPUT = path.join(
  process.cwd(),
  'data',
  'forecast_output.json'
);

export async function POST(request: NextRequest) {
  try {
    const forecastData = await request.json();

    // Ensure data directory exists
    const dataDir = path.dirname(FORECAST_OUTPUT);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save forecast data
    fs.writeFileSync(FORECAST_OUTPUT, JSON.stringify(forecastData, null, 2));

    console.log('[SAVE-FORECAST] Forecast data saved successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SAVE-FORECAST] Error saving forecast:', error);
    return NextResponse.json(
      { error: 'Failed to save forecast' },
      { status: 500 }
    );
  }
}
