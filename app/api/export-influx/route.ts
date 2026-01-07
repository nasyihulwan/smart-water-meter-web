import { NextRequest, NextResponse } from 'next/server';
import { exportInfluxDataForTraining } from '@/lib/influxdb';
import * as XLSX from 'xlsx';

function getCurrentTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get('range');
  const format = (searchParams.get('format') || 'daily') as 'daily' | 'monthly';
  const deviceId = searchParams.get('deviceId') || 'water_meter_01';

  console.log(
    `${getCurrentTimestamp()} [EXPORT-INFLUX] Starting export, range: ${range}, format: ${format}`
  );

  // Validate required parameters
  if (!range) {
    console.error(
      `${getCurrentTimestamp()} [EXPORT-INFLUX] Missing range parameter`
    );
    return NextResponse.json(
      { error: 'Missing required parameter: range' },
      { status: 400 }
    );
  }

  // Validate format
  if (format !== 'daily' && format !== 'monthly') {
    console.error(
      `${getCurrentTimestamp()} [EXPORT-INFLUX] Invalid format: ${format}`
    );
    return NextResponse.json(
      { error: 'Invalid format. Must be "daily" or "monthly"' },
      { status: 400 }
    );
  }

  try {
    // Query InfluxDB
    const data = await exportInfluxDataForTraining(deviceId, range, format);

    console.log(
      `${getCurrentTimestamp()} [EXPORT-INFLUX] Queried InfluxDB, found ${
        data.length
      } records`
    );

    // Prepare data for Excel
    const rows = data.map((d) => ({
      date: d.date,
      total_m3: d.total_m3,
    }));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WaterData');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log(
      `${getCurrentTimestamp()} [EXPORT-INFLUX] Generated XLSX file, size: ${(
        buffer.length / 1024
      ).toFixed(2)}KB`
    );

    // Generate filename with date range
    let filename = 'water_export';
    if (data.length > 0) {
      const startDate = data[0].date;
      const endDate = data[data.length - 1].date;
      filename = `water_export_${startDate}_to_${endDate}.xlsx`;
    } else {
      filename = `water_export_empty_${
        new Date().toISOString().split('T')[0]
      }.xlsx`;
    }

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(`${getCurrentTimestamp()} [EXPORT-INFLUX] Error:`, error);

    // Check if it's an InfluxDB connection error
    if (error instanceof Error && error.message.includes('InfluxDB')) {
      return NextResponse.json(
        { error: 'InfluxDB connection error. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
