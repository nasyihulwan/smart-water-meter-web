import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ForecastData } from '@/types/forecast';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'forecast_output.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const forecastData: ForecastData = JSON.parse(fileContent);

    return NextResponse.json(forecastData);
  } catch (error) {
    console.error('Failed to load forecast data:', error);
    return NextResponse.json(
      { error: 'Failed to load forecast data' },
      { status: 500 }
    );
  }
}
