/* ==========================================================================
   GIVORA - APPLICATION BOOTSTRAPPER
   Spesialis Keripik Pisang & Singkong Premium
   Modular Orchestration & Global State
   ========================================================================== */

// --- Global Application State ---
const state = {
    selectedCategory: 'all',
    cardQuantities: {}, // Menyimpan counter qty untuk masing-masing kartu di grid
    cart: [],

    // Admin WhatsApp yang Berjaga (Resa)
    admins: [
        {
            id: 'admin_resa',
            name: 'Resa',
            fullName: 'Admin Resa (Givora)',
            phone: '+62 822-9456-2384',
            waNumber: '6282294562384'
        }
    ],
    selectedAdminId: 'admin_resa',
    targetWA: '6282294562384', // Admin Resa WhatsApp
    paymentMethod: 'qris',     // 'qris' atau 'cash'
    sheetsEndpointURL: 'https://script.google.com/macros/s/AKfycbzxSWU2exTUQ8RtbRjWjsikSZJZ5JUP3DjsE6NihjsjYXDnzgsFa1DvXMsNjOlUjpD2jg/exec', // Webhook URL Google Spreadsheet Baru

    // State Verifikasi QRIS Anti-Pembeli Fiktif
    qrisProofDataUrl: null,
    qrisProofFilename: '',
    lastVerifiedOrder: null
};

// Expose state.products for backwards compatibility if needed
Object.defineProperty(state, 'products', {
    get() {
        return typeof GIVORA_PRODUCTS !== 'undefined' ? GIVORA_PRODUCTS : [];
    }
});

// --- Application Initialization on DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi counter jumlah pada kartu produk
    if (typeof GIVORA_PRODUCTS !== 'undefined') {
        GIVORA_PRODUCTS.forEach(p => {
            state.cardQuantities[p.id] = 1;
        });
    }

    // 2. Render katalog bento grid awal
    if (typeof renderProductsGrid === 'function') {
        renderProductsGrid('all');
    }

    // 3. Setup admin & metode pembayaran awal
    if (typeof selectAdmin === 'function') {
        selectAdmin('admin_resa');
    }
    if (typeof selectPaymentMethod === 'function') {
        selectPaymentMethod('qris');
    }

    // 4. Update UI keranjang belanja
    if (typeof updateCartUI === 'function') {
        updateCartUI();
    }

    // 5. Setup drag & drop upload bukti transfer QRIS
    if (typeof setupProofDropzone === 'function') {
        setupProofDropzone();
    }

    // 6. Sinkronkan riwayat dari Google Spreadsheet di background
    if (typeof fetchLiveOrdersFromSpreadsheet === 'function') {
        fetchLiveOrdersFromSpreadsheet(true);
    }

    // Mencegah browser membuka file saat di-drag keluar dropzone
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    console.log('✨ GIVORA Web Application successfully initialized.');
});
