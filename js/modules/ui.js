/* ==========================================================================
   GIVORA - MODULE: UI & MODAL MANAGEMENT
   Controls Modals, Digital Receipt Rendering, Catalog Bento Grid with Live Stock, and Toast
   ========================================================================== */

function filterMenu(category, clickedBtn) {
    state.selectedCategory = category;

    document.querySelectorAll('.category-pill-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }

    renderProductsGrid(category);
}

function renderProductsGrid(category = 'all') {
    const container = document.getElementById('productsGridContainer');
    if (!container) return;

    const filtered = getProductsByCategory(category);
    container.innerHTML = '';

    filtered.forEach(product => {
        const stockInfo = getProductStock(product.id);
        const currentStock = stockInfo.stock;
        const isSoldOut = currentStock <= 0;
        const isLowStock = currentStock > 0 && currentStock <= 35;

        // Current qty in stepper (default 1, max capped by currentStock)
        const qty = isSoldOut ? 0 : Math.min(state.cardQuantities[product.id] || 1, currentStock);
        state.cardQuantities[product.id] = qty;

        const isFeatured = (category === 'all' && (product.id === 'pisang_coklat_lumer' || product.id === 'singkong_seblak'));
        const card = document.createElement('div');
        card.className = `bento-card ${isFeatured ? 'is-featured' : ''} ${isSoldOut ? 'is-sold-out' : ''}`;
        card.id = `card-${product.id}`;

        const featuredBadge = isFeatured
            ? '<span class="bento-star-badge"><i class="fa-solid fa-crown" style="color: #D97706;"></i> FAVORIT</span>'
            : `<span class="bento-star-badge"><i class="fa-solid fa-star" style="color: #F59E0B;"></i> ${product.rating}</span>`;

        // Sold Out Overlay
        const soldOutOverlay = isSoldOut
            ? `<div class="bento-soldout-overlay"><span class="soldout-badge"><i class="fa-solid fa-circle-xmark"></i> HABIS</span></div>`
            : '';

        // Stock Indicator Pill
        let stockIndicatorHtml = '';
        if (isSoldOut) {
            stockIndicatorHtml = `
                <div class="bento-stock-indicator sold-out">
                    <i class="fa-solid fa-ban"></i>
                    <span>Stok Habis (0 pack tersisa)</span>
                </div>
            `;
        } else if (isLowStock) {
            stockIndicatorHtml = `
                <div class="bento-stock-indicator low-stock">
                    <i class="fa-solid fa-fire"></i>
                    <span>Sisa Terbatas: <strong>${currentStock}</strong> pack</span>
                </div>
            `;
        } else {
            stockIndicatorHtml = `
                <div class="bento-stock-indicator in-stock">
                    <i class="fa-solid fa-box-open"></i>
                    <span>Sisa Stok: <strong>${currentStock}</strong> pack</span>
                </div>
            `;
        }

        // Action Group (Stepper & Add Button)
        let actionsHtml = '';
        if (isSoldOut) {
            actionsHtml = `
                <div class="bento-actions-group">
                    <button type="button" class="btn-add-bento is-disabled" disabled title="Stok varian ini telah habis">
                        <i class="fa-solid fa-ban"></i> Stok Habis
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="bento-actions-group">
                    <div class="bento-stepper">
                        <button type="button" onclick="changeCardQty('${product.id}', -1)" title="Kurangi">−</button>
                        <span id="qty-${product.id}">${qty}</span>
                        <button type="button" onclick="changeCardQty('${product.id}', 1)" title="Tambah">+</button>
                    </div>
                    <button type="button" class="btn-add-bento" onclick="addGridProductToCart('${product.id}')" title="Masukkan ke Keranjang">
                        <i class="fa-solid fa-cart-plus"></i> + Keranjang
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="bento-thumb-wrap">
                <img src="${product.image}" alt="${product.name}" class="bento-thumb-img" loading="lazy">
                <span class="bento-sticker-tag ${product.badgeClass}">${product.badge}</span>
                ${featuredBadge}
                ${soldOutOverlay}
            </div>
            <div class="bento-body">
                <span class="bento-category-tag">${product.categoryLabel}</span>
                <h3 class="bento-title">${product.name}</h3>
                <p class="bento-desc">${product.desc}</p>
                <div class="bento-flavor-pill">
                    <i class="fa-solid fa-sparkles" style="color: var(--accent-gold);"></i>
                    <span>${product.tasteProfile}</span>
                </div>
                ${stockIndicatorHtml}
                <div class="bento-footer">
                    <div class="bento-price-tag">
                        <span class="bento-price-num">Rp ${product.price.toLocaleString('id-ID')}</span>
                        <span class="bento-price-sub">per pack / bungkus</span>
                    </div>
                    ${actionsHtml}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.add('active');
        updateCartUI();
    }
}

function closeCartModal() {
    document.getElementById('cartModal')?.classList.remove('active');
}

function openOrdersModal() {
    requestAdminAccess('orders');
}

function openOrdersModalDirect() {
    const modal = document.getElementById('ordersModal');
    if (modal) {
        modal.classList.add('active');
        fetchLiveOrdersFromSpreadsheet(true);
    }
}

function closeOrdersModal() {
    document.getElementById('ordersModal')?.classList.remove('active');
}

function openSuccessModal(orderRecord) {
    const modal = document.getElementById('paymentSuccessModal');
    if (!modal) return;

    // Isi data struk digital
    const orderIdEl = document.getElementById('receiptOrderId');
    const orderTimeEl = document.getElementById('receiptOrderTime');
    const custNameEl = document.getElementById('receiptCustomerName');
    const adminNameEl = document.getElementById('receiptAdminName');
    const totalAmountEl = document.getElementById('receiptTotalAmount');
    const itemsListEl = document.getElementById('receiptItemsList');
    const proofInfoBox = document.getElementById('receiptProofInfo');
    const proofFilenameEl = document.getElementById('receiptProofFilename');
    const waBtn = document.getElementById('successWABtn');

    if (orderIdEl) orderIdEl.innerText = orderRecord.id;
    if (orderTimeEl) orderTimeEl.innerText = `${orderRecord.date} • ${orderRecord.time}`;
    if (custNameEl) custNameEl.innerText = `${orderRecord.customerName} (${orderRecord.campus})`;
    if (adminNameEl) adminNameEl.innerText = orderRecord.adminName;
    if (totalAmountEl) totalAmountEl.innerText = `Rp ${orderRecord.totalPrice.toLocaleString('id-ID')}`;

    if (itemsListEl) {
        itemsListEl.innerHTML = '';
        orderRecord.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'receipt-item-line';
            row.innerHTML = `
                <span>${item.name} x ${item.qty}</span>
                <strong>Rp ${(item.unitPrice * item.qty).toLocaleString('id-ID')}</strong>
            `;
            itemsListEl.appendChild(row);
        });
    }

    if (proofInfoBox) {
        if (orderRecord.paymentMethod === 'QRIS' && orderRecord.proofFilename) {
            proofInfoBox.style.display = 'flex';
            if (proofFilenameEl) proofFilenameEl.innerText = orderRecord.proofFilename;
        } else {
            proofInfoBox.style.display = 'none';
        }
    }

    // Set Live Order Status
    updateReceiptTracker(orderRecord.status);

    // Set Link Direct WhatsApp
    if (waBtn) {
        const waMsg = generateWAMessage(orderRecord.id);
        const waUrl = `https://wa.me/${state.targetWA}?text=${encodeURIComponent(waMsg)}`;
        waBtn.href = waUrl;
    }

    modal.classList.add('active');
}

function closeSuccessModalAndReset() {
    document.getElementById('paymentSuccessModal')?.classList.remove('active');

    // Reset formulir & keranjang belanja
    state.cart = [];
    state.qrisProofDataUrl = null;
    state.qrisProofFilename = '';

    const form = document.getElementById('whatsappForm');
    if (form) form.reset();

    const preview = document.getElementById('dropzonePreview');
    const idle = document.getElementById('dropzoneIdle');
    if (preview) preview.style.display = 'none';
    if (idle) idle.style.display = 'flex';

    updateCartUI();
    showToast('✨ Pesanan selesai! Terima kasih sudah jajan di GIVORA.');
}

function downloadReceiptTxt() {
    const order = state.lastVerifiedOrder;
    if (!order) {
        showToast('⚠️ Data struk pesanan tidak ditemukan.');
        return;
    }

    let txt = `========================================\n`;
    txt += `       STRUK PESANAN RESMI GIVORA       \n`;
    txt += `   Keripik Pisang & Singkong Premium    \n`;
    txt += `========================================\n`;
    txt += `ID Pesanan      : ${order.id}\n`;
    txt += `Waktu Transaksi : ${order.date} • ${order.time}\n`;
    txt += `Nama Pemesan    : ${order.customerName}\n`;
    txt += `Nomor WhatsApp  : ${order.customerPhone}\n`;
    txt += `Lokasi / Kampus : ${order.campus} (${order.address})\n`;
    txt += `Metode Bayar    : ${order.paymentMethod}\n`;
    txt += `Admin Bertugas  : ${order.adminName}\n`;
    txt += `----------------------------------------\n`;
    txt += `RINCIAN MENU KERIPIK:\n`;
    order.items.forEach(i => {
        txt += `- ${i.name} (${i.qty} pack) : Rp ${(i.unitPrice * i.qty).toLocaleString('id-ID')}\n`;
    });
    txt += `----------------------------------------\n`;
    txt += `TOTAL TAGIHAN   : Rp ${order.totalPrice.toLocaleString('id-ID')}\n`;
    txt += `STATUS PESANAN  : ${order.status}\n`;
    txt += `========================================\n`;
    txt += `Simpan struk ini sebagai bukti resmi.\n`;
    txt += `Terima kasih atas pesananmu di GIVORA!\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Struk_Givora_${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📥 Struk digital (.TXT) berhasil diunduh!');
}

let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.innerText = message;
    toast.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// ==========================================================================
// ADMIN ACCESS GATE & SECURITY PIN (PEMBATASAN AKSES KHUSUS)
// ==========================================================================
const DEFAULT_ADMIN_PIN = '134679';
let pendingAdminTarget = 'stock';

function isAdminAuthenticated() {
    return sessionStorage.getItem('givora_admin_session_auth') === 'true';
}

function requestAdminAccess(target = 'stock') {
    pendingAdminTarget = target;
    if (isAdminAuthenticated()) {
        executeAdminTarget(target);
    } else {
        openAdminAuthModal(target);
    }
}

function executeAdminTarget(target) {
    if (target === 'orders') {
        openOrdersModalDirect();
    } else {
        openStockModalDirect();
    }
}

function openAdminAuthModal(target = 'stock') {
    pendingAdminTarget = target;
    const modal = document.getElementById('adminAuthModal');
    const pinInput = document.getElementById('adminPinInput');
    const errorEl = document.getElementById('adminPinError');
    if (errorEl) errorEl.style.display = 'none';
    if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 250);
    }
    if (modal) modal.classList.add('active');
}

function closeAdminAuthModal() {
    document.getElementById('adminAuthModal')?.classList.remove('active');
}

function verifyAdminPin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pinInput = document.getElementById('adminPinInput');
    const errorEl = document.getElementById('adminPinError');
    const enteredPin = (pinInput?.value || '').trim();

    const storedPin = localStorage.getItem('givora_admin_pin') || DEFAULT_ADMIN_PIN;

    if (enteredPin === DEFAULT_ADMIN_PIN || enteredPin === storedPin) {
        localStorage.setItem('givora_admin_pin', DEFAULT_ADMIN_PIN);
        sessionStorage.setItem('givora_admin_session_auth', 'true');
        closeAdminAuthModal();
        showToast('🔓 Akses Admin berhasil diverifikasi!');
        executeAdminTarget(pendingAdminTarget);
    } else {
        if (errorEl) {
            errorEl.innerText = '❌ PIN salah! Akses khusus pengurus/admin.';
            errorEl.style.display = 'block';
        }
        if (pinInput) {
            pinInput.classList.add('input-shake');
            setTimeout(() => pinInput.classList.remove('input-shake'), 450);
            pinInput.focus();
            pinInput.select();
        }
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('givora_admin_session_auth');
    closeStockModal();
    closeOrdersModal();
    showToast('🔒 Akses Admin telah dikunci kembali.');
}

// --- Stock Inventory & Admin Management ---

function openStockModal() {
    requestAdminAccess('stock');
}

function openStockModalDirect() {
    const modal = document.getElementById('stockModal');
    if (modal) {
        state.stockEditMode = false;
        renderStockTable();
        modal.classList.add('active');
    }
}

function closeStockModal() {
    state.stockEditMode = false;
    document.getElementById('stockModal')?.classList.remove('active');
}

function toggleStockEditMode(enable) {
    state.stockEditMode = typeof enable === 'boolean' ? enable : !state.stockEditMode;
    renderStockTable();
    if (state.stockEditMode) {
        showToast('✏️ Mode Edit Stok Admin aktif. Silakan ubah angka sisa stok.');
    }
}

function stepStockInput(key, delta) {
    const input = document.getElementById(`edit_stock_${key}`);
    if (input) {
        const current = parseInt(input.value, 10) || 0;
        const next = Math.max(0, current + delta);
        input.value = next;
    }
}

function renderStockTable() {
    const tbody = document.getElementById('stockTableBody');
    const headerActions = document.getElementById('stockHeaderActions');
    const footerActions = document.getElementById('stockFooterActions');
    const tableHead = document.getElementById('stockTableHead');
    if (!tbody) return;

    const stocks = getAllStocks();
    tbody.innerHTML = '';

    const isEdit = !!state.stockEditMode;

    // Update Header / Toggle Button
    if (headerActions) {
        headerActions.innerHTML = isEdit ? `
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <span class="badge" style="background: #FEF3C7; color: #92400E; font-size: 0.8rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 9999px;">
                    <i class="fa-solid fa-pen-to-square"></i> MODE EDIT STOK ADMIN
                </span>
                <small style="color: var(--text-muted);">Ketik langsung angka atau klik tombol - / +</small>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm btn-outline" onclick="toggleStockEditMode(false)">
                    <i class="fa-solid fa-eye"></i> Mode Pantau
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="handleResetStocks()" title="Reset ke data awal tabel">
                    <i class="fa-solid fa-arrow-rotate-left"></i> Reset Default
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="logoutAdmin()" title="Kunci kembali akses admin" style="color: #DC2626; border-color: #FCA5A5;">
                    <i class="fa-solid fa-lock"></i> Kunci
                </button>
            </div>
        ` : `
            <span style="font-size: 0.85rem; color: var(--text-muted);">
                <i class="fa-solid fa-circle-info"></i> Sisa stok berkurang otomatis saat pesanan masuk, dan bisa diubah kapan saja.
            </span>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm btn-primary" onclick="toggleStockEditMode(true)" style="background: #2563EB; border-color: #2563EB;">
                    <i class="fa-solid fa-pen-to-square"></i> Ubah Stok (Admin)
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="handleResetStocks()" title="Reset ke data awal tabel">
                    <i class="fa-solid fa-arrow-rotate-left"></i> Reset Default
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="logoutAdmin()" title="Kunci kembali akses admin" style="color: #DC2626; border-color: #FCA5A5;">
                    <i class="fa-solid fa-lock"></i> Kunci
                </button>
            </div>
        `;
    }

    // Update Table Head
    if (tableHead) {
        tableHead.innerHTML = isEdit ? `
            <tr>
                <th>Varian Rasa</th>
                <th>Jenis</th>
                <th style="text-align: center;">Stock Awal</th>
                <th style="text-align: center;">Terjual</th>
                <th style="text-align: center; min-width: 175px;">Sisa Stok (Edit)</th>
            </tr>
        ` : `
            <tr>
                <th>Varian Rasa</th>
                <th>Jenis</th>
                <th style="text-align: center;">Stock Awal</th>
                <th style="text-align: center;">Terjual</th>
                <th style="text-align: center;">Total (Sisa)</th>
            </tr>
        `;
    }

    Object.keys(stocks).forEach(key => {
        const item = stocks[key];
        const isSoldOut = item.stock <= 0;
        const isLowStock = item.stock > 0 && item.stock <= 35;

        const tr = document.createElement('tr');
        if (!isEdit && isSoldOut) {
            tr.style.background = '#FEE2E2';
            tr.style.color = '#991B1B';
            tr.style.fontWeight = 'bold';
        }

        let badgeHtml = '';
        if (isSoldOut) {
            badgeHtml = `<span style="background: #DC2626; color: #FFF; padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800;">HABIS (0)</span>`;
        } else if (isLowStock) {
            badgeHtml = `<span style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800;">${item.stock} pack</span>`;
        } else {
            badgeHtml = `<span style="background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800;">${item.stock} pack</span>`;
        }

        if (isEdit) {
            tr.innerHTML = `
                <td><strong>${item.rasa}</strong></td>
                <td><span class="badge ${item.jenis === 'Pisang' ? 'badge-gold' : 'badge-choco'}">${item.jenis}</span></td>
                <td style="text-align: center;">
                    <input type="number" min="0" id="edit_initial_${key}" value="${item.initial}" class="stock-mini-input" title="Ubah Stok Awal">
                </td>
                <td style="text-align: center;">
                    <input type="number" min="0" id="edit_sold_${key}" value="${item.sold}" class="stock-mini-input" title="Ubah Jumlah Terjual" style="color: #059669; font-weight: 700;">
                </td>
                <td style="text-align: center;">
                    <div class="stock-edit-cell">
                        <button type="button" class="btn-stock-step" onclick="stepStockInput('${key}', -5)" title="Kurang 5">-5</button>
                        <button type="button" class="btn-stock-step" onclick="stepStockInput('${key}', -1)" title="Kurang 1">-1</button>
                        <input type="number" min="0" id="edit_stock_${key}" value="${item.stock}" class="stock-main-input" required>
                        <button type="button" class="btn-stock-step" onclick="stepStockInput('${key}', 1)" title="Tambah 1">+1</button>
                        <button type="button" class="btn-stock-step" onclick="stepStockInput('${key}', 5)" title="Tambah 5">+5</button>
                    </div>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td><strong>${item.rasa}</strong></td>
                <td><span class="badge ${item.jenis === 'Pisang' ? 'badge-gold' : 'badge-choco'}">${item.jenis}</span></td>
                <td style="text-align: center;">${item.initial}</td>
                <td style="text-align: center; color: #059669; font-weight: 700;">${item.sold}</td>
                <td style="text-align: center;">${badgeHtml}</td>
            `;
        }
        tbody.appendChild(tr);
    });

    // Update Footer Action Buttons
    if (footerActions) {
        footerActions.innerHTML = isEdit ? `
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; width: 100%; flex-wrap: wrap; align-items: center;">
                <button type="button" class="btn btn-secondary" onclick="toggleStockEditMode(false)">
                    <i class="fa-solid fa-xmark"></i> Batal
                </button>
                <button type="button" class="btn btn-primary" onclick="saveAdminStockEdits()" style="background: #059669; border-color: #059669;">
                    <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Stok
                </button>
            </div>
        ` : `
            <div style="display: flex; gap: 0.75rem; justify-content: space-between; width: 100%; flex-wrap: wrap; align-items: center;">
                <button type="button" class="btn btn-sm btn-outline" onclick="toggleStockEditMode(true)">
                    <i class="fa-solid fa-pen-to-square"></i> Buka Editor Stok
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeStockModal()">
                    Tutup
                </button>
            </div>
        `;
    }
}

function saveAdminStockEdits() {
    const stocks = getAllStocks();
    let hasChanges = false;

    Object.keys(stocks).forEach(key => {
        const stockInput = document.getElementById(`edit_stock_${key}`);
        const initialInput = document.getElementById(`edit_initial_${key}`);
        const soldInput = document.getElementById(`edit_sold_${key}`);

        if (stockInput) {
            const newStock = Math.max(0, parseInt(stockInput.value, 10) || 0);
            stocks[key].stock = newStock;
            hasChanges = true;
        }
        if (initialInput) {
            const newInitial = Math.max(0, parseInt(initialInput.value, 10) || 0);
            stocks[key].initial = newInitial;
        }
        if (soldInput) {
            const newSold = Math.max(0, parseInt(soldInput.value, 10) || 0);
            stocks[key].sold = newSold;
        }
    });

    if (hasChanges) {
        saveAllStocks(stocks);
        renderProductsGrid(state.selectedCategory);

        // Sesuaikan item di cart jika ada qty yang melebihi stok baru
        if (state.cart && state.cart.length > 0) {
            state.cart.forEach(cartItem => {
                const curStock = getProductStock(cartItem.productId).stock;
                if (curStock <= 0) {
                    cartItem.qty = 0;
                } else if (cartItem.qty > curStock) {
                    cartItem.qty = curStock;
                }
            });
            state.cart = state.cart.filter(item => item.qty > 0);
            if (typeof updateCartUI === 'function') updateCartUI();
        }

        state.stockEditMode = false;
        renderStockTable();
        showToast('✅ Stok berhasil disimpan dan langsung diperbarui!');
    }
}

function handleResetStocks() {
    if (confirm('Reset stok ke data default awal (sesuai tabel inventaris)?')) {
        resetStocksToDefault();
        renderProductsGrid(state.selectedCategory);
        state.stockEditMode = false;
        renderStockTable();
        showToast('✅ Stok berhasil di-reset ke data default awal!');
    }
}
