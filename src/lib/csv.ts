import { CsvImportRow } from "@/types";

/** Parses raw CSV text (RFC4180-ish: quoted fields, escaped quotes, commas/newlines inside quotes). */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  // Normalize line endings, strip a leading BOM if present.
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else {
      field += char;
    }
  }
  // last field/row (if the file doesn't end with a trailing newline)
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const COLUMN_ALIASES: Record<string, keyof CsvImportRow> = {
  customername: "customerName",
  name: "customerName",
  client: "customerName",
  nomclient: "customerName",
  customerphone: "customerPhone",
  phone: "customerPhone",
  telephone: "customerPhone",
  téléphone: "customerPhone",
  tel: "customerPhone",
  reference: "reference",
  référence: "reference",
  ref: "reference",
  amount: "amount",
  montant: "amount",
  prix: "amount",
  notes: "notes",
  note: "notes",
  address: "address",
  adresse: "address",
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents so "Référence" matches "reference"
}

export interface CsvParseResult {
  rows: CsvImportRow[];
  errors: { row: number; message: string }[];
  detectedColumns: string[];
}

/** Parses a CSV file's text into validated CsvImportRow objects, tolerant of column order and common French/English header names. */
export function parseDeliveriesCsv(text: string): CsvParseResult {
  const table = parseCsvText(text);
  const errors: { row: number; message: string }[] = [];
  const rows: CsvImportRow[] = [];

  if (table.length === 0) {
    return { rows, errors: [{ row: 0, message: "Le fichier est vide." }], detectedColumns: [] };
  }

  const header = table[0].map(normalizeHeader);
  const columnIndex: Partial<Record<keyof CsvImportRow, number>> = {};
  header.forEach((h, idx) => {
    const key = COLUMN_ALIASES[normalizeHeader(h)];
    if (key && columnIndex[key] === undefined) columnIndex[key] = idx;
  });

  if (columnIndex.customerName === undefined || columnIndex.customerPhone === undefined) {
    return {
      rows,
      errors: [
        {
          row: 0,
          message:
            "Colonnes requises introuvables. Le fichier doit contenir au minimum des colonnes 'customerName' (ou 'nom') et 'customerPhone' (ou 'telephone').",
        },
      ],
      detectedColumns: table[0],
    };
  }

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const get = (key: keyof CsvImportRow) => {
      const idx = columnIndex[key];
      return idx !== undefined ? (cells[idx] ?? "").trim() : "";
    };

    const customerName = get("customerName");
    const customerPhone = get("customerPhone");

    if (!customerName || !customerPhone) {
      errors.push({ row: i + 1, message: "Nom du client et téléphone sont requis." });
      continue;
    }

    const amountRaw = get("amount");
    let amount: number | undefined;
    if (amountRaw) {
      const parsed = Number(amountRaw.replace(",", "."));
      if (Number.isNaN(parsed)) {
        errors.push({ row: i + 1, message: `Montant invalide : "${amountRaw}".` });
      } else {
        amount = parsed;
      }
    }

    rows.push({
      customerName,
      customerPhone,
      reference: get("reference") || undefined,
      amount,
      notes: get("notes") || undefined,
      address: get("address") || undefined,
    });
  }

  return { rows, errors, detectedColumns: table[0] };
}

/** Generates a starter CSV template the user can fill in and re-upload. */
export function csvTemplate(): string {
  const header = "customerName,customerPhone,reference,amount,notes,address";
  const example = "Yassine Ben Ali,+21620123456,CMD-1042,45.5,Livrer avant 18h,\"12 Rue de Marseille, Tunis\"";
  return `${header}\n${example}\n`;
}

export function downloadCsvTemplate() {
  const blob = new Blob([csvTemplate()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-livraisons.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
