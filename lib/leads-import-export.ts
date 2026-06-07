import * as XLSX from "xlsx";
import { LeadSource, LeadStage } from "@prisma/client";
import { SOURCE_LABELS, STAGE_LABELS } from "@/lib/utils";

export const LEAD_CSV_HEADERS = [
  "name",
  "email",
  "phone",
  "source",
  "stage",
  "propertyInterest",
  "budget",
  "location",
  "notes",
  "assignedToEmail",
] as const;

export const MAX_IMPORT_ROWS = 1000;

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  "full name": "name",
  "lead name": "name",
  email: "email",
  "email address": "email",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  source: "source",
  "lead source": "source",
  stage: "stage",
  "lead stage": "stage",
  propertyinterest: "propertyInterest",
  "property interest": "propertyInterest",
  budget: "budget",
  location: "location",
  notes: "notes",
  assignedtoemail: "assignedToEmail",
  "assigned to email": "assignedToEmail",
  "assigned to": "assignedToEmail",
  assignee: "assignedToEmail",
};

const STAGE_VALUES = new Set<string>(Object.values(LeadStage));
const SOURCE_VALUES = new Set<string>(Object.values(LeadSource));

const STAGE_BY_LABEL = Object.fromEntries(
  Object.entries(STAGE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
);
const SOURCE_BY_LABEL = Object.fromEntries(
  Object.entries(SOURCE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
);

export interface ParsedLeadRow {
  rowNumber: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  stage: LeadStage;
  propertyInterest: string | null;
  budget: number | null;
  location: string | null;
  notes: string | null;
  assignedToEmail: string | null;
}

export interface RowValidationError {
  row: number;
  message: string;
}

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "");
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCsvText(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\r" && next === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      i++;
    } else if (char === "\n" || char === "\r") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.every((v) => !v.trim())) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (values[idx] ?? "").trim();
    });
    records.push(record);
  }

  return records;
}

export function parseSpreadsheetBuffer(buffer: Buffer, filename: string): Record<string, string>[] {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    return parseCsvText(text);
  }

  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) return [];

  const headers = (rawRows[0] as unknown[]).map((h) => normalizeHeader(cellToString(h)));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const values = rawRows[i] as unknown[];
    if (!values || values.every((v) => !cellToString(v))) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = cellToString(values[idx]);
    });
    records.push(record);
  }

  return records;
}

function parseStage(value: string): LeadStage | null {
  if (!value) return LeadStage.NEW;
  const upper = value.toUpperCase().replace(/\s+/g, "_");
  if (STAGE_VALUES.has(upper)) return upper as LeadStage;
  const byLabel = STAGE_BY_LABEL[value.toLowerCase()];
  return byLabel ? (byLabel as LeadStage) : null;
}

function parseSource(value: string): LeadSource | null {
  if (!value) return LeadSource.OTHER;
  const upper = value.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (SOURCE_VALUES.has(upper)) return upper as LeadSource;
  const byLabel = SOURCE_BY_LABEL[value.toLowerCase()];
  return byLabel ? (byLabel as LeadSource) : null;
}

function parseBudget(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[₹,\s]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function validateAndParseRows(
  records: Record<string, string>[]
): { rows: ParsedLeadRow[]; errors: RowValidationError[] } {
  const rows: ParsedLeadRow[] = [];
  const errors: RowValidationError[] = [];

  if (records.length > MAX_IMPORT_ROWS) {
    errors.push({
      row: 0,
      message: `File contains ${records.length} rows. Maximum allowed is ${MAX_IMPORT_ROWS}.`,
    });
    return { rows, errors };
  }

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const name = record.name?.trim();

    if (!name) {
      errors.push({ row: rowNumber, message: "Name is required" });
      return;
    }

    const stage = parseStage(record.stage ?? "");
    if (record.stage && !stage) {
      errors.push({ row: rowNumber, message: `Invalid stage: "${record.stage}"` });
      return;
    }

    const source = parseSource(record.source ?? "");
    if (record.source && !source) {
      errors.push({ row: rowNumber, message: `Invalid source: "${record.source}"` });
      return;
    }

    const budgetRaw = record.budget ?? "";
    const budget = parseBudget(budgetRaw);
    if (budgetRaw && budget == null) {
      errors.push({ row: rowNumber, message: `Invalid budget: "${budgetRaw}"` });
      return;
    }

    rows.push({
      rowNumber,
      name,
      email: record.email?.trim() || null,
      phone: record.phone?.trim() || null,
      source: source ?? LeadSource.OTHER,
      stage: stage ?? LeadStage.NEW,
      propertyInterest: record.propertyInterest?.trim() || null,
      budget,
      location: record.location?.trim() || null,
      notes: record.notes?.trim() || null,
      assignedToEmail: record.assignedToEmail?.trim().toLowerCase() || null,
    });
  });

  return { rows, errors };
}

export function leadsToCsv(
  leads: Array<{
    name: string;
    email: string | null;
    phone: string | null;
    source: string;
    stage: string;
    propertyInterest: string | null;
    budget: number | null;
    location: string | null;
    notes: string | null;
    createdAt: Date;
    assignedTo: { name: string; email: string } | null;
  }>
): string {
  const headerLine = LEAD_CSV_HEADERS.join(",");
  const dataLines = leads.map((lead) =>
    [
      escapeCsvField(lead.name),
      escapeCsvField(lead.email),
      escapeCsvField(lead.phone),
      escapeCsvField(SOURCE_LABELS[lead.source] ?? lead.source),
      escapeCsvField(STAGE_LABELS[lead.stage] ?? lead.stage),
      escapeCsvField(lead.propertyInterest),
      escapeCsvField(lead.budget),
      escapeCsvField(lead.location),
      escapeCsvField(lead.notes),
      escapeCsvField(lead.assignedTo?.email ?? ""),
    ].join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

export function getTemplateCsv(): string {
  const headerLine = LEAD_CSV_HEADERS.join(",");
  const exampleLine = [
    "John Doe",
    "john@example.com",
    "9876543210",
    "Website",
    "New",
    "3BHK Apartment",
    "5000000",
    "Mumbai",
    "Interested in premium listings",
    "agent@example.com",
  ]
    .map(escapeCsvField)
    .join(",");
  return `${headerLine}\r\n${exampleLine}`;
}
