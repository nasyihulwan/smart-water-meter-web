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
  consumption?: number;
  avgFlowRate?: number;
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

export interface AggregatedReading {
  timestamp: Date;
  consumption: number;
  avgFlowRate: number;
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

/* ================= QUERY AGGREGATED (SIMPLIFIED) ================= */
export async function queryAggregatedReadings(
  deviceId: string,
  range: string,
  window: string
): Promise<AggregatedReading[]> {
  const { queryApi } = initInflux();

  const bucket = process.env.INFLUXDB_BUCKET!;

  const query = `
    from(bucket: "${bucket}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> filter(fn: (r) => r._field == "total_volume" or r._field == "flow_rate")
      |> aggregateWindow(every: ${window}, fn: max, createEmpty: false)
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> filter(fn: (r) => r.total_volume > 0.0)
      |> sort(columns: ["_time"], desc: false)
  `;

  const result: AggregatedReading[] = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as InfluxRow;

        result.push({
          timestamp: new Date(o._time),
          consumption: Number(o.total_volume) || 0,
          avgFlowRate: Number(o.flow_rate) || 0,
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

/* ================= QUERY TODAY'S CONSUMPTION ================= */
export async function getTodayConsumption(deviceId: string): Promise<number> {
  const { queryApi } = initInflux();

  const bucket = process.env.INFLUXDB_BUCKET!;

  // Query data dari 24 jam terakhir untuk mendapatkan data hari ini
  // Menggunakan -24h untuk menghindari masalah timezone dimana _time di InfluxDB
  // mungkin tercatat sebagai "kemarin" meskipun data baru dikirim
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -24h)
      |> filter(fn:  (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> filter(fn: (r) => r._field == "total_volume")
      |> max()
  `;

  return new Promise((resolve, reject) => {
    let maxVolume = 0;

    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as { _value: number };
        maxVolume = Number(o._value) || 0;
      },
      error(err) {
        console.error('InfluxDB Query Error:', err);
        reject(err);
      },
      complete() {
        resolve(maxVolume);
      },
    });
  });
}

/* ================= QUERY WEEKLY CONSUMPTION ================= */
export async function getWeeklyConsumption(deviceId: string): Promise<number> {
  const { queryApi } = initInflux();

  const bucket = process.env.INFLUXDB_BUCKET!;

  // Query 7 hari terakhir
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r. device_id == "${deviceId}")
      |> filter(fn: (r) => r._field == "total_volume")
      |> max()
  `;

  return new Promise((resolve, reject) => {
    let maxVolume = 0;

    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as { _value: number };
        maxVolume = Number(o._value) || 0;
      },
      error(err) {
        console.error('InfluxDB Query Error:', err);
        reject(err);
      },
      complete() {
        resolve(maxVolume);
      },
    });
  });
}

/* ================= QUERY MONTHLY CONSUMPTION ================= */
export async function getMonthlyConsumption(deviceId: string): Promise<number> {
  const { queryApi } = initInflux();

  const bucket = process.env.INFLUXDB_BUCKET!;

  // Query last 30 days
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "water_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> filter(fn: (r) => r._field == "total_volume")
      |> max()
  `;

  return new Promise((resolve, reject) => {
    let maxVolume = 0;

    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as { _value: number };
        maxVolume = Number(o._value) || 0;
      },
      error(err) {
        console.error('InfluxDB Query Error:', err);
        reject(err);
      },
      complete() {
        resolve(maxVolume);
      },
    });
  });
}
