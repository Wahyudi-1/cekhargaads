// ====================================================================
// APP.JS - VERSI 2 TAB (CEK HARGA & KELOLA BARANG DENGAN FORM TERSEMBUNYI)
// ====================================================================

// --- KONFIGURASI URL SCRIPT GOOGLE APPS ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzhue9eY4KEOD9SCm1Wdbq0Md1wSQVyxCbkdAnI9lLoOg9Kjljf43XXMlaAfj_o-NCX/exec";

// --- STATE APLIKASI ---
const AppState = {
    barang: [],     
    user: null,     
    scannerPopup: null, // Scanner pop-up (untuk form)
    scannerInline: null // Scanner inline (untuk halaman cek harga)
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
    sectionForm: document.getElementById('section-form'),
    actionTambahBaru: document.getElementById('action-tambah-baru'),
    notifikasi: document.getElementById('notifikasi'),
    scannerContainer: document.getElementById('scanner-container'),
    
    // Elemen tambahan untuk Inline Scanner (Halaman Cek Harga)
    inlineScannerContainer: document.getElementById('inline-scanner-container'),
    btnTutupInlineScanner: document.getElementById('btn-tutup-inline-scanner'),
    btnScan: document.getElementById('btn-scan'),
    searchBoxContainer: document.getElementById('search-box-container'),

    // Elemen tambahan untuk scanner di form
    btnScanForm: document.getElementById('btn-scan-form'),
    kodeBarangInput: document.getElementById('Kode_Barang'),

    // Tab Elements
    tabCek: document.getElementById('tab-cek'),
    tabInput: document.getElementById('tab-input'),
    viewCek: document.getElementById('view-cek'),
    viewInput: document.getElementById('view-input'),
    indikatorKoneksi: document.getElementById('indikator-koneksi')
};

// ====================================================================
// FITUR OFFLINE & SINKRONISASI
// ====================================================================

// Pantau perubahan koneksi
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

function handleOffline() {
    els.indikatorKoneksi.style.display = 'inline-block';
    els.indikatorKoneksi.textContent = "Mode Offline";
    els.indikatorKoneksi.style.backgroundColor = "#e74c3c";
    tampilkanNotifikasi("Koneksi terputus. Beralih ke Mode Offline.", "error");
}

async function handleOnline() {
    els.indikatorKoneksi.style.display = 'none';
    tampilkanNotifikasi("Kembali Online. Memeriksa antrean sinkronisasi...", "info");
    await sinkronisasiDataOffline();
    await muatDataBarang(); // Refresh data dari server
}

// Cek status saat pertama kali load
if (!navigator.onLine) {
    handleOffline();
}

async function sinkronisasiDataOffline() {
    let antrean = JSON.parse(localStorage.getItem('antrean_offline_ads') || '[]');
    if (antrean.length === 0) return;

    tampilkanNotifikasi(`Menyinkronkan ${antrean.length} data ke server...`, "info");
    
    let berhasil = 0;
    let sisaAntrean = [];

    // Proses satu per satu
    for (const item of antrean) {
        try {
            // Ubah objek JSON kembali menjadi FormData
            const formData = new FormData();
            for (const key in item) {
                formData.append(key, item[key]);
            }
            
            const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'sukses') {
                berhasil++;
            } else {
                sisaAntrean.push(item); // Gagal server, biarkan di antrean
            }
        } catch (e) {
            sisaAntrean.push(item); // Gagal jaringan lagi, biarkan di antrean
        }
    }

    localStorage.setItem('antrean_offline_ads', JSON.stringify(sisaAntrean));
    if (berhasil > 0) tampilkanNotifikasi(`${berhasil} data berhasil disinkronkan!`, "sukses");
}


// ====================================================================
// 1. SISTEM LOGIN & TAB NAVIGASI
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

// -- LOGIKA PINDAH TAB --
els.tabCek.addEventListener('click', () => {
    els.tabCek.classList.add('active');
    els.tabInput.classList.remove('active');
    els.viewCek.classList.add('active');
    els.viewInput.classList.remove('active');
});

els.tabInput.addEventListener('click', () => {
    els.tabInput.classList.add('active');
    els.tabCek.classList.remove('active');
    els.viewInput.classList.add('active');
    els.viewCek.classList.remove('active');
});

// ====================================================================
// 2. LOGIKA DATA & PENCARIAN
// ====================================================================

async function tampilkanApp() {
    els.loginContainer.classList.add('hidden');
    els.appContainer.classList.remove('hidden');
    document.getElementById('info-nama-user').textContent = AppState.user.Nama_Lengkap;
    
    await muatDataBarang();
    els.inputCari.focus();
}

async function muatDataBarang() {
    if (navigator.onLine) {
        tampilkanNotifikasi("Memperbarui Data Barang dari Server...", "info");
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getBarang`);
            const result = await res.json();
            if (result.status === 'sukses') {
                AppState.barang = result.data;
                // Simpan salinan ke penyimpanan lokal untuk digunakan saat offline
                localStorage.setItem('data_barang_ads', JSON.stringify(result.data));
                tampilkanNotifikasi("Data Siap!", "sukses");
            }
        } catch (err) {
            muatDataLokal("Gagal terhubung ke server. Menggunakan data lokal.");
        }
    } else {
        muatDataLokal("Anda sedang offline. Menggunakan data tersimpan.");
    }
}

function muatDataLokal(pesan) {
    const dataLokal = localStorage.getItem('data_barang_ads');
    if (dataLokal) {
        AppState.barang = JSON.parse(dataLokal);
        tampilkanNotifikasi(pesan, "info");
    } else {
        tampilkanNotifikasi("Tidak ada data tersimpan. Harus online minimal sekali.", "error");
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
    ).slice(0, 5); 

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
    
    document.getElementById('disp-nama').textContent = item.Nama_Barang;
    document.getElementById('disp-harga-satuan').textContent = formatRupiah(item.Harga_Pcs || 0);
    document.getElementById('disp-harga-lusin').textContent = formatRupiah(item.Harga_Lusin || 0);
    document.getElementById('disp-harga-karton').textContent = formatRupiah(item.Harga_Karton || 0);

    // Event saat tombol "Ubah Data" diklik
    document.getElementById('btn-edit-item').onclick = () => {
        isiForm(item);
        bukaFormModifikasi("Ubah Data Barang");
    };

    document.getElementById('btn-tutup-display').onclick = () => els.sectionDisplay.classList.add('hidden');
}

// ====================================================================
// 3. FORM INPUT & UPDATE (VISIBILITAS KONTROL)
// ====================================================================

// Pemicu 1: Saat tombol Ubah Data (dari kartu harga) diklik
function bukaFormModifikasi(judulForm) {
    document.getElementById('form-title').textContent = judulForm;
    els.actionTambahBaru.classList.add('hidden'); // Sembunyikan tombol tambah baru
    els.sectionForm.classList.remove('hidden');   // Tampilkan form
    els.tabInput.click(); // Otomatis pindah ke Tab Kelola Data
}

// Pemicu 2: Saat tombol "Tambah Barang Baru" diklik
document.getElementById('btn-tambah-baru').addEventListener('click', () => {
    els.formBarang.reset();
    els.formBarang.ID_Barang.value = ''; 
    bukaFormModifikasi("Tambah Data Barang Baru");
});

// Aksi Tutup Form
function tutupForm() {
    els.formBarang.reset();
    els.sectionForm.classList.add('hidden');
    els.actionTambahBaru.classList.remove('hidden');
}

document.getElementById('btn-batal-form').addEventListener('click', tutupForm);

// Mengisi Form
function isiForm(item) {
    els.formBarang.ID_Barang.value = item.ID_Barang || '';
    els.formBarang.Kode_Barang.value = item.Kode_Barang || '';
    els.formBarang.Nama_Barang.value = item.Nama_Barang || '';
    els.formBarang.Kategori_Barang.value = item.Kategori_Barang || '';
    els.formBarang.Stok_Pcs.value = item.Stok_Pcs || 0;
    els.formBarang.Harga_Pcs.value = item.Harga_Pcs || 0;
    els.formBarang.Harga_Lusin.value = item.Harga_Lusin || 0;
    els.formBarang.Harga_Karton.value = item.Harga_Karton || 0;
}

// Fitur Otomatis Cek Saat Kode/Barcode diisi di Form
els.kodeBarangInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 1) return;

    // Cari barang berdasar kode
    const existingItem = AppState.barang.find(b => String(b.Kode_Barang).toLowerCase() === query);
    
    if (existingItem) {
        tampilkanNotifikasi("Data ditemukan. Form otomatis terisi.", "info");
        isiForm(existingItem);
        document.getElementById('form-title').textContent = "Ubah Data Barang";
    } else {
        // Jika tidak ketemu, kosongkan sisa data untuk mode Tambah Baru
        els.formBarang.ID_Barang.value = '';
        els.formBarang.Nama_Barang.value = '';
        els.formBarang.Harga_Pcs.value = 0;
        els.formBarang.Harga_Lusin.value = 0;
        els.formBarang.Harga_Karton.value = 0;
        document.getElementById('form-title').textContent = "Tambah Data Barang Baru";
    }
});


els.formBarang.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan');
    const loading = document.getElementById('loading-simpan');
    
    const isEdit = els.formBarang.ID_Barang.value !== "";
    const action = isEdit ? 'ubahBarang' : 'tambahBarang';

    const formData = new FormData(els.formBarang);
    formData.append('action', action);
    
    // Ubah form data menjadi Object agar bisa disimpan ke LocalStorage jika offline
    const formDataObj = Object.fromEntries(formData.entries());

    btn.disabled = true;
    btn.classList.add('hidden');
    loading.classList.remove('hidden');

    if (navigator.onLine) {
        // --- MODE ONLINE: Langsung kirim ke server ---
        try {
            const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
            const result = await res.json();
            
            if (result.status === 'sukses') {
                tampilkanNotifikasi(result.message, 'sukses');
                tutupForm();
                els.sectionDisplay.classList.add('hidden');
                els.tabCek.click();
                await muatDataBarang(); 
            } else {
                tampilkanNotifikasi("Gagal: " + result.message, 'error');
            }
        } catch (err) {
            simpanKeAntreanOffline(formDataObj); // Fallback ke offline jika tiba-tiba RTO
        }
    } else {
        // --- MODE OFFLINE: Simpan ke antrean lokal ---
        simpanKeAntreanOffline(formDataObj);
    }

    btn.disabled = false;
    btn.classList.remove('hidden');
    loading.classList.add('hidden');
});

function simpanKeAntreanOffline(dataObj) {
    // Tambah ke queue
    let antrean = JSON.parse(localStorage.getItem('antrean_offline_ads') || '[]');
    antrean.push(dataObj);
    localStorage.setItem('antrean_offline_ads', JSON.stringify(antrean));
    
    // Update data lokal (UI) sementara agar perubahan langsung terlihat di layar
    if (dataObj.action === 'ubahBarang') {
        const index = AppState.barang.findIndex(b => b.ID_Barang === dataObj.ID_Barang);
        if (index !== -1) AppState.barang[index] = { ...AppState.barang[index], ...dataObj };
    } else {
        dataObj.ID_Barang = "TEMP_" + Date.now(); // ID Sementara
        AppState.barang.push(dataObj);
    }
    
    // Simpan perubahan sementara ke Local Storage
    localStorage.setItem('data_barang_ads', JSON.stringify(AppState.barang));

    tampilkanNotifikasi("Disimpan ke perangkat (Offline). Akan disinkronkan saat online.", "info");
    tutupForm();
    els.sectionDisplay.classList.add('hidden');
    els.tabCek.click();
}

// ====================================================================
// 4. FITUR SCANNER & UTILITIES
// ====================================================================

let activeScannerTarget = null;

// Tombol Scan di tab Cek Harga (Mode Tampilan Menyatu dengan Halaman)
els.btnScan.addEventListener('click', () => {
    mulaiScannerInline(els.inputCari);
});

// Tombol Scan di form Kelola Data Barang (Mode Pop-up)
if (els.btnScanForm) {
    els.btnScanForm.addEventListener('click', () => {
        mulaiScannerPopup(els.kodeBarangInput);
    });
}

// --- LOGIKA INLINE SCANNER (HALAMAN CEK HARGA) ---
function mulaiScannerInline(targetInput) {
    activeScannerTarget = targetInput;
    
    // Tampilkan bingkai kamera inline & sembunyikan kotak pencarian teks
    els.inlineScannerContainer.classList.remove('hidden');
    els.searchBoxContainer.classList.add('hidden'); 
    
    if (!AppState.scannerInline) {
        AppState.scannerInline = new Html5Qrcode("inline-scanner-viewfinder");
    }
    
    // Konfigurasi khusus: Paksa bentuk KOTAK (1.0) agar rapi di layar HP
    const config = { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0 
    };
    
    AppState.scannerInline.start({ facingMode: "environment" }, config, (decodedText) => {
        stopScannerInline();
        activeScannerTarget.value = decodedText;
        activeScannerTarget.dispatchEvent(new Event('input')); // Otomatis trigger cek harga
        tampilkanNotifikasi("Barcode terdeteksi!", "sukses");
    }, undefined).catch(err => {
        alert("Kamera tidak dapat diakses");
        stopScannerInline();
    });
}

if (els.btnTutupInlineScanner) {
    els.btnTutupInlineScanner.addEventListener('click', stopScannerInline);
}

function stopScannerInline() {
    if (AppState.scannerInline && AppState.scannerInline.isScanning) {
        AppState.scannerInline.stop().then(() => {
            // Sembunyikan kamera, tampilkan lagi kotak pencarian
            els.inlineScannerContainer.classList.add('hidden');
            els.searchBoxContainer.classList.remove('hidden');
        });
    } else {
        els.inlineScannerContainer.classList.add('hidden');
        els.searchBoxContainer.classList.remove('hidden');
    }
}

// --- LOGIKA POPUP SCANNER (FORM DATA BARANG) ---
function mulaiScannerPopup(targetInput) {
    activeScannerTarget = targetInput;
    
    els.scannerContainer.classList.remove('hidden');
    if (!AppState.scannerPopup) {
        AppState.scannerPopup = new Html5Qrcode("scanner-viewfinder");
    }
    
    // Konfigurasi khusus untuk Pop-up juga disamakan
    const config = { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0 
    };
    
    AppState.scannerPopup.start({ facingMode: "environment" }, config, (decodedText) => {
        stopScannerPopup();
        activeScannerTarget.value = decodedText;
        activeScannerTarget.dispatchEvent(new Event('input')); // Otomatis isi data form 
        tampilkanNotifikasi("Barcode terdeteksi!", "sukses");
    }, undefined).catch(err => {
        alert("Kamera tidak dapat diakses");
        els.scannerContainer.classList.add('hidden');
    });
}

document.getElementById('btn-close-scanner').addEventListener('click', stopScannerPopup);

function stopScannerPopup() {
    if (AppState.scannerPopup && AppState.scannerPopup.isScanning) {
        AppState.scannerPopup.stop().then(() => {
            els.scannerContainer.classList.add('hidden');
        });
    } else {
        els.scannerContainer.classList.add('hidden');
    }
}


function tampilkanNotifikasi(msg, type) {
    els.notifikasi.textContent = msg;
    els.notifikasi.className = type; 
    els.notifikasi.classList.remove('hidden');
    setTimeout(() => els.notifikasi.classList.add('hidden'), 3000);
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}
