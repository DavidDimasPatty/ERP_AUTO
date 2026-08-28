import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { generateEscpBytes } from "@/lib/thermalPrint";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * POST /api/print/receipt
 *
 * Menerima receipt data + printerName, generate ESC/P bytes,
 * lalu kirim raw bytes ke printer Windows via PowerShell WinAPI.
 *
 * Body: { receiptData: any, printerName?: string }
 */
export async function POST(req: NextRequest) {
  let prnFile: string | null = null;
  let ps1File: string | null = null;

  try {
    const body = await req.json();
    const { receiptData, printerName = "EPSON LX-310" } = body;

    if (!receiptData) {
      return NextResponse.json(
        { error: "receiptData tidak boleh kosong" },
        { status: 400 }
      );
    }

    // 1. Generate raw ESC/P bytes
    const escpBytes = generateEscpBytes(receiptData);

    // 2. Tulis ESC/P bytes ke temp .prn file
    const ts = Date.now();
    prnFile = join(tmpdir(), `receipt_${ts}.prn`);
    await writeFile(prnFile, Buffer.from(escpBytes));

    // 3. Tulis PowerShell script ke temp .ps1 file
    //    Menggunakan Windows Spooler API (PInvoke) untuk raw printing.
    //    Bekerja untuk semua jenis koneksi printer (USB, LPT, Network).
    ps1File = join(tmpdir(), `print_${ts}.ps1`);

    const psScript = `
$ErrorActionPreference = 'Stop'

Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class RawPrint {
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true,
        CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter(
        [MarshalAs(UnmanagedType.LPStr)] string szPrinter,
        out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true,
        ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true,
        CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern Int32 StartDocPrinter(
        IntPtr hPrinter, Int32 level,
        [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true,
        ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true,
        ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true,
        ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true,
        ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(
        IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    public static bool SendBytes(string printerName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        var di = new DOCINFOA { pDocName = "Receipt", pDataType = "RAW" };
        IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pBytes, bytes.Length);
        bool ok = false;
        try {
            if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
                throw new Exception("OpenPrinter failed. Error: " +
                    Marshal.GetLastWin32Error());
            if (StartDocPrinter(hPrinter, 1, di) == 0)
                throw new Exception("StartDocPrinter failed. Error: " +
                    Marshal.GetLastWin32Error());
            if (!StartPagePrinter(hPrinter))
                throw new Exception("StartPagePrinter failed. Error: " +
                    Marshal.GetLastWin32Error());
            Int32 written = 0;
            ok = WritePrinter(hPrinter, pBytes, bytes.Length, out written);
            if (!ok)
                throw new Exception("WritePrinter failed. Error: " +
                    Marshal.GetLastWin32Error());
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
        } finally {
            if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
            Marshal.FreeCoTaskMem(pBytes);
        }
        return ok;
    }
}
'@

$printerName = "${printerName}"
$prnPath     = "${prnFile.replace(/\\/g, "\\\\")}"

$bytes = [System.IO.File]::ReadAllBytes($prnPath)
[RawPrint]::SendBytes($printerName, $bytes) | Out-Null
Write-Output "PRINT_OK"
`.trim();

    await writeFile(ps1File, psScript, "utf8");

    // 4. Jalankan PowerShell script
    const { stdout, stderr } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps1File],
      { timeout: 30_000 }
    );

    if (stderr && stderr.trim()) {
      throw new Error(`PowerShell error: ${stderr.trim()}`);
    }

    if (!stdout.includes("PRINT_OK")) {
      throw new Error(`PowerShell tidak mengembalikan PRINT_OK. Output: ${stdout}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Print Receipt Error]:", err);
    return NextResponse.json(
      { error: err.message || "Print gagal" },
      { status: 500 }
    );
  } finally {
    // Bersihkan temp files
    if (prnFile) unlink(prnFile).catch(() => {});
    if (ps1File) unlink(ps1File).catch(() => {});
  }
}
