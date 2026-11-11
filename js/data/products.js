/* ==========================================================================
   GIVORA - DATA / PRODUCTS CATALOG & INVENTORY STOCK ENGINE
   Master 8 Varian Keripik Pisang & Singkong Premium (Serba Rp 15.000)
   Data Stok Sinkron Sesuai Tabel Inventaris
   ========================================================================== */

// Data Stok Awal & Terjual Resmi Berdasarkan Tabel
const DEFAULT_STOCKS = {
    pisang_piscok: {
        rasa: 'Piscok',
        jenis: 'Pisang',
        initial: 200,
        sold: 64,
        stock: 136
    },
    pisang_susu: {
        rasa: 'Milk',
        jenis: 'Pisang',
        initial: 80,
        sold: 33,
        stock: 47
    },
    pisang_greentea_lumer: {
        rasa: 'Greentea Lumer',
        jenis: 'Pisang',
        initial: 200,
        sold: 36,
        stock: 164
    },
    pisang_coklat_lumer: {
        rasa: 'Coklat Lumer',
        jenis: 'Pisang',
        initial: 100,
        sold: 68,
        stock: 32
    },
    pisang_sale_original: {
        rasa: 'Original',
        jenis: 'Pisang',
        initial: 20,
        sold: 20,
        stock: 0 // Stok Habis (Sold Out)
    },
    singkong_seblak: {
        rasa: 'Seblak',
        jenis: 'Singkong',
        initial: 200,
        sold: 22,
        stock: 178
    },
    singkong_balado: {
        rasa: 'Balado',
        jenis: 'Singkong',
        initial: 150,
        sold: 60,
        stock: 90
    },
    singkong_coklat: {
        rasa: 'Coklat',
        jenis: 'Singkong',
        initial: 50,
        sold: 13,
        stock: 37
    }
};

const STOCK_STORAGE_KEY = 'givora_inventory_stocks_v3';

// --- Stock Management Functions ---

function getAllStocks() {
    try {
        const stored = localStorage.getItem(STOCK_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validasi apakah semua produk ada
            let complete = true;
            for (const key of Object.keys(DEFAULT_STOCKS)) {
                if (!parsed[key] || typeof parsed[key].stock !== 'number') {
                    complete = false;
                    break;
                }
            }
            if (complete) return parsed;
        }
    } catch (e) {
        console.warn('Gagal membaca stok dari localStorage:', e);
    }

    // Default fallback (fresh pristine copy)
    const copy = JSON.parse(JSON.stringify(DEFAULT_STOCKS));
    saveAllStocks(copy);
    return copy;
}

function saveAllStocks(stocks) {
    try {
        localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stocks));
    } catch (e) {
        console.warn('Gagal menyimpan stok ke localStorage:', e);
    }
}

function getProductStock(productId) {
    const all = getAllStocks();
    return all[productId] || { initial: 0, sold: 0, stock: 0 };
}

function deductProductStock(productId, qty) {
    const all = getAllStocks();
    if (!all[productId]) return false;

    const current = all[productId];
    const deductQty = Math.max(0, parseInt(qty, 10) || 0);

    current.stock = Math.max(0, current.stock - deductQty);
    current.sold = (current.sold || 0) + deductQty;

    saveAllStocks(all);
    return current;
}

function updateProductStockDirectly(productId, newStock, newInitial = null, newSold = null) {
    const all = getAllStocks();
    if (!all[productId]) return false;

    const parsedStock = Math.max(0, parseInt(newStock, 10) || 0);
    all[productId].stock = parsedStock;

    if (newInitial !== null && !isNaN(parseInt(newInitial, 10))) {
        all[productId].initial = Math.max(0, parseInt(newInitial, 10));
    }
    if (newSold !== null && !isNaN(parseInt(newSold, 10))) {
        all[productId].sold = Math.max(0, parseInt(newSold, 10));
    }

    saveAllStocks(all);
    return all[productId];
}

function updateAllStocksDirectly(updatesObj) {
    const all = getAllStocks();
    for (const key of Object.keys(updatesObj)) {
        if (all[key]) {
            const u = updatesObj[key];
            if (typeof u.stock === 'number') all[key].stock = Math.max(0, u.stock);
            if (typeof u.initial === 'number') all[key].initial = Math.max(0, u.initial);
            if (typeof u.sold === 'number') all[key].sold = Math.max(0, u.sold);
        }
    }
    saveAllStocks(all);
    return all;
}

function resetStocksToDefault() {
    const copy = JSON.parse(JSON.stringify(DEFAULT_STOCKS));
    saveAllStocks(copy);
    return copy;
}

// --- Master Products List ---

const GIVORA_PRODUCTS = [
    // --- Kategori Keripik Pisang (15K) ---
    {
        id: 'pisang_sale_original',
        name: 'Keripik Pisang Sale Original',
        shortName: 'Sale Original',
        category: 'pisang',
        categoryLabel: 'Keripik Pisang',
        price: 15000,
        image: 'images/pisang_sale_original.svg',
        badge: 'Original Legit ⭐',
        badgeClass: 'badge-gold',
        desc: 'Irisan pisang sale pilihan dengan rasa manis legit alami, tekstur renyah di luar dan pulen khas nusantara.',
        tasteProfile: 'Manis Legit • Renyah Alami',
        rating: '4.9'
    },
    {
        id: 'pisang_piscok',
        name: 'Keripik Pisang Piscok',
        shortName: 'Piscok',
        category: 'pisang',
        categoryLabel: 'Keripik Pisang',
        price: 15000,
        image: 'images/pisang_piscok.svg',
        badge: 'Favorit Cokelat 🍫',
        badgeClass: 'badge-choco',
        desc: 'Perpaduan keripik pisang renyah berpadu lelehan cokelat khas piscok yang lumer dan bikin nagih.',
        tasteProfile: 'Cokelat Mantap • Renyah Gurih',
        rating: '4.9'
    },
    {
        id: 'pisang_coklat_lumer',
        name: 'Keripik Pisang Coklat Lumer',
        shortName: 'Coklat Lumer',
        category: 'pisang',
        categoryLabel: 'Keripik Pisang',
        price: 15000,
        image: 'images/pisang_coklat_lumer.svg',
        badge: 'Best Seller 🔥',
        badgeClass: 'badge-gold',
        desc: 'Keripik pisang tebal berlumur saus cokelat lumer premium yang super melimpah dan meleleh di mulut.',
        tasteProfile: 'Super Lumer • Cokelat Tebal',
        rating: '5.0'
    },
    {
        id: 'pisang_susu',
        name: 'Keripik Pisang Susu (Milk)',
        shortName: 'Milk / Susu',
        category: 'pisang',
        categoryLabel: 'Keripik Pisang',
        price: 15000,
        image: 'images/pisang_susu.svg',
        badge: 'Creamy Manis 🥛',
        badgeClass: 'badge-gold',
        desc: 'Sensasi manis gurih creamy dari siraman susu kental manis berpadu dengan kerenyahan pisang emas pilihan.',
        tasteProfile: 'Creamy Gurih • Manis Lembut',
        rating: '4.8'
    },
    {
        id: 'pisang_greentea_lumer',
        name: 'Keripik Pisang Greentea Lumer',
        shortName: 'Greentea Lumer',
        category: 'pisang',
        categoryLabel: 'Keripik Pisang',
        price: 15000,
        image: 'images/pisang_greentea_lumer.svg',
        badge: 'Matcha Wangi 🍵',
        badgeClass: 'badge-matcha',
        desc: 'Balutan saus matcha greentea Jepang yang wangi dan lembut, manis creamy berpadu kerenyahan pisang khas Givora.',
        tasteProfile: 'Matcha Creamy • Manis Wangi',
        rating: '4.9'
    },

    // --- Kategori Keripik Singkong (15K) ---
    {
        id: 'singkong_balado',
        name: 'Keripik Singkong Balado',
        shortName: 'Balado',
        category: 'singkong',
        categoryLabel: 'Keripik Singkong',
        price: 15000,
        image: 'images/singkong_balado.svg',
        badge: 'Pedas Manis 🌶️',
        badgeClass: 'badge-spicy',
        desc: 'Keripik singkong bulat renyah dibalut bumbu balado khas nusantara yang pedas manis gurih mantap.',
        tasteProfile: 'Pedas Manis • Renyah Gurih',
        rating: '4.9'
    },
    {
        id: 'singkong_coklat',
        name: 'Keripik Singkong Coklat',
        shortName: 'Coklat',
        category: 'singkong',
        categoryLabel: 'Keripik Singkong',
        price: 15000,
        image: 'images/singkong_coklat.svg',
        badge: 'Unik & Nagih 🍫',
        badgeClass: 'badge-choco',
        desc: 'Inovasi rasa unik! Kerenyahan keripik singkong gurih dipadukan dengan taburan cokelat manis mantap.',
        tasteProfile: 'Gurih Manis • Crunchy',
        rating: '4.8'
    },
    {
        id: 'singkong_seblak',
        name: 'Keripik Singkong Seblak',
        shortName: 'Seblak',
        category: 'singkong',
        categoryLabel: 'Keripik Singkong',
        price: 15000,
        image: 'images/singkong_seblak.svg',
        badge: 'Pedas Daun Jeruk 🔥',
        badgeClass: 'badge-spicy',
        desc: 'Sensasi pedas gurih aroma daun jeruk dan kencur khas bumbu seblak Bandung yang nendang dan nagih abis.',
        tasteProfile: 'Pedas Daun Jeruk • Kencur Gurih',
        rating: '5.0'
    }
];

// Helper Function: Filter by category
function getProductsByCategory(category = 'all') {
    if (category === 'all') return GIVORA_PRODUCTS;
    return GIVORA_PRODUCTS.filter(p => p.category === category);
}

// Helper Function: Find by product ID
function getProductById(id) {
    return GIVORA_PRODUCTS.find(p => p.id === id);
}
