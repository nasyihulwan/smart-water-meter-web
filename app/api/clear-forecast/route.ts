import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE() {
  try {
    const filePath = join(process.cwd(), 'data', 'forecast_output.json');

    try {
      await unlink(filePath);
      return NextResponse.json({
        success: true,
        message: 'Forecast data cleared successfully',
      });
    } catch (error: any) {
      // File doesn't exist, that's fine
      if (error.code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          message: 'No forecast data to clear',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error clearing forecast:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear forecast data' },
      { status: 500 }
    );
  }
}
