/**
 * Thermal / Dot-Matrix Print Utility
 * Mengirim struk ke printer langsung dari Next.js Server via raw ESC/P command.
 * Tidak memerlukan QZ Tray atau aplikasi eksternal apapun.
 *
 * Alur: Browser → POST /api/print/receipt → Next.js Server → Windows Print API → Printer
 */

// Nama printer default (sesuai nama di Windows Settings → Printers)
export const DEFAULT_PRINTER = "EPSON LX-310";

// Lebar karakter per baris (kertas 80mm ≈ 48 char pada 10 CPI)
const CHARS_PER_LINE = 48;

// ── ESC/P Command Bytes ───────────────────────────────────────────────────────

/** ESC @ — Reset printer ke kondisi default */
const ESC_RESET: number[] = [0x1b, 0x40];

/** ESC P — Set Pica (10 CPI) */
const ESC_PICA: number[] = [0x1b, 0x50];

/** ESC 2 — Set line spacing 1/6 inch */
const ESC_LINE_SPACING: number[] = [0x1b, 0x32];

/** ESC E — Bold ON */
const ESC_BOLD_ON: number[] = [0x1b, 0x45];

/** ESC F — Bold OFF */
const ESC_BOLD_OFF: number[] = [0x1b, 0x46];

/** CR + LF — Carriage return + newline */
const CRLF: number[] = [0x0d, 0x0a];

/** FF — Form Feed (eject kertas) */
const FORM_FEED: number[] = [0x0c];

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

/** Wrap text ke multiple baris */
function wrap(text: string, width = CHARS_PER_LINE): string[] {
  const lines: string[] = [];
  while (text.length > 0) {
    lines.push(text.slice(0, width));
    text = text.slice(width);
  }
  return lines;
}

/** Format angka ke Rupiah tanpa simbol */
function rp(num: number): string {
  return Number(num).toLocaleString("id-ID");
}

/** Format satu baris tabel item: nama | qty | harga | total */
function formatItem(
  name: string,
  qty: number,
  price: number,
  total: number
): string[] {
  const qtyStr = String(qty);
  const priceStr = rp(price);
  const totalStr = rp(total);

  const nameWidth = 24;
  const qtyWidth = 4;
  const priceWidth = 10;
  const totalWidth = 10;

  const lines: string[] = [];

  const nameChunks =
    name.length > nameWidth
      ? [name.slice(0, nameWidth), ...wrap(name.slice(nameWidth), nameWidth)]
      : [name];

  nameChunks.forEach((chunk, i) => {
    const namePart = chunk.padEnd(nameWidth);
    if (i === 0) {
      const qtyPart = qtyStr.padStart(qtyWidth);
      const pricePart = priceStr.padStart(priceWidth);
      const totalPart = totalStr.padStart(totalWidth);
      lines.push(namePart + qtyPart + pricePart + totalPart);
    } else {
      lines.push(namePart);
    }
  });

  return lines;
}

// ── Receipt Text Generator (digunakan juga untuk fallback window.print) ───────

export function generateReceiptText(receiptData: any): string {
  const lines: string[] = [];

  const add = (line: string) => lines.push(line);
  const blank = () => lines.push("");

  // Header
  add(center("MITRA MOTOR"));
  add(center("Pondok Unggu Permai No. 7C"));
  add(center("Kota Bekasi, Jawa Barat"));
  add(center("Tel: +62 813-1026-5040"));
  add(sep());

  // Info transaksi
  add(`No  : ${receiptData.sales_number || "-"}`);
  add(`Tgl : ${new Date(receiptData.sales_datetime).toLocaleString("id-ID")}`);
  add(`Kasir   : ${receiptData.cashier_name_snapshot || "-"}`);
  add(`Customer: ${receiptData.customer_name_snapshot || "Pelanggan Umum"}`);
  add(sep());

  // Header tabel
  const hName = "Produk".padEnd(24);
  const hQty = "Qty".padStart(4);
  const hPrice = "Harga".padStart(10);
  const hTotal = "Total".padStart(10);
  add(hName + hQty + hPrice + hTotal);
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
  add(justify("Subtotal", `Rp ${rp(receiptData.subtotal)}`));
  add(justify("Diskon", `Rp ${rp(receiptData.discount_amount || 0)}`));
  add(justify("TOTAL", `Rp ${rp(receiptData.total_amount)}`));

  const payment = receiptData.payments?.[0];
  if (payment) {
    const method = payment.payment_method || "-";
    add(
      justify(
        `Bayar (${method})`,
        `Rp ${rp(payment.tendered_amount || receiptData.total_amount)}`
      )
    );
    if (payment.change_amount !== undefined) {
      add(justify("Kembalian", `Rp ${rp(payment.change_amount)}`));
    }
  }

  add(sep());
  blank();
  add(center("Terima kasih sudah berbelanja"));
  add(center("di Mitra Motor"));
  blank();
  blank();
  blank(); // Feed ekstra supaya kertas keluar cukup

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
  const addLine = (str: string) => {
    pushStr(str);
    nl();
  };
  const blank = () => nl();

  // Init
  push(...ESC_RESET);
  push(...ESC_PICA);
  push(...ESC_LINE_SPACING);

  // Header — bold
  push(...ESC_BOLD_ON);
  addLine(center("MITRA MOTOR"));
  push(...ESC_BOLD_OFF);
  addLine(center("Pondok Unggu Permai No. 7C"));
  addLine(center("Kota Bekasi, Jawa Barat"));
  addLine(center("Tel: +62 813-1026-5040"));
  addLine(sep());

  // Info transaksi
  addLine(`No  : ${receiptData.sales_number || "-"}`);
  addLine(
    `Tgl : ${new Date(receiptData.sales_datetime).toLocaleString("id-ID")}`
  );
  addLine(`Kasir   : ${receiptData.cashier_name_snapshot || "-"}`);
  addLine(
    `Customer: ${receiptData.customer_name_snapshot || "Pelanggan Umum"}`
  );
  addLine(sep());

  // Header tabel
  const hName = "Produk".padEnd(24);
  const hQty = "Qty".padStart(4);
  const hPrice = "Harga".padStart(10);
  const hTotal = "Total".padStart(10);
  push(...ESC_BOLD_ON);
  addLine(hName + hQty + hPrice + hTotal);
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
  addLine(justify("Subtotal", `Rp ${rp(receiptData.subtotal)}`));
  addLine(justify("Diskon", `Rp ${rp(receiptData.discount_amount || 0)}`));
  push(...ESC_BOLD_ON);
  addLine(justify("TOTAL", `Rp ${rp(receiptData.total_amount)}`));
  push(...ESC_BOLD_OFF);

  const payment = receiptData.payments?.[0];
  if (payment) {
    const method = payment.payment_method || "-";
    addLine(
      justify(
        `Bayar (${method})`,
        `Rp ${rp(payment.tendered_amount || receiptData.total_amount)}`
      )
    );
    if (payment.change_amount !== undefined) {
      addLine(justify("Kembalian", `Rp ${rp(payment.change_amount)}`));
    }
  }

  addLine(sep());
  blank();
  addLine(center("Terima kasih sudah berbelanja"));
  addLine(center("di Mitra Motor"));
  blank();
  blank();
  blank(); // Feed ekstra

  // Form feed — eject kertas
  push(...FORM_FEED);

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
