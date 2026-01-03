import { NextResponse } from 'next/server';
import { writeWaterReading, queryWaterReadings } from '@/lib/influxdb';

export async function GET() {
  try {
    // Test write dummy data
    await writeWaterReading({
      deviceId: 'ESP32_001',
      flowRate: Math.random() * 10,
      totalVolume: Math.random() * 1000,
      solenoidState: Math.random() > 0.5,
    });

    // Test query data
    const data = await queryWaterReadings('ESP32_001', '-24h');

    return NextResponse.json({
      success: true,
      message: 'InfluxDB connection successful!  ✅',
      dataCount: data.length,
      latestData: data[data.length - 1] || null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
