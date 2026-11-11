/* ==========================================================================
   GIVORA - MODULE: QRIS & PROOF UPLOAD HANDLER
   Handles Dynamic Nominal Display, Screenshot Compression, Drag & Drop
   ========================================================================== */

function updateQrisAmountDisplay() {
    const totalAmount = getCartGrandTotal();
    const formatted = totalAmount > 0 ? `Rp ${totalAmount.toLocaleString('id-ID')}` : 'Rp 0';

    const displayEl = document.getElementById('qrisDynamicAmountDisplay');
    if (displayEl) displayEl.innerText = formatted;

    const modalAmountEl = document.getElementById('qrisModalAmount');
    if (modalAmountEl) modalAmountEl.innerText = formatted;
}

function copyQrisAmount() {
    const totalAmount = getCartGrandTotal();
    if (totalAmount <= 0) {
        showToast('⚠️ Keranjang belanja masih kosong.');
        return;
    }
    const nominalStr = totalAmount.toString();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(nominalStr).then(() => {
            showToast(`📋 Nominal Rp ${totalAmount.toLocaleString('id-ID')} berhasil disalin!`);
        }).catch(() => {
            showToast(`Nominal: Rp ${totalAmount.toLocaleString('id-ID')}`);
        });
    } else {
        showToast(`Nominal: Rp ${totalAmount.toLocaleString('id-ID')}`);
    }
}

function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.82) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = () => resolve(event.target.result);
        };
        reader.onerror = () => resolve(null);
    });
}

async function processProofFile(file) {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
        showToast('⚠️ File harus berupa gambar screenshot (JPG, PNG, WebP).');
        return;
    }

    if (file.size > 8 * 1024 * 1024) {
        showToast('⚠️ Ukuran gambar maksimal 8 MB.');
        return;
    }

    state.qrisProofFilename = file.name || 'bukti_transfer.jpg';

    showToast('⏳ Memproses screenshot bukti bayar...');
    try {
        const optimizedDataUrl = await compressImage(file, 1000, 1000, 0.82);
        if (!optimizedDataUrl) {
            showToast('⚠️ Gagal membaca gambar screenshot.');
            return;
        }

        state.qrisProofDataUrl = optimizedDataUrl;

        const previewImg = document.getElementById('proofPreviewImg');
        const filenameEl = document.getElementById('proofFileName');
        const dropzoneIdle = document.getElementById('dropzoneIdle');
        const dropzonePreview = document.getElementById('dropzonePreview');

        if (previewImg) previewImg.src = state.qrisProofDataUrl;
        if (filenameEl) filenameEl.innerText = state.qrisProofFilename;
        if (dropzoneIdle) dropzoneIdle.style.display = 'none';
        if (dropzonePreview) dropzonePreview.style.display = 'flex';

        showToast('✅ Bukti screenshot pembayaran QRIS berhasil dilampirkan!');
    } catch (err) {
        console.error('Error optimizing image:', err);
        showToast('⚠️ Gagal memproses gambar bukti bayar.');
    }
}

function handleProofFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (file) processProofFile(file);
}

function setupProofDropzone() {
    const dropzone = document.getElementById('proofDropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }
        }, false);
    });

    ['dragleave', 'dragend'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');

        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            processProofFile(dt.files[0]);
        }
    }, false);
}

function removeProofFile(event) {
    if (event) event.stopPropagation();
    state.qrisProofDataUrl = null;
    state.qrisProofFilename = '';

    const input = document.getElementById('qrisProofFile');
    if (input) input.value = '';

    const dropzoneIdle = document.getElementById('dropzoneIdle');
    const dropzonePreview = document.getElementById('dropzonePreview');

    if (dropzoneIdle) dropzoneIdle.style.display = 'flex';
    if (dropzonePreview) dropzonePreview.style.display = 'none';
}

function openQRISModal() {
    const qrisModal = document.getElementById('qrisModal');
    updateQrisAmountDisplay();
    if (qrisModal) qrisModal.classList.add('active');
}

function closeQRISModal() {
    document.getElementById('qrisModal')?.classList.remove('active');
}

function openProofViewerModal(orderId) {
    const order = state.lastVerifiedOrder?.id === orderId
        ? state.lastVerifiedOrder
        : (getLocalOrders().find(o => o.id === orderId));

    if (!order || !order.proofDataUrl) {
        showToast('⚠️ Gambar bukti transfer tidak ditemukan.');
        return;
    }

    const modal = document.getElementById('proofViewerModal');
    const img = document.getElementById('proofViewerImg');
    const downloadBtn = document.getElementById('proofViewerDownloadBtn');
    const orderIdEl = document.getElementById('proofMetaOrderId');
    const custEl = document.getElementById('proofMetaCust');
    const timeEl = document.getElementById('proofMetaTime');
    const totalEl = document.getElementById('proofMetaTotal');

    if (img) img.src = order.proofDataUrl;
    if (downloadBtn) {
        downloadBtn.href = order.proofDataUrl;
        downloadBtn.download = `Bukti_QRIS_${order.id}.jpg`;
    }
    if (orderIdEl) orderIdEl.innerText = order.id;
    if (custEl) custEl.innerText = order.customerName;
    if (timeEl) timeEl.innerText = `${order.date} • ${order.time}`;
    if (totalEl) totalEl.innerText = `Rp ${order.totalPrice.toLocaleString('id-ID')}`;

    if (modal) modal.classList.add('active');
}

function closeProofViewerModal() {
    document.getElementById('proofViewerModal')?.classList.remove('active');
}
