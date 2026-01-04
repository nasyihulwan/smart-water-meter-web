import { InfluxDB, Point } from '@influxdata/influxdb-client';

/* ================= LAZY SINGLETON ================= */
let influxDB: InfluxDB | null = null;
let writeApi: ReturnType<InfluxDB['getWriteApi']> | null = null;
let queryApi: ReturnType<InfluxDB['getQueryApi']> | null = null;

interface InfluxRow {
  _time: string;
  flow_rate?: number;
  total_volume?: number;
  solenoid_state?: boolean;
}

function initInflux() {
  if (influxDB && writeApi && queryApi) {
    return { influxDB, writeApi, queryApi };
  }

  const url = process.env.INFLUXDB_URL;
  const token = process.env.INFLUXDB_TOKEN;
  const org = process.env.INFLUXDB_ORG;
  const bucket = process.env.INFLUXDB_BUCKET;

  if (!url || !token || !org || !bucket) {
    throw new Error(
      'InfluxDB env variables are missing (URL, TOKEN, ORG, BUCKET)'
    );
  }

  influxDB = new InfluxDB({ url, token });
  writeApi = influxDB.getWriteApi(org, bucket, 'ms');
  queryApi = influxDB.getQueryApi(org);

  return { influxDB, writeApi, queryApi };
}

/* ================= TYPES ================= */
export interface WaterReading {
  deviceId: string;
  flowRate: number;
  totalVolume: number;
  solenoidState: boolean;
  timestamp: Date;
}

/* ================= WRITE ================= */
export async function writeWaterReading(data: {
  deviceId: string;
  flowRate: number;
  totalVolume: number;
  solenoidState: boolean;
}) {
  const { writeApi } = initInflux();

  const point = new Point('water_reading')
    .tag('device_id', data.deviceId)
    .floatField('flow_rate', data.flowRate)
    .floatField('total_volume', data.totalVolume)
    .booleanField('solenoid_state', data.solenoidState)
    .timestamp(new Date());

  writeApi.writePoint(point);
  await writeApi.flush();
}

/* ================= QUERY MANY ================= */
export async function queryWaterReadings(
  deviceId: string,
  range: string = '-1h'
): Promise<WaterReading[]> {
  const { queryApi } = initInflux();

  const bucket = process.env.INFLUXDB_BUCKET!;
  const query = `
    from(bucket: "${bucket}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: false)
  `;

  const result: WaterReading[] = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as InfluxRow;

        result.push({
          deviceId,
          timestamp: new Date(o._time),
          flowRate: Number(o.flow_rate) || 0,
          totalVolume: Number(o.total_volume) || 0,
          solenoidState: Boolean(o.solenoid_state),
        });
      },
      error(err) {
        console.error('InfluxDB Query Error:', err);
        reject(err);
      },
      complete() {
        resolve(result);
      },
    });
  });
}

/* ================= QUERY LATEST ================= */
export async function getLatestReading(
  deviceId: string
): Promise<WaterReading | null> {
  const { queryApi } = initInflux();

  const bucket = process.env.INFLUXDB_BUCKET!;
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
  `;

  return new Promise((resolve, reject) => {
    let latest: WaterReading | null = null;

    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as InfluxRow;

        latest = {
          deviceId,
          timestamp: new Date(o._time),
          flowRate: Number(o.flow_rate) || 0,
          totalVolume: Number(o.total_volume) || 0,
          solenoidState: Boolean(o.solenoid_state),
        };
      },
      error(err) {
        console.error('InfluxDB Query Error:', err);
        reject(err);
      },
      complete() {
        resolve(latest);
      },
    });
  });
}
