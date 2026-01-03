import { InfluxDB, Point } from '@influxdata/influxdb-client';

const url = process.env.INFLUXDB_URL!;
const token = process.env.INFLUXDB_TOKEN!;
const org = process.env.INFLUXDB_ORG!;
const bucket = process.env.INFLUXDB_BUCKET!;

// InfluxDB Client
export const influxDB = new InfluxDB({ url, token });

// Write API
export const writeApi = influxDB.getWriteApi(org, bucket, 'ms');

// Query API
export const queryApi = influxDB.getQueryApi(org);

// Type definitions
export interface WaterReading {
  deviceId: string;
  flowRate: number;
  totalVolume: number;
  solenoidState: boolean;
  timestamp: Date;
}

// Write water reading to InfluxDB
export async function writeWaterReading(data: {
  deviceId: string;
  flowRate: number;
  totalVolume: number;
  solenoidState: boolean;
}) {
  const point = new Point('water_reading')
    .tag('device_id', data.deviceId)
    .floatField('flow_rate', data.flowRate)
    .floatField('total_volume', data.totalVolume)
    .booleanField('solenoid_state', data.solenoidState)
    .timestamp(new Date());

  writeApi.writePoint(point);
  await writeApi.flush();
}

// Query water readings from InfluxDB
export async function queryWaterReadings(
  deviceId: string,
  range: string = '-1h'
): Promise<WaterReading[]> {
  const query = `
    from(bucket: "${bucket}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> pivot(rowKey: ["_time"], columnKey:  ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc:  false)
  `;

  const result: WaterReading[] = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(
        row: string[],
        tableMeta: { toObject: (row: string[]) => Record<string, unknown> }
      ) {
        const o = tableMeta.toObject(row);
        result.push({
          deviceId: deviceId, // ← TAMBAHKAN INI
          timestamp: new Date(o._time as string),
          flowRate: (o.flow_rate as number) || 0,
          totalVolume: (o.total_volume as number) || 0,
          solenoidState: (o.solenoid_state as boolean) || false,
        });
      },
      error(error: Error) {
        console.error('InfluxDB Query Error:', error);
        reject(error);
      },
      complete() {
        resolve(result);
      },
    });
  });
}

// Get latest reading
export async function getLatestReading(
  deviceId: string
): Promise<WaterReading | null> {
  const query = `
    from(bucket: "${bucket}")
      |> range(start:  -1h)
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> pivot(rowKey:  ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
  `;

  return new Promise((resolve, reject) => {
    let latest: WaterReading | null = null;

    queryApi.queryRows(query, {
      next(
        row: string[],
        tableMeta: { toObject: (row: string[]) => Record<string, unknown> }
      ) {
        const o = tableMeta.toObject(row);
        latest = {
          deviceId: deviceId, // ← TAMBAHKAN INI
          timestamp: new Date(o._time as string),
          flowRate: (o.flow_rate as number) || 0,
          totalVolume: (o.total_volume as number) || 0,
          solenoidState: (o.solenoid_state as boolean) || false,
        };
      },
      error(error: Error) {
        console.error('InfluxDB Query Error:', error);
        reject(error);
      },
      complete() {
        resolve(latest);
      },
    });
  });
}
