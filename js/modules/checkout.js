/* ==========================================================================
   GIVORA - MODULE: CHECKOUT & WHATSAPP ENGINE
   Form Validation, Campus Shipping Logic, and Direct WhatsApp Formatting
   ========================================================================== */

function selectAdmin(adminId) {
    const admin = state.admins.find(a => a.id === adminId) || state.admins[0];
    state.selectedAdminId = admin.id;
    state.targetWA = admin.waNumber;

    document.querySelectorAll('.admin-option-card').forEach(card => {
        card.classList.toggle('active', card.id === `opt-${admin.id}`);
    });

    const radio = document.getElementById(`radio-${admin.id}`);
    if (radio) radio.checked = true;

    const btnSubmit = document.getElementById('btnSubmitWA');
    if (btnSubmit) {
        if (state.paymentMethod === 'cash') {
            btnSubmit.className = 'btn btn-whatsapp btn-block';
            btnSubmit.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Konfirmasi Pesanan COD ke ${admin.name}`;
        } else {
            btnSubmit.className = 'btn btn-primary btn-block';
            btnSubmit.innerHTML = `<i class="fa-solid fa-shield-check"></i> Verifikasi Pembayaran & Selesaikan Pesanan`;
        }
    }

    updateWAPreview();
}

function updateCampusMinOrderValidation() {
    // Banner info minimal order kampus telah dihilangkan sesuai permintaan
    const noticeEl = document.getElementById('campusMinOrderNotice');
    if (noticeEl) {
        noticeEl.style.display = 'none';
    }
}

function handleLocationChange() {
    const campusSelect = document.getElementById('custCampus');
    const majorGroup = document.getElementById('custMajorGroup');
    const majorSelect = document.getElementById('custMajor');
    const campusDetailsGroup = document.getElementById('custCampusDetailsGroup');
    const batchInput = document.getElementById('custBatch');
    const classInput = document.getElementById('custClass');
    const nonCampusGroup = document.getElementById('custNonCampusGroup');
    const referralInput = document.getElementById('custReferral');
    const addressOther = document.getElementById('custAddressOther');

    if (!campusSelect) return;
    const selectedCampus = campusSelect.value;

    const isCampus = selectedCampus.startsWith('Kampus');
    const isSB = selectedCampus === 'Kampus Stasiun Bumi (SB)';
    const isNonCampus = selectedCampus === 'Non-Kampus' || selectedCampus === 'Lainnya';

    // 1. Jurusan (Khusus SB)
    if (majorGroup) {
        majorGroup.style.display = isSB ? 'block' : 'none';
    }
    if (majorSelect) {
        majorSelect.required = isSB;
        majorSelect.disabled = !isSB;
        if (!isSB) majorSelect.value = '';
    }

    // 2. Angkatan & Kelas (Untuk SEMUA pilihan kampus: SB, B, C)
    if (campusDetailsGroup) {
        campusDetailsGroup.style.display = isCampus ? 'block' : 'none';
    }
    if (batchInput) {
        batchInput.required = isCampus;
        batchInput.disabled = !isCampus;
        if (!isCampus) batchInput.value = '';
    }
    if (classInput) {
        classInput.required = isCampus;
        classInput.disabled = !isCampus;
        if (!isCampus) classInput.value = '';
    }

    // 3. Non-Kampus (Nama yang Menawarkan & Alamat / Ruangan)
    if (nonCampusGroup) {
        nonCampusGroup.style.display = isNonCampus ? 'block' : 'none';
    }
    if (referralInput) {
        referralInput.required = isNonCampus;
        referralInput.disabled = !isNonCampus;
        if (!isNonCampus) referralInput.value = '';
    }
    if (addressOther) {
        addressOther.required = isNonCampus;
        addressOther.disabled = !isNonCampus;
        if (!isNonCampus) addressOther.value = '';
    }

    updateCampusMinOrderValidation();
    updateCartUI();
    if (typeof updateQrisAmountDisplay === 'function') updateQrisAmountDisplay();
    updateWAPreview();
}

function generateWAMessage(orderId = null) {
    const custName = document.getElementById('custName')?.value.trim() || '[Nama Kamu]';
    const rawPhone = document.getElementById('custPhone')?.value || '';
    const custPhone = rawPhone.replace(/\D/g, '') || '[Nomor WA Kamu]';
    const campus = document.getElementById('custCampus')?.value || '';
    const major = document.getElementById('custMajor')?.value || '';
    const batch = document.getElementById('custBatch')?.value.trim() || '';
    const className = document.getElementById('custClass')?.value.trim() || '';
    const referral = document.getElementById('custReferral')?.value.trim() || '';
    const otherAddr = document.getElementById('custAddressOther')?.value.trim() || '';

    let locationSummary = '[Pilih Lokasi Pengiriman]';
    let referralLine = '';

    if (campus === 'Non-Kampus' || campus === 'Lainnya') {
        locationSummary = otherAddr ? `Non-Kampus: ${otherAddr}` : 'Non-Kampus (Dosen / Tendik / Luar Kampus)';
        if (referral) {
            referralLine = `\n- Yang Menawarkan: *${referral}*`;
        }
    } else if (campus === 'Kampus Stasiun Bumi (SB)') {
        let sbArr = [];
        if (major) sbArr.push(`Jurusan: ${major}`);
        if (batch) sbArr.push(`Angkatan: ${batch}`);
        if (className) sbArr.push(`Kelas: ${className}`);
        locationSummary = sbArr.length > 0 ? `${campus} (${sbArr.join(' • ')})` : campus;
    } else if (campus) {
        // Kampus B atau Kampus C
        let cArr = [];
        if (batch) cArr.push(`Angkatan: ${batch}`);
        if (className) cArr.push(`Kelas: ${className}`);
        locationSummary = cArr.length > 0 ? `${campus} (${cArr.join(' • ')})` : campus;
    }

    const custNotes = document.getElementById('custNotes')?.value.trim() || '-';
    const activeAdmin = state.admins.find(a => a.id === state.selectedAdminId) || state.admins[0];

    if (state.cart.length === 0) {
        return 'Belum ada pesanan Keripik Givora di keranjang.';
    }

    let itemsText = '';
    let subtotal = 0;

    state.cart.forEach((item, index) => {
        const itemTotal = item.unitPrice * item.qty;
        subtotal += itemTotal;
        itemsText += `${index + 1}. *${item.name}*\n   - ${item.qty} pack x Rp ${item.unitPrice.toLocaleString('id-ID')} = *Rp ${itemTotal.toLocaleString('id-ID')}*\n`;
    });

    const shippingFee = subtotal > 0 ? getShippingFee() : 0;
    const grandTotal = subtotal + shippingFee;

    let priceDetails = `*SUBTOTAL PESANAN:* Rp ${subtotal.toLocaleString('id-ID')}\n`;
    priceDetails += `*ONGKOS KIRIM (${campus || 'Semua Lokasi'}):* Gratis (Free Ongkir Seluruh Kampus)\n`;
    priceDetails += `*TOTAL PEMBAYARAN:* Rp ${grandTotal.toLocaleString('id-ID')}`;

    const paymentText = state.paymentMethod === 'qris'
        ? `*METODE PEMBAYARAN:* QRIS (E-Wallet & Bank)\n_(Bukti transfer screenshot sudah di-upload & siap dikonfirmasi)_`
        : `*METODE PEMBAYARAN:* Bayar Tunai / Langsung (COD)\n_(Siapkan uang pas saat pesanan diantar ya kak)_`;

    const idLabel = orderId ? `*ID PESANAN:* #${orderId}\n` : '';

    const messageTemplate =
`Halo Admin ${activeAdmin.name} (GIVORA)!
Saya mau order Keripik Pisang & Singkong renyah nih:

${idLabel}*RINCIAN PESANAN GIVORA:*
${itemsText}
${priceDetails}
_(Bebas Biaya Platform / 0% Mark-Up)_

${paymentText}

*DATA PEMESAN:*
- Nama Pemesan: *${custName}*
- Nomor WhatsApp: *${custPhone}*
- Lokasi Pengiriman: *${locationSummary}*${referralLine}
- Catatan Khusus: _${custNotes}_
- Admin Penerima: *${activeAdmin.fullName}*

Mohon dikonfirmasi & segera diproses ya min. Terima kasih! 🙏`;

    return messageTemplate;
}

function updateWAPreview() {
    const previewContainer = document.getElementById('waMessagePreview');
    if (previewContainer) {
        previewContainer.innerText = generateWAMessage();
    }
}

function selectPaymentMethod(method) {
    state.paymentMethod = method;

    const optQris = document.getElementById('opt-qris');
    const optCash = document.getElementById('opt-cash');
    const radioQris = document.getElementById('radio-qris');
    const radioCash = document.getElementById('radio-cash');
    const qrisSection = document.getElementById('qrisPaymentSection');
    const cashHelperBox = document.getElementById('cashHelperBox');
    const btnSubmit = document.getElementById('btnSubmitWA');
    const checkoutStatusBadge = document.getElementById('checkoutStatusBadge');

    const activeAdmin = state.admins.find(a => a.id === state.selectedAdminId) || state.admins[0];

    if (method === 'qris') {
        optQris?.classList.add('active');
        optCash?.classList.remove('active');
        if (radioQris) radioQris.checked = true;
        if (qrisSection) qrisSection.style.display = 'block';
        if (cashHelperBox) cashHelperBox.style.display = 'none';
        if (btnSubmit) {
            btnSubmit.className = 'btn btn-primary btn-block';
            btnSubmit.innerHTML = `<i class="fa-solid fa-shield-check"></i> Verifikasi Pembayaran & Selesaikan Pesanan`;
        }
        if (checkoutStatusBadge) {
            checkoutStatusBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Verifikasi keamanan aktif. Pesanan tervalidasi sebelum masuk ke Google Spreadsheet.`;
        }
        if (typeof updateQrisAmountDisplay === 'function') updateQrisAmountDisplay();
    } else {
        optCash?.classList.add('active');
        optQris?.classList.remove('active');
        if (radioCash) radioCash.checked = true;
        if (qrisSection) qrisSection.style.display = 'none';
        if (cashHelperBox) cashHelperBox.style.display = 'flex';
        if (btnSubmit) {
            btnSubmit.className = 'btn btn-whatsapp btn-block';
            btnSubmit.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Konfirmasi Pesanan COD ke ${activeAdmin.name}`;
        }
        if (checkoutStatusBadge) {
            checkoutStatusBadge.innerHTML = `<i class="fa-solid fa-hand-holding-dollar"></i> Pesanan COD tercatat & diteruskan langsung ke WhatsApp admin.`;
        }
    }

    updateWAPreview();
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (state.cart.length === 0) {
        showToast('⚠️ Keranjang kamu masih kosong. Pilih minimal 1 pack varian keripik!');
        return;
    }

    const campus = document.getElementById('custCampus')?.value;

    const custPhone = document.getElementById('custPhone')?.value.replace(/\D/g, '') || '';
    if (custPhone.length < 10) {
        showToast('⚠️ Mohon masukkan nomor WhatsApp yang valid (minimal 10 digit).');
        document.getElementById('custPhone')?.focus();
        return;
    }

    // Validasi Screenshot QRIS jika metode pembayaran QRIS
    if (state.paymentMethod === 'qris' && !state.qrisProofDataUrl) {
        showToast('⚠️ Wajib melampirkan foto bukti pembayaran QRIS!');
        const dropzone = document.getElementById('proofDropzone');
        if (dropzone) {
            dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
            dropzone.classList.add('dragover');
            setTimeout(() => dropzone.classList.remove('dragover'), 1500);
        }
        return;
    }

    const submitBtn = document.getElementById('btnSubmitWA');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyinkronkan Pesanan...`;
    }

    try {
        const orderId = 'GVR-' + Math.floor(100000 + Math.random() * 900000);
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const custName = document.getElementById('custName')?.value.trim() || 'Pelanggan';
        const major = document.getElementById('custMajor')?.value || '';
        const batch = document.getElementById('custBatch')?.value.trim() || '';
        const className = document.getElementById('custClass')?.value.trim() || '';
        const referral = document.getElementById('custReferral')?.value.trim() || '';
        const otherAddr = document.getElementById('custAddressOther')?.value.trim() || '';
        const custNotes = document.getElementById('custNotes')?.value.trim() || '-';
        const activeAdmin = state.admins.find(a => a.id === state.selectedAdminId) || state.admins[0];
        const qrisRef = document.getElementById('qrisRefNumber')?.value.trim() || '-';

        // Validasi berdasarkan pilihan lokasi / kampus
        if (campus === 'Kampus Stasiun Bumi (SB)') {
            if (!major) {
                showToast('⚠️ Mohon pilih Jurusan kamu di Kampus SB.');
                document.getElementById('custMajor')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
            if (!batch) {
                showToast('⚠️ Mohon masukkan Angkatan kamu (Contoh: 2024).');
                document.getElementById('custBatch')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
            if (!className) {
                showToast('⚠️ Mohon masukkan Kelas kamu (Contoh: 24-01).');
                document.getElementById('custClass')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
        } else if (campus.startsWith('Kampus')) {
            // Kampus B atau Kampus C
            if (!batch) {
                showToast(`⚠️ Mohon masukkan Angkatan kamu di ${campus} (Contoh: 2024).`);
                document.getElementById('custBatch')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
            if (!className) {
                showToast(`⚠️ Mohon masukkan Kelas kamu di ${campus} (Contoh: 24-01).`);
                document.getElementById('custClass')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
        } else if (campus === 'Non-Kampus' || campus === 'Lainnya') {
            // Non-Kampus (Dosen / Tendik / Luar Kampus)
            if (!referral) {
                showToast('⚠️ Mohon tuliskan nama yang menawarkan produk ini.');
                document.getElementById('custReferral')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
            if (!otherAddr) {
                showToast('⚠️ Mohon tuliskan alamat, ruangan kantor, atau gedung pengantaran.');
                document.getElementById('custAddressOther')?.focus();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                return;
            }
        }

        const subtotal = getCartSubtotal();
        const shippingFee = subtotal > 0 ? getShippingFee() : 0;
        const totalAmount = subtotal + shippingFee;

        const itemsSummary = state.cart.map(i => `${i.name} (${i.qty} pack)`).join(', ');

        // Format alamat rapi
        let addressStr = campus;
        if (campus === 'Non-Kampus' || campus === 'Lainnya') {
            addressStr = `Non-Kampus: ${otherAddr || '-'} [Penawar: ${referral || '-'}]`;
        } else if (campus === 'Kampus Stasiun Bumi (SB)') {
            let sbArr = [];
            if (major) sbArr.push(`Jurusan: ${major}`);
            if (batch) sbArr.push(`Angkatan: ${batch}`);
            if (className) sbArr.push(`Kelas: ${className}`);
            addressStr = `${campus} (${sbArr.join(' • ')})`;
        } else {
            let cArr = [];
            if (batch) cArr.push(`Angkatan: ${batch}`);
            if (className) cArr.push(`Kelas: ${className}`);
            addressStr = `${campus} (${cArr.join(' • ')})`;
        }

        const orderRecord = {
            id: orderId,
            date: dateStr,
            time: timeStr,
            customerName: custName,
            customerPhone: custPhone,
            campus: campus,
            major: major ? `${major} (${batch} / ${className})` : (referral ? `Non-Kampus (Penawar: ${referral})` : (batch ? `(${batch} / ${className})` : '-')),
            batch: batch,
            className: className,
            referralName: referral,
            address: addressStr,
            itemsSummary: itemsSummary,
            items: JSON.parse(JSON.stringify(state.cart)),
            adminName: activeAdmin.fullName,
            paymentMethod: state.paymentMethod === 'qris' ? 'QRIS' : 'Tunai / COD',
            totalPrice: totalAmount,
            notes: custNotes,
            status: 'Pesanan Masuk',
            proofDataUrl: state.qrisProofDataUrl,
            proofFilename: state.qrisProofFilename,
            qrisRefNumber: qrisRef
        };

        state.lastVerifiedOrder = orderRecord;
        saveLocalOrder(orderRecord);

        // Kurangi sisa stok secara otomatis saat ada yang memesan
        if (Array.isArray(orderRecord.items) && typeof deductProductStock === 'function') {
            orderRecord.items.forEach(item => {
                deductProductStock(item.productId, item.qty);
            });
        }

        // Auto update tampilan kartu katalog seketika
        if (typeof renderProductsGrid === 'function') {
            renderProductsGrid(state.selectedCategory);
        }

        // Kirim data ke Google Spreadsheet jika URL webhook terpasang
        if (state.sheetsEndpointURL && typeof postOrderToSpreadsheet === 'function') {
            await postOrderToSpreadsheet(orderRecord);
        }

        // Tampilkan Modal Struk Digital Berhasil
        closeCartModal();
        openSuccessModal(orderRecord);

        // Confetti Celebration Effect!
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    } catch (err) {
        console.error('Checkout error:', err);
        showToast('⚠️ Terjadi kendala saat checkout, namun pesanan tetap bisa diteruskan ke WhatsApp.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}
