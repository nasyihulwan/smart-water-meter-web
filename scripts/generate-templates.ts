import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates');

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// Generate Monthly Template
function generateMonthlyTemplate() {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Data
  const dataSheet = XLSX.utils.aoa_to_sheet([
    ['date', 'total_m3'],
    ['2026-01', 22],
    ['2026-02', 48],
    ['2026-03', 57],
  ]);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

  // Sheet 2: Instructions
  const instructions = [
    ['MONTHLY DATA TEMPLATE'],
    ['====================='],
    [''],
    ['How to fill this template:'],
    ['1. Date column: Use YYYY-MM format (e.g., 2026-01 for January 2026)'],
    ['2. total_m3 column: Enter total water consumption in cubic meters'],
    [''],
    ['Example:'],
    ['- 2026-01, 22  → January 2026, 22 m³'],
    ['- 2026-02, 48  → February 2026, 48 m³'],
    [''],
    ['Tips:'],
    ['- Data should be consecutive months'],
    ['- No gaps in dates'],
    ['- Values should be positive numbers'],
    [''],
    ['Save as .xlsx file before uploading.'],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Write file
  const filePath = path.join(TEMPLATES_DIR, 'template_monthly.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ Created: ${filePath}`);
}

// Generate Daily Template
function generateDailyTemplate() {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Data
  const dataSheet = XLSX.utils.aoa_to_sheet([
    ['date', 'total_m3'],
    ['2025-12-01', 1.5],
    ['2025-12-02', 1.8],
    ['2025-12-03', 1.4],
  ]);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

  // Sheet 2: Instructions
  const instructions = [
    ['DAILY DATA TEMPLATE (RECOMMENDED)'],
    ['=================================='],
    [''],
    ['How to fill this template:'],
    ['1. Date column: Use YYYY-MM-DD format (e.g., 2025-12-01)'],
    ['2. total_m3 column: Enter daily water consumption in cubic meters'],
    [''],
    ['Example:'],
    ['- 2025-12-01, 1.5  → Dec 1, 2025, 1.5 m³'],
    ['- 2025-12-02, 1.8  → Dec 2, 2025, 1.8 m³'],
    [''],
    ['Why daily data is better:'],
    ['✅ Higher accuracy (~5-10% error vs ~10-15% for monthly)'],
    ['✅ Captures weekly patterns'],
    ['✅ Better trend detection'],
    [''],
    ['Tips:'],
    ['- Data should be consecutive days (no gaps)'],
    ['- At least 30 days recommended'],
    ['- 90+ days ideal for best accuracy'],
    [''],
    ['Save as .xlsx file before uploading.'],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Write file
  const filePath = path.join(TEMPLATES_DIR, 'template_daily.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ Created: ${filePath}`);
}

// Generate both templates
console.log('Generating Excel templates...');
generateMonthlyTemplate();
generateDailyTemplate();
console.log('✅ All templates generated successfully!');
