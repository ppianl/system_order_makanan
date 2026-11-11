/* ==========================================================================
   GIVORA - MODULE: SPREADSHEET & LIVE STATUS SYNC
   Google Apps Script Webhook, Live Status Sync, and CSV Export
   ========================================================================== */

const ORDER_STATUS_CONFIG = {
    masuk: {
        label: 'Pesanan Masuk',
        step: 1,
        icon: 'fa-solid fa-inbox',
        badgeClass: 'badge-status-masuk'
    },
    diantar_pic: {
        label: 'Pesanan Diantar ke PIC',
        step: 2,
        icon: 'fa-solid fa-truck-fast',
        badgeClass: 'badge-status-kirim'
    },
    diterima_konsumen: {
        label: 'Pesanan Diterima Konsumen',
        step: 3,
        icon: 'fa-solid fa-circle-check',
        badgeClass: 'badge-status-selesai'
    }
};

function parseOrderStatus(statusStr) {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('diterima') || s.includes('konsumen') || s.includes('selesai') || s.includes('sukses')) {
        return ORDER_STATUS_CONFIG.diterima_konsumen;
    }
    if (s.includes('diantar') || s.includes('pic') || s.includes('kirim') || s.includes('antar') || s.includes('jalan')) {
        return ORDER_STATUS_CONFIG.diantar_pic;
    }
    return ORDER_STATUS_CONFIG.masuk;
}

function updateReceiptTracker(statusStr) {
    const statusCfg = parseOrderStatus(statusStr || 'Pesanan Masuk');
    const pill = document.getElementById('receiptLiveStatusPill');
    if (pill) {
        pill.className = `badge-order-status ${statusCfg.badgeClass}`;
        pill.innerHTML = `<i class="${statusCfg.icon}"></i> ${statusCfg.label}`;
    }

    const step = statusCfg.step;
    for (let i = 1; i <= 3; i++) {
        const p = document.getElementById(`stepPoint${i}`);
        if (p) {
            p.classList.remove('active', 'completed');
            if (i < step) p.classList.add('completed');
            else if (i === step) p.classList.add('active');
        }
    }
    for (let j = 1; j <= 2; j++) {
        const l = document.getElementById(`stepLine${j}`);
        if (l) {
            if (j < step) l.classList.add('active');
            else l.classList.remove('active');
        }
    }
}

function getLocalOrders() {
    try {
        const data = localStorage.getItem('givora_orders');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalOrder(orderRecord) {
    try {
        const orders = getLocalOrders();
        orders.unshift(orderRecord);
        // Simpan maksimal 30 pesanan terakhir untuk menjaga kuota localStorage
        if (orders.length > 30) orders.pop();
        localStorage.setItem('givora_orders', JSON.stringify(orders));
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
    }
}

async function postOrderToSpreadsheet(orderRecord) {
    if (!state.sheetsEndpointURL) return;

    try {
        const payload = {
            action: 'newOrder',
            orderId: orderRecord.id,
            date: orderRecord.date,
            time: orderRecord.time,
            customerName: orderRecord.customerName,
            customerPhone: orderRecord.customerPhone,
            campus: orderRecord.campus,
            major: orderRecord.major || '-',
            address: orderRecord.address,
            itemsSummary: orderRecord.itemsSummary,
            adminName: orderRecord.adminName,
            paymentMethod: orderRecord.paymentMethod,
            totalPrice: orderRecord.totalPrice,
            notes: orderRecord.notes,
            status: orderRecord.status,
            referralName: orderRecord.referralName || '-',
            batch: orderRecord.batch || '-',
            className: orderRecord.className || '-',
            proofImageBase64: orderRecord.proofDataUrl || '',
            proofFilename: orderRecord.proofFilename || '',
            qrisRefNumber: orderRecord.qrisRefNumber || '-'
        };

        // Kirim asinkron via fetch mode 'no-cors' agar selalu berhasil melewati sandbox browser
        await fetch(state.sheetsEndpointURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Order successfully synced to Google Spreadsheet webhook.');
    } catch (err) {
        console.warn('Sync to Google Spreadsheet warning:', err);
    }
}

async function fetchLiveOrdersFromSpreadsheet(silent = false) {
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    const localOrders = getLocalOrders();
    renderOrdersTable(localOrders);

    if (!state.sheetsEndpointURL) {
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
        return;
    }

    try {
        const response = await fetch(`${state.sheetsEndpointURL}?action=getOrders&_t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        if (result && Array.isArray(result.orders)) {
            renderOrdersTable(result.orders);
            if (!silent) showToast('✅ Data rekap berhasil disinkronkan dari Google Spreadsheet!');
        }
    } catch (err) {
        console.log('Spreadsheet live sync fallback to local orders:', err);
        renderOrdersTable(localOrders);
        if (!silent) showToast('ℹ️ Menampilkan riwayat pesanan lokal.');
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    }
}

function updateLocalOrderStatus(orderId, newStatus) {
    try {
        const orders = getLocalOrders();
        const target = orders.find(o => o.id === orderId);
        if (target) {
            target.status = newStatus;
            localStorage.setItem('givora_orders', JSON.stringify(orders));
            renderOrdersTable(orders);
            if (state.lastVerifiedOrder && state.lastVerifiedOrder.id === orderId) {
                state.lastVerifiedOrder.status = newStatus;
                updateReceiptTracker(newStatus);
            }
            showToast(`✅ Status #${orderId} diubah: ${newStatus}`);
        }
    } catch (e) {
        console.warn('Update local order status error:', e);
    }
}

function renderOrdersTable(orders = []) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-cookie-bite" style="font-size: 2rem; color: var(--accent-gold); margin-bottom: 0.5rem; display: block;"></i>
                    Belum ada riwayat pesanan yang tercatat.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    orders.forEach((order, idx) => {
        const statusCfg = parseOrderStatus(order.status || 'Pesanan Masuk');
        const proofHtml = order.proofDataUrl
            ? `<button class="btn-sm btn-outline" onclick="openProofViewerModal('${order.id}')" title="Lihat Bukti"><i class="fa-solid fa-eye"></i></button>`
            : `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td><strong>${order.id || '-'}</strong><br><small style="color: var(--text-muted);">${order.date || ''} ${order.time || ''}</small></td>
            <td><strong>${order.customerName || '-'}</strong><br><small style="color: var(--text-muted);">${order.campus || '-'}</small></td>
            <td>${order.itemsSummary || '-'}</td>
            <td><small>${order.adminName || '-'}</small></td>
            <td><span class="badge ${order.paymentMethod === 'QRIS' ? 'badge-gold' : 'badge-matcha'}">${order.paymentMethod || '-'}</span></td>
            <td><strong>Rp ${(order.totalPrice || 0).toLocaleString('id-ID')}</strong></td>
            <td style="text-align: center;">
                <select class="status-select-mini ${statusCfg.badgeClass}" onchange="updateLocalOrderStatus('${order.id}', this.value)" title="Status Pesanan (Klik untuk ubah)">
                    <option value="Pesanan Masuk" ${statusCfg.label === 'Pesanan Masuk' ? 'selected' : ''}>🟡 Pesanan Masuk</option>
                    <option value="Pesanan Diantar ke PIC" ${statusCfg.label === 'Pesanan Diantar ke PIC' ? 'selected' : ''}>🔵 Diantar ke PIC</option>
                    <option value="Pesanan Diterima Konsumen" ${statusCfg.label === 'Pesanan Diterima Konsumen' ? 'selected' : ''}>🟢 Diterima Konsumen</option>
                </select>
            </td>
            <td style="text-align: center;">${proofHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportOrdersToCSV() {
    const orders = getLocalOrders();
    if (orders.length === 0) {
        showToast('⚠️ Belum ada data pesanan untuk diunduh.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'No,ID Pesanan,Tanggal,Waktu,Nama Pemesan,Nomor WA,Kampus/Lokasi,Menu Pesanan,Admin,Metode Bayar,Total (Rp),Status\n';

    orders.forEach((o, index) => {
        const row = [
            index + 1,
            `"${o.id}"`,
            `"${o.date}"`,
            `"${o.time}"`,
            `"${o.customerName}"`,
            `"${o.customerPhone}"`,
            `"${o.campus || o.address}"`,
            `"${(o.itemsSummary || '').replace(/"/g, '""')}"`,
            `"${o.adminName}"`,
            `"${o.paymentMethod}"`,
            o.totalPrice,
            `"${o.status}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Pesanan_Givora_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('📥 Berkas rekap pesanan CSV berhasil diunduh!');
}
