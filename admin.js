const API = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";
const DOMAIN = "https://moya.sekawan.my.id";
const role = sessionStorage.getItem("userRole");

// Fungsi yang jalan otomatis pas halaman dibuka
function init() {
    console.log("Aplikasi MOYA Siap. Role:", role);
    
    // Tampilkan Role di Header
    const roleDisplay = document.getElementById('display-role');
    if(roleDisplay) roleDisplay.innerText = role || "User";

    // Set Tanggal Hari Ini ke semua input date
    document.querySelectorAll('input[type="date"]').forEach(i => {
        i.valueAsDate = new Date();
    });
    
    // Sembunyikan fitur jika bukan admin
    if(role !== 'admin') {
        const adminElements = ['nav-kas', 'nav-lap', 'nav-user', 'saldo-box'];
        adminElements.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }
    
    updateSaldo();
}

// Navigasi Antar Halaman
function nav(id, el) {
    // Sembunyikan semua section .page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Nonaktifkan semua tombol nav
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    // Aktifkan yang dipilih
    const targetPage = document.getElementById(id);
    if(targetPage) {
        targetPage.classList.add('active');
        el.classList.add('active');
    }
    
    if(id === 'laporan') muatLaporan();
    updateSaldo();
}

// Update Angka Saldo di Header
async function updateSaldo() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        let total = 0;
        data.forEach(r => {
            const n = Number(r.nominal) || 0;
            r.jenis === 'Masuk' ? total += n : total -= n;
        });
        const saldoEl = document.getElementById('q-total');
        if(saldoEl) saldoEl.innerText = "Rp " + total.toLocaleString('id-ID');
    } catch(e) { 
        console.error("Gagal ambil saldo:", e); 
    }
}

// Simpan Transaksi Penjualan
async function simpanTrx() {
    const btn = document.getElementById('btn-trx');
    const wa = document.getElementById('t-wa').value;
    const nominal = document.getElementById('t-amt').value;
    const tgl = document.getElementById('t-tgl').value;
    const nama = document.getElementById('t-nama').value || 'Konsumen';
    const desc = document.getElementById('t-desc').value;

    if(!wa || !nominal) return Swal.fire('Eits!', 'WA & Nominal wajib diisi!', 'warning');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    const id = "M" + Date.now();
    const payload = [id, tgl, nama, wa, nominal, desc, "Masuk", new Date().toLocaleString('id-ID')];

    try {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
        
        let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
        window.open(`https://wa.me/${fw}?text=*KUITANSI MOYA*%0A%0ACek link: ${DOMAIN}/kuitansi.html?id=${id}`, '_blank');
        
        Swal.fire('Berhasil', 'Data Jual Tersimpan!', 'success');
    } catch(err) {
        Swal.fire('Error', 'Gagal kirim data', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'SIMPAN & WA';
        updateSaldo();
    }
}

// Simpan Kas Internal
async function simpanKas() {
    const btn = document.getElementById('btn-kas');
    const nominal = document.getElementById('k-amt').value;
    const ket = document.getElementById('k-desc').value;
    const tgl = document.getElementById('k-tgl').value;
    const jenis = document.getElementById('k-jenis').value;

    if(!nominal || !ket) return Swal.fire('Waduh!', 'Nominal & Keterangan jangan kosong!', 'warning');

    btn.disabled = true;
    const id = "KAS-" + Date.now();
    const payload = [id, tgl, "INTERNAL", "-", nominal, ket, jenis, new Date().toLocaleString('id-ID')];

    try {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
        Swal.fire('Berhasil', 'Catatan Kas Disimpan!', 'success');
        document.getElementById('k-amt').value = '';
        document.getElementById('k-desc').value = '';
    } catch(err) {
        Swal.fire('Error', 'Gagal simpan kas', 'error');
    } finally {
        btn.disabled = false;
        updateSaldo();
    }
}

// Muat Riwayat Laporan
async function muatLaporan() {
    const container = document.getElementById('log-data');
    if(!container) return;
    
    container.innerHTML = "<center style='padding:20px;'><i class='fas fa-sync fa-spin'></i> Memuat...</center>";
    try {
        const res = await fetch(API);
        const data = await res.json();
        let html = "";
        data.reverse().forEach(r => {
            const isM = r.jenis === 'Masuk';
            const tglObj = new Date(r.tgl);
            const tglFormatted = tglObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            
            html += `<div class="log-item" style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #eee; align-items:center;">
                <div>
                    <b style="font-size:14px;">${r.nama === 'INTERNAL' ? r.ket : r.nama}</b><br>
                    <small style="color:#888;">${tglFormatted}</small>
                </div>
                <div style="text-align:right">
                    <b style="color:${isM?'#2ecc71':'#e74c3c'}">${isM?'+':'-'} Rp ${Number(r.nominal).toLocaleString('id-ID')}</b><br>
                    ${role === 'admin' ? `<i class="fas fa-trash-alt" onclick="hapus('${r.id}')" style="color:#ddd; cursor:pointer; font-size:12px; padding-top:5px;"></i>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = html || "<center style='padding:20px;'>Belum ada riwayat</center>";
    } catch(e) { 
        container.innerHTML = "<center style='padding:20px; color:red;'>Gagal ambil data.</center>"; 
    }
}

// Fungsi Hapus
async function hapus(id) {
    const cek = await Swal.fire({ 
        title: 'Hapus Data?', 
        text: "Data di Sheet juga bakal hilang!",
        icon: 'warning', 
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    });

    if(cek.isConfirmed) {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "delete", id }) });
        Swal.fire('Terhapus!', '', 'success');
        muatLaporan(); 
        updateSaldo();
    }
}

// Tambah User (Admin Only)
async function tambahUser() {
    const u = document.getElementById('new-u').value;
    const p = document.getElementById('new-p').value;
    const r = document.getElementById('new-r').value;
    if(!u || !p) return Swal.fire('Peringatan', 'Username & Password harus diisi!', 'warning');

    try {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "addUser", data: [u, p, r] }) });
        Swal.fire('Berhasil', `User ${u} terdaftar sebagai ${r}`, 'success');
        document.getElementById('new-u').value = '';
        document.getElementById('new-p').value = '';
    } catch(e) {
        Swal.fire('Gagal', 'Gagal daftar user', 'error');
    }
}

// Fungsi Logout
function logout() {
    Swal.fire({ 
        title: 'Logout?', 
        text: "Sesi kerja Anda akan berakhir.",
        icon: 'question', 
        showCancelButton: true,
        confirmButtonText: 'Keluar'
    }).then(r => {
        if(r.isConfirmed) { 
            sessionStorage.clear(); 
            window.location.href = "index.html"; 
        }
    });
}

// JALANKAN INIT SAAT HALAMAN SELESAI LOAD
window.onload = init;
    
