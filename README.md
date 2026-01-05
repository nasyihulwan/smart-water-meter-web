<p align="center">
  <img src="https://img.icons8.com/color/96/water.png" alt="Smart Water Meter Logo"/>
</p>

<h1 align="center">💧 Smart Water Meter Dashboard</h1>

<p align="center">
  <strong>Real-time IoT Water Monitoring System with Smart Analytics</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-api-endpoints">API</a> •
  <a href="#-iot-device">IoT Device</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/InfluxDB-2.x-22ADF6?style=for-the-badge&logo=influxdb" alt="InfluxDB"/>
  <img src="https://img.shields.io/badge/MQTT-EMQX-5C2D91?style=for-the-badge&logo=eclipse-mosquitto" alt="MQTT"/>
</p>

---

## 📖 Deskripsi

**Smart Water Meter Dashboard** adalah sistem monitoring penggunaan air berbasis IoT yang menampilkan data secara real-time. Sistem ini mengintegrasikan sensor flow meter dengan ESP32, berkomunikasi melalui protokol MQTT, dan menyimpan data time-series di InfluxDB.

Dashboard web ini dibangun dengan Next.js 16 dan menampilkan:

- 📊 Grafik konsumsi air real-time
- 💰 Kalkulasi biaya otomatis dengan sistem tier
- 🔌 Kontrol solenoid valve jarak jauh
- 📈 Statistik harian, mingguan, dan bulanan

---

## ✨ Features

| Feature                     | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| 🌊 **Real-time Monitoring** | Lihat flow rate dan total volume secara live via Server-Sent Events (SSE) |
| 📈 **Interactive Charts**   | Grafik konsumsi air dengan Recharts - zoom, pan, dan time range selection |
| 💸 **Smart Pricing**        | Kalkulasi biaya air dengan sistem tier progressif (dapat dikustomisasi)   |
| 🎛️ **Remote Control**       | Kontrol solenoid valve (buka/tutup aliran air) dari dashboard             |
| 🌙 **Dark Mode**            | Tema gelap/terang dengan persistensi                                      |
| 📱 **Responsive**           | Desain mobile-first yang responsif                                        |
| ⚡ **High Performance**     | Optimized dengan React 19 dan Next.js 16                                  |

---

## 🛠 Tech Stack

### Frontend

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.9
- **Styling:** TailwindCSS 4 + Tailwind Animate
- **Charts:** Recharts 3
- **Icons:** Lucide React
- **Theme:** next-themes

### Backend

- **Runtime:** Node.js
- **API:** Next.js API Routes
- **Real-time:** Server-Sent Events (SSE)
- **MQTT Client:** mqtt.js

### Database & Messaging

- **Time-series DB:** InfluxDB 2.x
- **Message Broker:** EMQX Cloud (MQTT)

### IoT Device

- **Microcontroller:** ESP32
- **Sensor:** YF-S201 Flow Sensor
- **Actuator:** Solenoid Valve
- **Code Repository:** [water-meter-iot](https://github.com/nasyihulwan/water-meter-iot)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         MQTT          ┌──────────────┐
    │   ESP32 +    │ ──────────────────►   │  EMQX Cloud  │
    │ Flow Sensor  │ ◄──────────────────   │   (Broker)   │
    │  + Solenoid  │   water_meter/relay   └──────┬───────┘
    └──────────────┘                              │
           │                                      │ water_meter/data
           │                                      ▼
           │                           ┌──────────────────┐
           │                           │  MQTT-InfluxDB   │
           │                           │     Worker       │
           │                           └────────┬─────────┘
           │                                    │
           │                                    ▼
           │                           ┌──────────────────┐
           │                           │    InfluxDB      │
           │                           │  (Time-series)   │
           │                           └────────┬─────────┘
           │                                    │
           │                                    ▼
           │                           ┌──────────────────┐
           └───────────────────────►   │   Next.js App    │
                  User Interface       │   (Dashboard)    │
                                       └────────┬─────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │    Browser       │
                                       │  (SSE Real-time) │
                                       └──────────────────┘
```

### Data Flow

1. **ESP32** membaca flow sensor dan mengirim data via MQTT ke topic `water_meter/data`
2. **MQTT Worker** menerima data dan menyimpan ke InfluxDB
3. **Next.js API** membaca data dari InfluxDB dan mengirim ke frontend via SSE
4. **Dashboard** menampilkan data real-time dan historical
5. **Relay Control** dikirim dari dashboard via MQTT ke topic `water_meter/relay`

---

## 🚀 Getting Started

### Prerequisites

Pastikan Anda sudah menginstall:

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [npm](https://www.npmjs.com/) atau [pnpm](https://pnpm.io/)
- [InfluxDB 2.x](https://www.influxdata.com/products/influxdb/) (cloud atau self-hosted)
- Akses ke MQTT Broker (EMQX Cloud / Mosquitto)

### Step 1: Clone Repository

```bash
# Clone repository
git clone https://github.com/yourusername/smart-water-meter-website.git

# Masuk ke direktori project
cd smart-water-meter-website
```

### Step 2: Install Dependencies

```bash
npm install
# atau
pnpm install
```

### Step 3: Setup Environment Variables

Buat file `.env.local` di root project:

```env
# InfluxDB Configuration
INFLUXDB_URL=https://your-influxdb-url.com
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=your-organization
INFLUXDB_BUCKET=water_meter

# MQTT Configuration (opsional, untuk relay control)
MQTT_URL=mqtts://your-mqtt-broker.com:8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
```

#### Cara Mendapatkan Credentials:

<details>
<summary><b>📦 InfluxDB Cloud (Gratis)</b></summary>

1. Daftar di [InfluxDB Cloud](https://cloud2.influxdata.com/signup)
2. Buat Organization baru
3. Buat Bucket dengan nama `water_meter`
4. Generate API Token:
   - Go to **Load Data** → **API Tokens**
   - Klik **Generate API Token** → **All Access Token**
   - Copy token dan simpan di `.env.local`

</details>

<details>
<summary><b>📡 EMQX Cloud (Gratis)</b></summary>

1. Daftar di [EMQX Cloud](https://www.emqx.com/en/cloud)
2. Buat deployment baru (Serverless - Free)
3. Tambahkan user authentication:
   - Go to **Authentication** → **Add User**
   - Buat username & password
4. Copy connection details ke `.env.local`

</details>

### Step 4: Run Development Server

```bash
# Jalankan Next.js + MQTT Worker secara bersamaan
npm run dev:all
```

Atau jalankan secara terpisah:

```bash
# Terminal 1 - Next.js Development Server
npm run dev

# Terminal 2 - MQTT to InfluxDB Worker
npm run worker
```

### Step 5: Open Dashboard

Buka [http://localhost:3000/dashboard](http://localhost:3000/dashboard) di browser.

---

## 📊 Generate Dummy Data (Opsional)

Jika belum ada device IoT, Anda bisa generate data dummy untuk testing:

```bash
# Generate 7 hari data dummy
npm run generate-data

# Hapus semua data (reset)
npm run clear-data
```

---

## 🔌 API Endpoints

### GET `/api/dashboard`

Mendapatkan data dashboard (latest reading, historical data, statistics).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `device_id` | string | - | ID device water meter |
| `range` | string | `-24h` | Time range (`-1h`, `-24h`, `-7d`, `-30d`) |
| `mode` | string | `live` | Mode query (`live` / `aggregated`) |
| `window` | string | - | Aggregation window (`5m`, `1h`, `1d`) |

**Example:**

```bash
curl "http://localhost:3000/api/dashboard?device_id=water_meter_01&range=-24h"
```

### GET `/api/stream`

Real-time data stream menggunakan Server-Sent Events (SSE).

**Example:**

```javascript
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time data:', data);
};
```

### POST `/api/relay`

Mengontrol solenoid valve (buka/tutup aliran air).

**Request Body:**

```json
{
  "state": "ON" | "OFF"
}
```

**Example:**

```bash
# Buka valve
curl -X POST http://localhost:3000/api/relay \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}'
```

---

## 📱 IoT Device Setup

Kode untuk device ESP32 tersedia di repository terpisah:

### 🔗 [water-meter-iot](https://github.com/nasyihulwan/water-meter-iot)

Repository tersebut berisi:

- Kode PlatformIO untuk ESP32
- Konfigurasi sensor YF-S201
- Koneksi MQTT ke EMQX Cloud
- Kontrol solenoid valve

### Hardware Requirements

| Component      | Description                     |
| -------------- | ------------------------------- |
| ESP32          | Microcontroller dengan WiFi     |
| YF-S201        | Flow sensor (1-30 L/min)        |
| Solenoid Valve | 12V NC (Normally Closed)        |
| Relay Module   | 5V relay untuk kontrol solenoid |
| Power Supply   | 12V 2A untuk solenoid           |

### Wiring Diagram

```
ESP32 Pinout:
├── GPIO 4  ──► YF-S201 Signal (kuning)
├── GPIO 5  ──► Relay IN
├── 3.3V    ──► YF-S201 VCC (merah)
├── GND     ──► YF-S201 GND (hitam)
└── GND     ──► Relay GND

Relay Module:
├── VCC ──► 5V
├── GND ──► GND
├── IN  ◄── GPIO 5
├── COM ──► 12V Power Supply (+)
└── NO  ──► Solenoid Valve (+)
         Solenoid Valve (-) ──► 12V Power Supply (-)
```

---

## 💰 Pricing Configuration

Sistem menggunakan pricing tier progressif yang dapat dikustomisasi:

| Tier | Volume (m³) | Harga per m³ |
| ---- | ----------- | ------------ |
| 1    | 0 - 10      | Rp 3.000     |
| 2    | 10 - 20     | Rp 4.500     |
| 3    | > 20        | Rp 6.000     |

**Biaya Operasional:** Rp 5.000/bulan

Pengaturan dapat diubah melalui **Pricing Settings** di dashboard.

---

## 📁 Project Structure

```
smart-water-meter-website/
├── app/
│   ├── api/
│   │   ├── dashboard/     # Dashboard data API
│   │   ├── relay/         # Relay control API
│   │   └── stream/        # SSE real-time stream
│   ├── dashboard/
│   │   └── page.tsx       # Dashboard page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/
│   │   ├── consumption-card.tsx
│   │   ├── pricing-settings.tsx
│   │   ├── stats-card.tsx
│   │   ├── water-chart.tsx
│   │   └── weekly-report.tsx
│   ├── providers/
│   │   └── theme-provider.tsx
│   └── ui/                # Reusable UI components
├── lib/
│   ├── influxdb.ts        # InfluxDB client
│   ├── mqttClient.ts      # MQTT client
│   ├── pricing.ts         # Pricing calculation
│   └── utils.ts
├── workers/
│   └── mqtt-influx-worker.ts  # Background MQTT worker
├── types/
│   ├── pricing.ts
│   └── waterMeter.ts
├── scripts/
│   ├── generate-dummy-data.ts
│   └── clear-data.ts
└── package.json
```

---

## 🛣 Roadmap

- [x] Real-time monitoring
- [x] Historical data visualization
- [x] Pricing calculation
- [x] Remote relay control
- [x] Dark mode
- [ ] Multi-device support
- [ ] Push notifications
- [ ] Water usage predictions (ML)
- [ ] Export data (CSV/PDF)

---

## 🤝 Contributing

Kontribusi sangat diterima! Silakan buat issue atau pull request.

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 📧 Contact

**Muhammad Nasyih Ulwan**

GitHub : [https://github.com/nasyihulwan](https://github.com/nasyihulwan) Email : [nasyihulwan@upi.edu](nasyihulwan@upi.edu)

Project Link: [https://github.com/nasyihulwan/smart-water-meter-website](https://github.com/nasyihulwan/smart-water-meter-website)

---

<p align="center">
  Made with ❤️ for IoT enthusiasts
</p>

<p align="center">
  <a href="#-smart-water-meter-dashboard">Back to Top ↑</a>
</p>
