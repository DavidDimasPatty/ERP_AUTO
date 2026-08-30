/**
 * Thermal / Dot-Matrix Print Utility
 * Mengirim struk ke printer langsung dari Next.js Server via raw ESC/P command.
 * Tidak memerlukan QZ Tray atau aplikasi eksternal apapun.
 *
 * Alur: Browser → POST /api/print/receipt → Next.js Server → Windows Print API → Printer
 */

// Nama printer default (sesuai nama di Windows Settings → Printers)
export const DEFAULT_PRINTER = "EPSON LX-310";

// Lebar karakter per baris (Elite 12 CPI pada 80mm ≈ 38 char; dikurangi margin)
const CHARS_PER_LINE = 70;

// Margin kiri (spasi) yang ditambah di depan setiap baris pada versi teks
const MARGIN_TEXT = "  "; // 2 spasi untuk fallback teks

// ── Lebar kolom tabel ─────────────────────────────────────────────────────────
// COL_NAME + COL_QTY + COL_PRICE + COL_TOTAL = CHARS_PER_LINE
const COL_NAME = 45; // kolom nama produk (wrap otomatis jika lebih panjang)
const COL_QTY = 5; // kolom qty
const COL_PRICE = 10; // kolom harga satuan
const COL_TOTAL = 10; // kolom total


// ── ESC/P Command Bytes ───────────────────────────────────────────────────────

/** ESC @ — Reset printer ke kondisi default */
const ESC_RESET: number[] = [0x1b, 0x40];

/** ESC M — Set Elite (12 CPI) — lebih kecil dari Pica */
const ESC_ELITE: number[] = [0x1b, 0x4d];

/** SI (0x0F) — Condensed mode: dikombinasikan dengan Elite → ~20 CPI */
const ESC_CONDENSED: number[] = [0x0f];

/** ESC l n — Set left margin di kolom n */
const ESC_LEFT_MARGIN: number[] = [0x1b, 0x6c, 3]; // margin 3 kolom dari kiri

/** ESC 2 — Set line spacing 1/6 inch */
const ESC_LINE_SPACING: number[] = [0x1b, 0x32];

/** ESC E — Bold ON */
const ESC_BOLD_ON: number[] = [0x1b, 0x45];

/** ESC F — Bold OFF */
const ESC_BOLD_OFF: number[] = [0x1b, 0x46];

/** CR + LF — Carriage return + newline */
const CRLF: number[] = [0x0d, 0x0a];

// ── Text Helpers ──────────────────────────────────────────────────────────────

/** Buat baris separator */
const sep = (char = "-"): string => char.repeat(CHARS_PER_LINE);

/** Center text pada lebar tertentu */
function center(text: string, width = CHARS_PER_LINE): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}

/** Left-right justified: label kiri, value kanan */
function justify(left: string, right: string, width = CHARS_PER_LINE): string {
  const space = width - left.length - right.length;
  if (space <= 0) return left + " " + right;
  return left + " ".repeat(space) + right;
}

/** Format angka ke Rupiah tanpa simbol */
function rp(num: number): string {
  return Number(num).toLocaleString("id-ID");
}

/**
 * Format satu baris tabel item: nama | qty | harga | total
 * Nama produk yang panjang di-wrap ke baris berikutnya.
 */
function formatItem(
  name: string,
  qty: number,
  price: number,
  total: number
): string[] {
  const qtyStr = String(qty);
  const priceStr = rp(price);
  const totalStr = rp(total);

  const lines: string[] = [];

  // Potong nama per COL_NAME karakter, wrap ke baris berikut jika panjang
  const nameChunks: string[] = [];
  let remaining = name;
  while (remaining.length > 0) {
    nameChunks.push(remaining.slice(0, COL_NAME));
    remaining = remaining.slice(COL_NAME);
  }

  nameChunks.forEach((chunk, i) => {
    const namePart = chunk.padEnd(COL_NAME);
    if (i === 0) {
      lines.push(
        namePart +
        qtyStr.padStart(COL_QTY) +
        priceStr.padStart(COL_PRICE) +
        totalStr.padStart(COL_TOTAL)
      );
    } else {
      lines.push(namePart);
    }
  });

  return lines;
}

// ── Receipt Text Generator (digunakan juga untuk fallback window.print) ───────

export function generateReceiptText(receiptData: any): string {
  const lines: string[] = [];

  // Semua baris diberi margin kiri
  const add = (line: string) => lines.push(MARGIN_TEXT + line);
  const blank = () => lines.push("");

  // Header
  add("MITRA MOTOR");
  add(sep());

  // Info transaksi
  add(`No  : ${receiptData.sales_number || "-"}`);
  add(`Tgl : ${new Date(receiptData.sales_datetime).toLocaleString("id-ID")}`);
  add(`Cust: ${receiptData.customer_name_snapshot || "Pelanggan Umum"}`);
  add(sep());

  // Header tabel
  add(
    "Produk".padEnd(COL_NAME) +
    "Qty".padStart(COL_QTY) +
    "Harga".padStart(COL_PRICE) +
    "Total".padStart(COL_TOTAL)
  );
  add(sep("-"));

  // Item-item
  const details: any[] = receiptData.details || [];
  details.forEach((item: any) => {
    const itemLines = formatItem(
      item.product_name_snapshot || item.product_name || "-",
      item.quantity,
      Number(item.unit_price),
      Number(item.line_total)
    );
    itemLines.forEach((l: string) => add(l));
  });

  add(sep());

  // Summary
  add(justify("TOTAL", `Rp ${rp(receiptData.total_amount)}`));

  add(sep());
  add(center("Terima kasih sudah berbelanja di Mitra Motor"));
  // add(center("di Mitra Motor"));
  blank(); // 1 baris feed

  return lines.join("\n");
}

// ── ESC/P Byte Buffer Generator ───────────────────────────────────────────────

/**
 * Menghasilkan raw ESC/P byte buffer untuk dikirim langsung ke printer.
 * Menggunakan encoding Windows-1252 (Cp1252) yang didukung Epson LX-310.
 */
export function generateEscpBytes(receiptData: any): Uint8Array {
  const bytes: number[] = [];

  const push = (...arr: number[]) => bytes.push(...arr);
  const pushStr = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      // Windows-1252: karakter ASCII standar langsung pakai char code-nya
      bytes.push(str.charCodeAt(i) & 0xff);
    }
  };
  const nl = () => push(...CRLF);
  const addLine = (str: string) => { pushStr(str); nl(); };
  const blank = () => nl();

  // Init: reset → Elite → Condensed → left margin → line spacing
  push(...ESC_RESET);
  push(...ESC_ELITE);
  push(...ESC_CONDENSED);
  push(...ESC_LEFT_MARGIN);
  push(...ESC_LINE_SPACING);

  // Header — bold
  push(...ESC_BOLD_ON);
  addLine("MITRA MOTOR");
  push(...ESC_BOLD_OFF);
  addLine(sep());

  // Info transaksi
  addLine(`No  : ${receiptData.sales_number || "-"}`);
  addLine(`Tgl : ${new Date(receiptData.sales_datetime).toLocaleString("id-ID")}`);
  addLine(`Cust: ${receiptData.customer_name_snapshot || "Pelanggan Umum"}`);
  addLine(sep());

  // Header tabel — bold
  push(...ESC_BOLD_ON);
  addLine(
    "Produk".padEnd(COL_NAME) +
    "Qty".padStart(COL_QTY) +
    "Harga".padStart(COL_PRICE) +
    "Total".padStart(COL_TOTAL)
  );
  push(...ESC_BOLD_OFF);
  addLine(sep("-"));

  // Item-item
  const details: any[] = receiptData.details || [];
  details.forEach((item: any) => {
    const itemLines = formatItem(
      item.product_name_snapshot || item.product_name || "-",
      item.quantity,
      Number(item.unit_price),
      Number(item.line_total)
    );
    itemLines.forEach((l) => addLine(l));
  });

  addLine(sep());

  // Summary
  push(...ESC_BOLD_ON);
  addLine(justify("TOTAL", `Rp ${rp(receiptData.total_amount)}`));
  push(...ESC_BOLD_OFF);

  addLine(sep());
  addLine(center("Terima kasih sudah berbelanja di Mitra Motor"));
  // addLine(center("di Mitra Motor"));
  blank(); // 1 baris feed — berhenti di sini

  return new Uint8Array(bytes);
}

// ── Client-side Print Function ────────────────────────────────────────────────

/**
 * Kirim receipt ke printer via Next.js API route (server-side).
 * Throw Error jika server mengembalikan status bukan 2xx.
 */
export async function printReceipt(
  receiptData: any,
  printerName = DEFAULT_PRINTER
): Promise<void> {
  const res = await fetch("/api/print/receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiptData, printerName }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new Error(`Print gagal (${res.status}): ${body}`);
  }
}
