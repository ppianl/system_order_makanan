# Panduan Lengkap Setup Google Spreadsheet & Server Baru GIVORA

Panduan ini untuk membuat **Google Spreadsheet Baru** dan **Server Webhook Baru (Google Apps Script)** di akun Google kamu sendiri, agar pesanan dan bukti pembayaran tidak lagi masuk ke akun teman kamu.

---

## Langkah 1: Buat Google Spreadsheet Baru (2 Menit)

1. Buka [Google Sheets](https://sheets.new) di browser kamu (pastikan login dengan akun Google milikmu).
2. Beri nama file Spreadsheet di pojok kiri atas: **`Rekap Transaksi GIVORA 2026`**.
3. Ubah nama Sheet/Tab di bagian bawah menjadi: **`Rekap Pesanan`**.

### A. Susun Mini Dashboard Rekap (Baris 1 - 3)
Ketik rumus berikut di baris atas untuk rekap otomatis:

| Kolom | Label Kartu | Rumus Google Sheets | Keterangan |
| :--- | :--- | :--- | :--- |
| **B2** | 💰 Total Omset | `=SUM(M5:M)` | Format sebagai Rupiah (Rp) |
| **E2** | 📦 Total Transaksi | `=COUNTA(B5:B)` | Menghitung jumlah pesanan masuk |
| **H2** | 📱 Omset QRIS | `=SUMIF(L5:L; "*QRIS*"; M5:M)` | Rekap khusus omset via QRIS |
| **J2** | 💵 Omset Tunai / COD | `=SUMIF(L5:L; "*Tunai*"; M5:M)` | Rekap khusus omset bayar tunai |

### B. Header Kolom Tabel (Ketik di Baris ke-4: A4 sampai P4)
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

> **Tips Dropdown Status (1 Menit):**
> 1. Blok kolom **O** dari sel **O5 sampai ke bawah**.
> 2. Klik kanan > pilih **Dropdown** (Validasi Data).
> 3. Masukkan 3 opsi status pemesanan resmi:
>    - 🟡 `Pesanan Masuk` (Pilih warna Kuning / Amber)
>    - 🔵 `Pesanan Diantar ke PIC` (Pilih warna Biru)
>    - 🟢 `Pesanan Diterima Konsumen` (Pilih warna Hijau)
> 4. Klik **Selesai**. Sekarang jika status diubah di spreadsheet, website & struk pelanggan akan otomatis tersinkron!

---

## Langkah 2: Buat Server Apps Script Baru

1. Di Google Sheets kamu, klik menu **Ekstensi (Extensions)** > **Apps Script**.
2. Beri nama proyek di kiri atas: **`Server Webhook GIVORA`**.
3. Hapus semua kode default `function myFunction() { ... }`, lalu tempelkan kode lengkap berikut:

```javascript
// ==============================================================================
// SERVER WEBHOOK GIVORA (GOOGLE APPS SCRIPT)
// Mendukung: Simpan Pesanan, Auto-Upload Bukti Bayar ke Drive, & Live Sync Web
// ==============================================================================

// 1. FUNGSI MENERIMA PESANAN BARU DARI WEBSITE (doPost)
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Rekap Pesanan") || ss.getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Cari baris terakhir di tabel (mulai baris 4 sebagai header)
    var lastRow = sheet.getLastRow();
    if (lastRow < 4) {
      lastRow = 4;
    }
    var nextRow = lastRow + 1;
    var noUrut = nextRow - 4;

    // Simpan Foto Bukti Pembayaran ke Google Drive milikmu sendiri
    var driveUrl = "-";
    if (data.proofImageBase64 && data.proofImageBase64.indexOf("base64,") !== -1) {
      try {
        var base64Data = data.proofImageBase64.split("base64,")[1];
        var decoded = Utilities.base64Decode(base64Data);
        var filename = (data.orderId || "GVR") + "_BuktiQRIS.jpg";
        var blob = Utilities.newBlob(decoded, "image/jpeg", filename);

        // Cari atau buat folder "Bukti Pembayaran GIVORA" otomatis di Google Drive kamu
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

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Pesanan berhasil dicatat ke Spreadsheet pribadi!",
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

// 2. FUNGSI MEMBACA PESANAN LIVE KE WEBSITE (doGet)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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

1. Di jendela Apps Script, klik tombol biru **Terapkan (Deploy)** di pojok kanan atas > pilih **Deployment Baru (New deployment)**.
2. Klik ikon roda gigi ⚙️ di samping *Pilih jenis (Select type)*, lalu pilih **Aplikasi Web (Web App)**.
3. Atur konfigurasi sebagai berikut:
   - **Deskripsi**: `Server Produksi GIVORA 2026`
   - **Jalankan sebagai (Execute as)**: **`Saya (email google kamu)`**
   - **Yang memiliki akses (Who has access)**: **`Siapa saja (Anyone)`** *(Sangat penting agar website bisa mengirim data tanpa login)*
4. Klik **Terapkan (Deploy)**.
5. Jika muncul jendela otorisasi izin Google:
   - Klik **Tinjau Izin (Review Permissions)**.
   - Pilih akun Google kamu.
   - Klik **Lanjutan (Advanced)** > klik **Buka Server Webhook GIVORA (tidak aman) / Go to ... (unsafe)**.
   - Klik **Izinkan (Allow)**.
6. Salin **URL Aplikasi Web (Web App URL)** yang berakhiran `/exec`.
   Contoh format:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## Langkah 4: Hubungkan ke Website GIVORA

Buka file **`app.js`**, cari variabel `sheetsEndpointURL` pada baris ke-26, dan ganti nilainya dengan URL baru kamu:

```javascript
sheetsEndpointURL: 'MASUKKAN_URL_BARU_KAMU_DI_SINI',
```

Atau beritahukan link URL tersebut ke asisten AI agar langsung dipasangkan ke dalam kode website!
