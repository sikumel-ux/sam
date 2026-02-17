// CONFIGURATION
const API_URL = "https://script.google.com/macros/s/AKfycbzwQ47v62YYbZIcUDk7hizLGN3hiqoWajxpehpZPrRBPVVhtxPgZO42TXR1d5Lh3KAN/exec";
const ROLE = sessionStorage.getItem('moya_auth');

// ==========================================
// 1. LOGIKA LOGIN (Untuk login.html)
// ==========================================
async function prosesLogin() {
    const u = document.getElementById('user').value.trim();
    const p = document.getElementById('pass').value.trim();

    if (!u || !p) return Swal.fire('Oops', 'Isi Username & Password!', 'warning');

    Swal.fire({title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});

    try {
        const res = await fetch(`${API_URL}?action=login&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`);
        const d = await res.json();

        if (d.status === 'success') {
            sessionStorage.setItem('moya_auth', d.role);
            sessionStorage.setItem('moya_name', u);
            window.location.href = 'admin.html';
        } else {
            Swal.fire('Gagal', 'User atau Password salah!', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Koneksi API bermasalah', 'error');
    }
}

function eyeToggle() {
    const p = document.getElementById('pass');
    const icon = document.getElementById('eyeIcon');
    p.type = p.type === "password" ? "text" : "password";
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}

// ==========================================
// 2. LOGIKA DASHBOARD & ROLE (Untuk admin.html)
// ==========================================
function inisialisasiDashboard() {
    if (!ROLE) {
        window.location.href = 'login.html';
        return;
    }

    // Tampilkan nama user
    if(document.getElementById('display-name')) {
        document.getElementById('display-name').innerText = sessionStorage.getItem('moya_name');
    }

    // Sembunyikan fitur Boss jika yang login adalah 'user' (Admin Lapangan)
    if (ROLE === 'user') {
        document.querySelectorAll('.role-boss').forEach(el => el.style.display = 'none');
    }

    // Set filter tanggal default hari ini
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('f-start')) document.getElementById('f-start').value = today;
    if(document.getElementById('f-end')) document.getElementById('f-end').value = today;

    muatLaporan();
}

async function muatLaporan() {
    const log = document.getElementById('log-data');
    if(!log) return; // Keluar jika bukan di halaman dashboard
    
    log.innerHTML = "<center><i class='fas fa-sync fa-spin'></i> Memuat...</center>";
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        const start = new Date(document.getElementById('f-start').value);
        const end = new Date(document.getElementById('f-end').value);
        end.setHours(23, 59, 59);

        let inS = 0, outS = 0, html = "";
        
        data.reverse().forEach(r => {
            const tglTrx = new Date(r.tgl);
            if (tglTrx >= start && tglTrx <= end) {
                const n = Number(r.nominal) || 0;
                const isM = r.jenis === 'Masuk';
                if (isM) inS += n; else outS += n;

                // Tombol Hapus: HANYA untuk role 'admin'
                const btnHapus = (ROLE === 'admin') ? 
                    `<i onclick="hapusData('${r.id}')" class="fas fa-trash-alt" style="color:red; cursor:pointer; margin-left:15px;"></i>` : "";

                html += `
                <div class="item-trx" style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #eee;">
                    <div>
                        <b style="color:#006b7a">${r.nama && r.nama !== '-' ? r.nama : r.ket}</b><br>
                        <small>${tglTrx.toLocaleDateString('id-ID')} | ${r.id}</small>
                    </div>
                    <div style="text-align:right">
                        <b style="color:${isM ? '#2ecc71' : '#e74c3c'}">${isM ? '+' : '-'} Rp ${n.toLocaleString()}</b><br>
                        <i onclick="window.location.href='kuitansi.html?id=${r.id}'" class="fas fa-file-invoice" style="color:#00B7EB; cursor:pointer;"></i>
                        ${btnHapus}
                    </div>
                </div>`;
            }
        });

        document.getElementById('sum-in').innerText = "Rp " + inS.toLocaleString();
        document.getElementById('sum-out').innerText = "Rp " + outS.toLocaleString();
        document.getElementById('sum-total').innerText = "Rp " + (inS - outS).toLocaleString();
        log.innerHTML = html || "<center>Tidak ada transaksi</center>";

    } catch (e) {
        log.innerHTML = "<center>Gagal muat data</center>";
    }
}

// ==========================================
// 3. INPUT & HAPUS DATA
// ==========================================
async function simpanData() {
    const id = "M" + Math.floor(10000 + Math.random() * 90000);
    const tgl = document.getElementById('in-tgl').value;
    const nama = document.getElementById('in-nama').value || "-";
    const wa = document.getElementById('in-wa').value || "-";
    const nominal = document.getElementById('in-amt').value;
    const ket = document.getElementById('in-ket').value;
    const jenis = document.getElementById('in-jenis').value;

    if (!nominal || !ket) return Swal.fire('Peringatan', 'Lengkapi data!', 'warning');

    Swal.fire({title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});

    try {
        const payload = {
            action: 'insert',
            data: [id, tgl, nama, wa, nominal, ket, jenis, new Date()]
        };

        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();

        if (result.status === 'success') {
            Swal.fire('Berhasil!', 'Data tersimpan.', 'success');
            if(typeof tutupModal === 'function') tutupModal(); 
            muatLaporan(); // Update laporan langsung
        }
    } catch (e) {
        Swal.fire('Error', 'Gagal kirim data', 'error');
    }
}

async function hapusData(id) {
    const confirm = await Swal.fire({
        title: 'Hapus?',
        text: "Data ID " + id + " akan hilang!",
        icon: 'warning',
        showCancelButton: true
    });

    if (confirm.isConfirmed) {
        Swal.fire({title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', id: id }) });
            muatLaporan();
            Swal.fire('Terhapus!', '', 'success');
        } catch (e) {
            Swal.fire('Gagal', 'Error server', 'error');
        }
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// OTOMATIS JALANKAN FUNGSI BERDASARKAN HALAMAN
if (window.location.href.includes('admin.html')) {
    window.onload = inisialisasiDashboard;
      }
          
