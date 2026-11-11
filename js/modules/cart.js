/* ==========================================================================
   GIVORA - MODULE: CART ENGINE
   Manages Cart Items, Quantities, Stock Bounds, Calculations, and UI Sync
   ========================================================================== */

function changeCardQty(productId, delta) {
    const stockInfo = getProductStock(productId);
    const maxStock = stockInfo.stock;
    if (maxStock <= 0) return;

    const current = state.cardQuantities[productId] || 1;
    const next = Math.max(1, Math.min(maxStock, current + delta));
    state.cardQuantities[productId] = next;

    const spanEl = document.getElementById(`qty-${productId}`);
    if (spanEl) {
        spanEl.innerText = next;
    }
}

function addGridProductToCart(productId) {
    const product = getProductById(productId);
    if (!product) return;

    const stockInfo = getProductStock(productId);
    const maxStock = stockInfo.stock;

    if (maxStock <= 0) {
        showToast(`❌ Maaf, stok varian ${product.name} sudah habis!`);
        return;
    }

    const addQty = Math.max(1, Math.min(maxStock, state.cardQuantities[productId] || 1));
    const cartItemId = `item_${product.id}`;
    const existingIndex = state.cart.findIndex(i => i.cartItemId === cartItemId);
    const inCart = existingIndex > -1 ? state.cart[existingIndex].qty : 0;

    if (inCart + addQty > maxStock) {
        const canAdd = maxStock - inCart;
        if (canAdd <= 0) {
            showToast(`⚠️ Stok maksimal (${maxStock} pack) sudah ada di keranjangmu.`);
        } else {
            showToast(`⚠️ Sisa stok hanya ${maxStock} pack (bisa tambah ${canAdd} pack lagi).`);
        }
        return;
    }

    if (existingIndex > -1) {
        state.cart[existingIndex].qty += addQty;
    } else {
        state.cart.push({
            cartItemId: cartItemId,
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            qty: addQty,
            category: product.categoryLabel,
            image: product.image
        });
    }

    // Reset stepper jumlah di kartu kembali ke 1
    state.cardQuantities[productId] = 1;
    const spanEl = document.getElementById(`qty-${productId}`);
    if (spanEl) spanEl.innerText = 1;

    updateCartUI();
    showToast(`🍌 ${product.name} (${addQty} pack) berhasil dimasukkan ke keranjang!`);
}

function changeCartItemQty(index, delta) {
    const item = state.cart[index];
    if (!item) return;

    if (delta > 0) {
        const stockInfo = getProductStock(item.productId);
        if (item.qty + delta > stockInfo.stock) {
            showToast(`⚠️ Stok maksimal ${item.name} hanya tersisa ${stockInfo.stock} pack!`);
            return;
        }
    }

    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(index);
    } else {
        updateCartUI();
    }
}

function removeFromCart(index) {
    const removed = state.cart.splice(index, 1);
    if (removed.length > 0) {
        showToast(`Pesanan ${removed[0].name} dihapus.`);
    }
    updateCartUI();
}

function getShippingFee() {
    // Semua pengiriman ke seluruh kampus dan sekitar gratis ongkir
    return 0;
}

function getCartTotalItemCount() {
    return state.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
}

function getCartSubtotal() {
    return state.cart.reduce((sum, item) => sum + (item.unitPrice * (item.qty || 1)), 0);
}

function getCartGrandTotal() {
    const sub = getCartSubtotal();
    const ship = sub > 0 ? getShippingFee() : 0;
    return sub + ship;
}

function updateCartUI() {
    const cartCountBadge = document.getElementById('cartCountBadge');
    const cartItemsList = document.getElementById('cartItemsList');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartShippingFee = document.getElementById('cartShippingFee');
    const cartTotal = document.getElementById('cartTotal');

    const totalItemCount = getCartTotalItemCount();
    if (cartCountBadge) cartCountBadge.innerText = totalItemCount;

    let subtotal = 0;
    if (cartItemsList) cartItemsList.innerHTML = '';

    if (state.cart.length === 0) {
        if (cartItemsList) {
            cartItemsList.innerHTML = `
                <div class="empty-cart-state">
                    <i class="fa-solid fa-cookie-bite"></i>
                    <p>Keranjang kamu masih kosong</p>
                    <small>Yuk pilih varian Keripik Pisang & Singkong favoritmu!</small>
                </div>
            `;
        }
    } else {
        state.cart.forEach((item, index) => {
            const itemTotal = item.unitPrice * item.qty;
            subtotal += itemTotal;

            if (cartItemsList) {
                const row = document.createElement('div');
                row.className = 'cart-item-row';

                row.innerHTML = `
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-sub">
                            <span>Rp ${item.unitPrice.toLocaleString('id-ID')} / pack</span>
                        </div>
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-qty-pill">
                            <button type="button" onclick="changeCartItemQty(${index}, -1)" title="Kurangi">−</button>
                            <span>${item.qty}</span>
                            <button type="button" onclick="changeCartItemQty(${index}, 1)" title="Tambah">+</button>
                        </div>
                        <div class="cart-item-total">Rp ${itemTotal.toLocaleString('id-ID')}</div>
                        <button class="btn-icon btn-delete" onclick="removeFromCart(${index})" title="Hapus menu">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
                cartItemsList.appendChild(row);
            }
        });
    }

    const shippingFee = subtotal > 0 ? getShippingFee() : 0;
    const grandTotal = subtotal + shippingFee;

    if (cartSubtotal) cartSubtotal.innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;

    if (cartShippingFee) {
        cartShippingFee.innerText = 'Gratis (Free Ongkir)';
        cartShippingFee.style.color = 'var(--accent-green)';
    }

    if (cartTotal) cartTotal.innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;

    // Update Floating Quick Cart App-Bar
    const floatingBar = document.getElementById('floatingQuickCart');
    const floatingCount = document.getElementById('floatingCartCount');
    const floatingTotal = document.getElementById('floatingCartTotal');

    if (floatingBar) {
        if (totalItemCount > 0) {
            floatingBar.classList.add('visible');
            if (floatingCount) floatingCount.innerText = `${totalItemCount} Pack Keripik`;
            if (floatingTotal) floatingTotal.innerText = `Total: Rp ${grandTotal.toLocaleString('id-ID')}`;
        } else {
            floatingBar.classList.remove('visible');
        }
    }

    if (typeof updateQrisAmountDisplay === 'function') updateQrisAmountDisplay();
    if (typeof updateCampusMinOrderValidation === 'function') updateCampusMinOrderValidation();
    if (typeof updateWAPreview === 'function') updateWAPreview();
}
