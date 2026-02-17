// ====================================================================
// APP.JS - VERSI SEDERHANA (LOGIN + CEK HARGA + UPDATE DATA)
// ====================================================================

// --- KONFIGURASI URL SCRIPT GOOGLE APPS ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzhue9eY4KEOD9SCm1Wdbq0Md1wSQVyxCbkdAnI9lLoOg9Kjljf43XXMlaAfj_o-NCX/exec";

// --- STATE APLIKASI ---
const AppState = {
    barang: [],     // Menyimpan data barang lokal agar pencarian cepat
    user: null,     // Data user yang login
    scanner: null   // Objek scanner
};

// --- DOM ELEMENTS ---
const els = {
    loginContainer: document.getElementById('login-container'),
    formLogin: document.getElementById('form-login'),
    appContainer: document.getElementById('app-container'),
    inputCari: document.getElementById('input-cari'),
    hasilPencarian: document.getElementById('hasil-pencarian'),
    sectionDisplay: document.getElementById('section-display'),
    formBarang: document.getElementById('form-barang'),
    notifikasi: document.getElementById('notifikasi'),
    scannerContainer: document.getElementById('scanner-container')
};

// ====================================================================
// 1. SISTEM LOGIN & SESI
// ====================================================================

document.addEventListener('DOMContentLoaded', cekStatusLogin);

function cekStatusLogin() {
    const sessionUser = sessionStorage.getItem('user_ads');
    if (sessionUser) {
        AppState.user = JSON.parse(sessionUser);
        tampilkanApp();
    } else {
        els.loginContainer.classList.remove('hidden');
        els.appContainer.classList.add('hidden');
    }
}

els.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = els.formLogin.querySelector('button[type="submit"]');
    const status = document.getElementById('login-status');
    const formData = new FormData(els.formLogin);
    
    // Tambahkan action manual
    formData.append('action', 'loginUser');

    btn.disabled = true;
    btn.textContent = "Memverifikasi...";
    status.textContent = "";

    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();

        if (result.status === 'sukses') {
            AppState.user = result.user;
            sessionStorage.setItem('user_ads', JSON.stringify(result.user));
            tampilkanApp();
        } else {
            status.textContent = result.message || "Login Gagal";
        }
    } catch (err) {
        status.textContent = "Koneksi Bermasalah";
    } finally {
        btn.disabled = false;
        btn.textContent = "Masuk Sistem";
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    if(confirm("Keluar dari sistem?")) {
        sessionStorage.removeItem('user_ads');
        location.reload();
    }
});

document.querySelector('.toggle-password').addEventListener('click', (e) => {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
});

// ====================================================================
// 2. LOGIKA UTAMA APLIKASI
// ====================================================================

async function tampilkanApp() {
    els.loginContainer.classList.add('hidden');
    els.appContainer.classList.remove('hidden');
    document.getElementById('info-nama-user').textContent = AppState.user.Nama_Lengkap;
    
    // Muat data barang sekali di awal
    await muatDataBarang();
    els.inputCari.focus();
}

async function muatDataBarang() {
    tampilkanNotifikasi("Memperbarui Data Barang...", "info");
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getBarang`);
        const result = await res.json();
        if (result.status === 'sukses') {
            AppState.barang = result.data;
            tampilkanNotifikasi("Data Siap!", "sukses");
        }
    } catch (err) {
        tampilkanNotifikasi("Gagal memuat data barang", "error");
    }
}

// --- PENCARIAN & DISPLAY ---

els.inputCari.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 1) {
        els.hasilPencarian.classList.add('hidden');
        return;
    }

    // 1. Cek Exact Match (Barcode Scan)
    const exact = AppState.barang.find(b => String(b.Kode_Barang).toLowerCase() === query);
    if (exact) {
        tampilkanDisplayHarga(exact);
        els.inputCari.value = '';
        els.hasilPencarian.classList.add('hidden');
        return;
    }

    // 2. Pencarian Nama (Rekomendasi)
    const matches = AppState.barang.filter(b => 
        String(b.Nama_Barang).toLowerCase().includes(query) || 
        String(b.Kode_Barang).toLowerCase().includes(query)
    ).slice(0, 5); // Ambil 5 teratas

    renderRekomendasi(matches);
});

function renderRekomendasi(items) {
    els.hasilPencarian.innerHTML = '';
    if (items.length === 0) {
        els.hasilPencarian.classList.add('hidden');
        return;
    }
    
    els.hasilPencarian.classList.remove('hidden');
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'rekomendasi-item';
        div.innerHTML = `<strong>${item.Nama_Barang}</strong><br><small>${item.Kode_Barang}</small>`;
        div.onclick = () => {
            tampilkanDisplayHarga(item);
            els.inputCari.value = '';
            els.hasilPencarian.classList.add('hidden');
        };
        els.hasilPencarian.appendChild(div);
    });
}

function tampilkanDisplayHarga(item) {
    els.sectionDisplay.classList.remove('hidden');
    
    // Isi Display Besar
    document.getElementById('disp-kode').textContent = `KODE: ${item.Kode_Barang}`;
    document.getElementById('disp-kategori').textContent = item.Kategori_Barang || 'Umum';
    document.getElementById('disp-nama').textContent = item.Nama_Barang;
    document.getElementById('disp-harga').textContent = formatRupiah(item.Harga_Pcs);
    document.getElementById('disp-stok').textContent = item.Stok_Pcs;
    document.getElementById('disp-harga-karton').textContent = item.Harga_Karton ? formatRupiah(item.Harga_Karton) : '-';

    // Button Events
    document.getElementById('btn-edit-item').onclick = () => isiForm(item);
    document.getElementById('btn-tutup-display').onclick = () => els.sectionDisplay.classList.add('hidden');
}

// --- FORM INPUT & UPDATE ---

function isiForm(item) {
    // Scroll ke form
    document.getElementById('section-form').scrollIntoView({ behavior: 'smooth' });
    
    // Isi data
    els.formBarang.ID_Barang.value = item.ID_Barang;
    els.formBarang.Kode_Barang.value = item.Kode_Barang;
    els.formBarang.Nama_Barang.value = item.Nama_Barang;
    els.formBarang.Kategori_Barang.value = item.Kategori_Barang || '';
    els.formBarang.Stok_Pcs.value = item.Stok_Pcs;
    els.formBarang.Harga_Pcs.value = item.Harga_Pcs;
    els.formBarang.Harga_Karton.value = item.Harga_Karton || 0;
}

document.getElementById('btn-reset-form').addEventListener('click', () => {
    els.formBarang.reset();
    els.formBarang.ID_Barang.value = ''; // Reset ID artinya Tambah Baru
});

els.formBarang.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan');
    const loading = document.getElementById('loading-simpan');
    
    // Tentukan aksi: Jika ID ada = Edit, Jika kosong = Tambah
    const isEdit = els.formBarang.ID_Barang.value !== "";
    const action = isEdit ? 'ubahBarang' : 'tambahBarang';

    const formData = new FormData(els.formBarang);
    formData.append('action', action);

    btn.disabled = true;
    btn.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();
        
        if (result.status === 'sukses') {
            tampilkanNotifikasi(result.message, 'sukses');
            els.formBarang.reset();
            els.formBarang.ID_Barang.value = '';
            els.sectionDisplay.classList.add('hidden');
            await muatDataBarang(); // Refresh data lokal
        } else {
            tampilkanNotifikasi("Gagal: " + result.message, 'error');
        }
    } catch (err) {
        tampilkanNotifikasi("Gagal menghubungi server", "error");
    } finally {
        btn.disabled = false;
        btn.classList.remove('hidden');
        loading.classList.add('hidden');
    }
});

// ====================================================================
// 3. FITUR SCANNER & UTILITIES
// ====================================================================

document.getElementById('btn-scan').addEventListener('click', () => {
    els.scannerContainer.classList.remove('hidden');
    if (!AppState.scanner) {
        AppState.scanner = new Html5Qrcode("scanner-viewfinder");
    }
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    AppState.scanner.start({ facingMode: "environment" }, config, (decodedText) => {
        // Sukses Scan
        stopScanner();
        els.inputCari.value = decodedText;
        // Trigger event input manual untuk menjalankan logika pencarian
        els.inputCari.dispatchEvent(new Event('input'));
        tampilkanNotifikasi("Barcode terdeteksi!", "sukses");
    }, (err) => {
        // Error scan ignore
    }).catch(err => alert("Kamera tidak dapat diakses"));
});

document.getElementById('btn-close-scanner').addEventListener('click', stopScanner);

function stopScanner() {
    if (AppState.scanner && AppState.scanner.isScanning) {
        AppState.scanner.stop().then(() => {
            els.scannerContainer.classList.add('hidden');
        });
    } else {
        els.scannerContainer.classList.add('hidden');
    }
}

function tampilkanNotifikasi(msg, type) {
    els.notifikasi.textContent = msg;
    els.notifikasi.className = type; // class: sukses / error / info
    els.notifikasi.classList.remove('hidden');
    setTimeout(() => els.notifikasi.classList.add('hidden'), 3000);
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}
