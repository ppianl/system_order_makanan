# Panduan Lengkap Setup Google Spreadsheet & Server Baru GIVORA
### (Mendukung Live Sync Stok Inventaris + Rekap Pesanan Otomatis)

Panduan ini untuk membuat atau memperbarui **Google Spreadsheet** dan **Server Webhook (Google Apps Script)** agar:
1. **Sisa Stok Terpusat di Cloud**: Saat admin mengubah stok di menu admin, stok di spreadsheet otomatis ter-update dan langsung muncul di semua perangkat pembeli/klien lain.
2. **Auto-Deduct Stok**: Setiap ada pembeli yang melakukan checkout, stok varian di Google Spreadsheet otomatis terpotong.
3. **Rekap Pesanan & Bukti QRIS**: Semua pesanan tercatat rapi di spreadsheet dan bukti transfer tersimpan otomatis di Google Drive.

---

## Langkah 1: Buat atau Buka Google Spreadsheet

1. Buka [Google Sheets](https://sheets.new) di browser kamu (pastikan login dengan akun Google milikmu).
2. Beri nama file Spreadsheet di pojok kiri atas: **`Rekap Transaksi GIVORA 2026`**.
3. Pastikan ada 2 tab sheet di bagian bawah:

### Tab 1: `Rekap Pesanan`
- **Baris 1 - 3 (Mini Dashboard):**
  - **B2** (`Total Omset`): `=SUM(M5:M)`
  - **E2** (`Total Transaksi`): `=COUNTA(B5:B)`
  - **H2** (`Omset QRIS`): `=SUMIF(L5:L; "*QRIS*"; M5:M)`
  - **J2** (`Omset Tunai / COD`): `=SUMIF(L5:L; "*Tunai*"; M5:M)`
- **Header Kolom (Baris ke-4: A4 sampai P4):**
  - **A4**: `No`
  - **B4**: `ID Pesanan`
  - **C4**: `Tanggal`
  - **D4**: `Jam`
  - **E4**: `Nama Pemesan`
  - **F4**: `No WhatsApp`
  - **G4**: `Lokasi / Kampus`
  - **H4**: `Jurusan`
  - **I4**: `Alamat / Catatan Lokasi`
  - **J4**: `Rincian Varian Keripik`
  - **K4**: `Admin Bertugas`
  - **L4**: `Metode Pembayaran`
  - **M4**: `Total Harga (Rp)`
  - **N4**: `Catatan Khusus`
  - **O4**: `Status Info Pemesanan`
  - **P4**: `Bukti Transfer QRIS`

### Tab 2: `Stok Produk`
*(Catatan: Tab ini bisa kamu buat manual ATAU **akan dibuat otomatis oleh script** saat pertama kali dijalankan!)*
Jika ingin dibuat manual, header di baris ke-1 (A1 - F1):
- **A1**: `ID Produk`
- **B1**: `Rasa`
- **C1**: `Jenis`
- **D1**: `Stok Awal`
- **E1**: `Terjual`
- **F1**: `Sisa Stok`

Daftar 8 varian:
| ID Produk | Rasa | Jenis | Stok Awal | Terjual | Sisa Stok |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pisang_piscok` | Piscok | Pisang | 200 | 64 | 136 |
| `pisang_susu` | Milk | Pisang | 80 | 33 | 47 |
| `pisang_greentea_lumer` | Greentea Lumer | Pisang | 200 | 36 | 164 |
| `pisang_coklat_lumer` | Coklat Lumer | Pisang | 100 | 68 | 32 |
| `pisang_sale_original` | Original | Pisang | 20 | 20 | 0 |
| `singkong_seblak` | Seblak | Singkong | 200 | 22 | 178 |
| `singkong_balado` | Balado | Singkong | 150 | 60 | 90 |
| `singkong_coklat` | Coklat | Singkong | 50 | 13 | 37 |

---

## Langkah 2: Pasang Kode Server Apps Script

1. Di Google Sheets kamu, klik menu **Ekstensi (Extensions)** > **Apps Script**.
2. Beri nama proyek di kiri atas: **`Server Webhook GIVORA`**.
3. Hapus semua kode yang ada, lalu ganti dengan kode lengkap berikut:

```javascript
// ==============================================================================
// SERVER WEBHOOK GIVORA (GOOGLE APPS SCRIPT)
// Mendukung: Live Sync Stok Cloud, Auto-Deduct Stok, Simpan Pesanan, & Upload Bukti
// ==============================================================================

// Helper: Inisialisasi Sheet "Stok Produk" jika belum ada
function getOrCreateStockSheet(ss) {
  var stockSheet = ss.getSheetByName("Stok Produk");
  if (!stockSheet) {
    stockSheet = ss.insertSheet("Stok Produk");
    var headers = [["ID Produk", "Rasa", "Jenis", "Stok Awal", "Terjual", "Sisa Stok"]];
    stockSheet.getRange(1, 1, 1, 6).setValues(headers);
    stockSheet.getRange(1, 1, 1, 6).setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");

    var defaultData = [
      ["pisang_piscok", "Piscok", "Pisang", 200, 64, 136],
      ["pisang_susu", "Milk", "Pisang", 80, 33, 47],
      ["pisang_greentea_lumer", "Greentea Lumer", "Pisang", 200, 36, 164],
      ["pisang_coklat_lumer", "Coklat Lumer", "Pisang", 100, 68, 32],
      ["pisang_sale_original", "Original", "Pisang", 20, 20, 0],
      ["singkong_seblak", "Seblak", "Singkong", 200, 22, 178],
      ["singkong_balado", "Balado", "Singkong", 150, 60, 90],
      ["singkong_coklat", "Coklat", "Singkong", 50, 13, 37]
    ];
    stockSheet.getRange(2, 1, defaultData.length, 6).setValues(defaultData);
    stockSheet.autoResizeColumns(1, 6);
  }
  return stockSheet;
}

// Fungsi tombol pintas untuk langsung membuat tab stok dari editor Apps Script
function buatTabStokSekarang() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateStockSheet(ss);
}

// Helper: Ambil Data Stok dari Sheet "Stok Produk"
function getStocksFromSheet(ss) {
  var stockSheet = getOrCreateStockSheet(ss);
  var lastRow = stockSheet.getLastRow();
  var stocks = {};

  if (lastRow >= 2) {
    var values = stockSheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var id = String(row[0]).trim();
      if (id) {
        stocks[id] = {
          rasa: String(row[1]),
          jenis: String(row[2]),
          initial: Number(row[3]) || 0,
          sold: Number(row[4]) || 0,
          stock: Number(row[5]) || 0
        };
      }
    }
  }
  return stocks;
}

// Helper: Simpan Perubahan Stok dari Admin ke Sheet "Stok Produk"
function updateStocksInSheet(ss, newStocks) {
  if (!newStocks) return;
  var stockSheet = getOrCreateStockSheet(ss);
  var lastRow = stockSheet.getLastRow();
  if (lastRow < 2) return;

  var range = stockSheet.getRange(2, 1, lastRow - 1, 6);
  var values = range.getValues();

  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0]).trim();
    if (newStocks[id]) {
      var item = newStocks[id];
      if (typeof item.initial !== 'undefined') values[i][3] = Number(item.initial) || 0;
      if (typeof item.sold !== 'undefined') values[i][4] = Number(item.sold) || 0;
      if (typeof item.stock !== 'undefined') values[i][5] = Number(item.stock) || 0;
    }
  }
  range.setValues(values);
}

// Helper: Kurangi Stok Otomatis Saat Ada Pesanan Masuk
function deductStocksFromOrder(ss, items) {
  if (!items || !items.length) return;
  var stockSheet = getOrCreateStockSheet(ss);
  var lastRow = stockSheet.getLastRow();
  if (lastRow < 2) return;

  var range = stockSheet.getRange(2, 1, lastRow - 1, 6);
  var values = range.getValues();

  for (var j = 0; j < items.length; j++) {
    var item = items[j];
    var pid = String(item.productId).trim();
    var qty = Number(item.qty) || 0;
    if (qty <= 0) continue;

    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === pid) {
        var currentSold = Number(values[i][4]) || 0;
        var currentStock = Number(values[i][5]) || 0;
        values[i][4] = currentSold + qty;
        values[i][5] = Math.max(0, currentStock - qty);
        break;
      }
    }
  }
  range.setValues(values);
}

// 1. FUNGSI MENERIMA DATA DARI WEBSITE (doPost)
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // A. JIKA ACTION: UPDATE STOK DARI ADMIN
    if (data.action === "updateStocks") {
      updateStocksInSheet(ss, data.stocks);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Stok berhasil diperbarui di Spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. JIKA ACTION: PESANAN BARU (newOrder)
    var sheet = ss.getSheetByName("Rekap Pesanan") || ss.getActiveSheet();

    // Cari baris terakhir di tabel (mulai baris 4 sebagai header)
    var lastRow = sheet.getLastRow();
    if (lastRow < 4) {
      lastRow = 4;
    }
    var nextRow = lastRow + 1;
    var noUrut = nextRow - 4;

    // Simpan Foto Bukti Pembayaran ke Google Drive
    var driveUrl = "-";
    if (data.proofImageBase64 && data.proofImageBase64.indexOf("base64,") !== -1) {
      try {
        var base64Data = data.proofImageBase64.split("base64,")[1];
        var decoded = Utilities.base64Decode(base64Data);
        var filename = (data.orderId || "GVR") + "_BuktiQRIS.jpg";
        var blob = Utilities.newBlob(decoded, "image/jpeg", filename);

        var folderName = "Bukti Pembayaran GIVORA";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveUrl = file.getUrl();
      } catch (errDrive) {
        driveUrl = "Gagal simpan ke Drive: " + errDrive.toString();
      }
    }

    // Catat data transaksi ke baris baru
    var rowData = [
      noUrut,                                                         // A: No
      data.orderId || ("GVR-" + new Date().getTime()),                 // B: ID Pesanan
      data.date || Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy"), // C: Tanggal
      data.time || Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm"),      // D: Jam
      data.customerName,                                              // E: Nama Pemesan
      "'" + data.customerPhone,                                       // F: No WhatsApp
      data.campus,                                                    // G: Lokasi / Kampus
      data.major || "-",                                              // H: Jurusan
      data.address || "-",                                            // I: Alamat
      data.itemsSummary,                                              // J: Rincian Keripik
      data.adminName,                                                 // K: Admin Bertugas
      data.paymentMethod,                                             // L: Metode Bayar
      data.totalPrice,                                                // M: Total Harga (Rp)
      data.notes || "-",                                              // N: Catatan Khusus
      data.status || "Pesanan Masuk",                                  // O: Status Info Pemesanan
      driveUrl                                                        // P: Bukti Transfer QRIS
    ];

    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

    // Kurangi stok di sheet "Stok Produk" secara otomatis
    if (data.items && data.items.length) {
      deductStocksFromOrder(ss, data.items);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Pesanan berhasil dicatat dan stok otomatis terpotong!",
      orderId: data.orderId,
      driveUrl: driveUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. FUNGSI MEMBACA DATA KE WEBSITE (doGet)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getOrders";

    // JIKA ACTION: AMBIL DATA STOK LIVE
    if (action === "getStocks") {
      var stocks = getStocksFromSheet(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        stocks: stocks
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // JIKA ACTION: AMBIL REKAP PESANAN (getOrders)
    var sheet = ss.getSheetByName("Rekap Pesanan") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 5) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        orders: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var values = sheet.getRange(5, 1, lastRow - 4, 16).getValues();
    var orders = [];

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      if (row[1]) {
        orders.push({
          id: row[1],
          date: row[2],
          time: row[3],
          customerName: row[4],
          customerPhone: row[5],
          campus: row[6],
          major: row[7],
          address: row[8],
          itemsSummary: row[9],
          adminName: row[10],
          paymentMethod: row[11],
          totalPrice: row[12],
          notes: row[13],
          status: row[14],
          proofUrl: row[15]
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      orders: orders
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Langkah 3: Deploy Server Apps Script (Mendapatkan URL Webhook)

1. Di jendela Apps Script, klik tombol biru **Terapkan (Deploy)** di pojok kanan atas > pilih **Deployment Baru (New deployment)** (atau **Kelola Deployment** jika sudah pernah deploy).
2. Klik ikon roda gigi ⚙️ di samping *Pilih jenis (Select type)*, lalu pilih **Aplikasi Web (Web App)**.
3. Atur konfigurasi sebagai berikut:
   - **Deskripsi**: `Server Produksi GIVORA 2026 - Live Stock Sync`
   - **Jalankan sebagai (Execute as)**: **`Saya (email google kamu)`**
   - **Yang memiliki akses (Who has access)**: **`Siapa saja (Anyone)`** *(Sangat penting agar website pembeli bisa membaca & memperbarui stok tanpa perlu login Google)*
4. Klik **Terapkan (Deploy)**.
5. Jika muncul jendela otorisasi izin Google:
   - Klik **Tinjau Izin (Review Permissions)**.
   - Pilih akun Google kamu.
   - Klik **Lanjutan (Advanced)** > klik **Buka Server Webhook GIVORA (tidak aman) / Go to ... (unsafe)**.
   - Klik **Izinkan (Allow)**.
6. Salin **URL Aplikasi Web (Web App URL)** yang berakhiran `/exec`.

---

## Langkah 4: Hubungkan URL ke File `app.js`

Buka file **`app.js`**, cari variabel `sheetsEndpointURL` pada baris ke-31:

```javascript
sheetsEndpointURL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

Tempelkan URL Webhook yang baru kamu salin tadi. Sekarang:
- Admin ubah stok di web -> otomatis masuk ke Google Sheets.
- Klien membuka web -> langsung memuat stok dari Google Sheets.
- Setiap 25 detik & saat tab dibuka lagi -> web mengecek sisa stok terbaru di Google Sheets secara live!
