/* app.js - MOYA PWA Core Logic
   Fungsi: Manajemen Auth, Navigasi, CRUD Google Sheets, dan UI Helper
*/

// --- 1. KONFIGURASI API & URL ---
const API_URL = "https://script.google.com/macros/s/AKfycbzwQ47v62YYbZIcUDk7hizLGN3hiqoWajxpehpZPrRBPVVhtxPgZO42TXR1d5Lh3KAN/exec";
const GITHUB_URL = "https://moya.sekawan.my.id";

// Ambil data dari Session Storage
const auth = sessionStorage.getItem('moya_auth'); // role: admin / user
const userNama = sessionStorage.getItem('moya_name');

// --- 2. PROTEKSI HALAMAN ---
// Jika mencoba akses admin tanpa login, tendang ke login.html
if (!auth && !window.location.href.includes('login.html')) {
  window.location.href = 'login.html';
}

// --- 3. INISIALISASI HALAMAN (ONLOAD) ---
function initAdmin() {
  // Set semua input tanggal ke hari ini
  document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());
  
  if (auth === 'admin') {
    // OWNER: Tampilkan menu khusus admin & buka Tab Laporan
    document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'flex');
    document.getElementById('role-display').innerText = "OWNER: " + userNama;
    pindahTab('laporan', document.getElementById('nav-laporan'));
  } else {
    // STAFF: Hapus elemen admin dari DOM & buka Tab Jual
    document.querySelectorAll('.admin-only').forEach(e => e.remove());
    document.getElementById('role-display').innerText = "STAFF: " + userNama;
    pindahTab('jual', document.getElementById('nav-jual'));
  }
}

// --- 4. NAVIGASI TAB ---
function pindahTab(id, btn) {
  // Kunci Keamanan: Staff dilarang masuk Laporan/Kas via inspect element
  if (auth !== 'admin' && (id === 'laporan' || id === 'kas')) {
    id = 'jual';
    btn = document.getElementById('nav-jual');
  }

  // Sembunyikan semua section page
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  // Nonaktifkan semua menu navigasi
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  // Aktifkan tab yang dipilih
  const target = document.getElementById('page-' + id);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
  if (btn) btn.classList.add('active');

  // Load data otomatis jika Admin membuka tab laporan
  if (id === 'laporan' && auth === 'admin') muatLaporan();
}

// --- 5. LOGIKA TRANSAKSI (SIMPAN DATA) ---

// Simpan Kas Internal (Operasional)
async function simpanKas() {
  const amt = document.getElementById('k-amt').value;
  const ket = document.getElementById('k-desc').value;
  const tgl = document.getElementById('k-tgl').value;
  const jenis = document.getElementById('k-jenis').value;

  if(!amt || !ket) return Swal.fire('Eits!', 'Isi nominal & keterangan dulu.', 'warning');
  
  Swal.fire({title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
  
  const data = ["K-"+Date.now(), tgl, "INTERNAL", "-", amt, ket, jenis, new Date().toLocaleString()];
  
  try {
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'insert', data: data }) });
    Swal.fire('Berhasil!', 'Data kas dicatat.', 'success');
    
    // Auto-Clear Form
    document.getElementById('k-amt').value = '';
    document.getElementById('k-desc').value = '';
  } catch (e) {
    Swal.fire('Gagal', 'Koneksi bermasalah.', 'error');
  }
}

// Simpan Penjualan & Kirim WA
async function simpanTransaksi() {
  const wa = document.getElementById('t-wa').value;
  const amt = document.getElementById('t-amt').value;
  const nama = document.getElementById('t-nama').value;
  const tgl = document.getElementById('t-tgl').value;
  const desc = document.getElementById('t-desc').value;

  if(!wa || !amt || !nama) return Swal.fire('Error', 'Data belum lengkap!', 'error');

  Swal.fire({title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
  
  const idTrx = "M" + Math.floor(10000 + Math.random() * 90000);
  const data = [idTrx, tgl, nama, wa, amt, desc, "Masuk", new Date().toLocaleString()];
  
  try {
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'insert', data: data }) });
    
    // Format nomor WA & Pesan
    let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
    const msg = `*KUITANSI MOYA*%0A%0AHi Kak *${nama}*, terima kasih!%0A💰 Total: Rp ${Number(amt).toLocaleString()}%0A📄 Kuitansi: ${GITHUB_URL}/kuitansi.html?id=${idTrx}`;
    
    Swal.fire('Berhasil!', 'Penjualan dicatat.', 'success').then(() => {
      // Auto-Clear Form
      document.getElementById('t-nama').value = '';
      document.getElementById('t-wa').value = '';
      document.getElementById('t-amt').value = '';
      document.getElementById('t-desc').value = '';
      
      // Buka WhatsApp
      window.open(`https://wa.me/${fw}?text=${msg}`, '_blank');
    });
  } catch (e) {
    Swal.fire('Gagal', 'Cek koneksi internet.', 'error');
  }
}

// --- 6. LOGIKA LAPORAN (VIEW & DELETE) ---

async function muatLaporan() {
  const log = document.getElementById('log-data');
  log.innerHTML = "<center><i class='fas fa-sync fa-spin'></i> Sinkronisasi...</center>";
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const start = new Date(document.getElementById('f-start').value);
    const end = new Date(document.getElementById('f-end').value);
    
    let inS = 0, outS = 0, html = "";

    data.reverse().forEach(r => {
      const tgl = new Date(r.tgl);
      if(tgl >= start && tgl <= end) {
        const n = Number(r.nominal); 
        const isM = r.jenis === 'Masuk';
        if(isM) inS += n; else outS += n;
        
        html += `
          <div class="hist-item">
            <div>
              <b>${r.id.startsWith('K-') ? r.ket : r.nama}</b><br>
              <small style="color:#aaa">${r.tgl.split('T')[0]}</small>
            </div>
            <div style="text-align:right">
              <b style="color:${isM ? '#2ecc71' : '#e74c3c'}">${isM ? '+' : '-'} Rp ${n.toLocaleString()}</b>
              <i onclick="hapusData('${r.id}')" class="fas fa-trash-alt trash-btn"></i>
            </div>
          </div>`;
      }
    });

    document.getElementById('sum-in').innerText = "Rp " + inS.toLocaleString();
    document.getElementById('sum-out').innerText = "Rp " + outS.toLocaleString();
    document.getElementById('sum-total').innerText = "Rp " + (inS - outS).toLocaleString();
    log.innerHTML = html || "<center style='padding:20px; color:#ccc;'>Tidak ada transaksi.</center>";
    
  } catch (e) { 
    log.innerHTML = "<center>Gagal memuat data cloud.</center>"; 
  }
}

async function hapusData(id) {
  if(confirm('Hapus data ini secara permanen?')) {
    Swal.fire({title: 'Menghapus...', didOpen: () => Swal.showLoading()});
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'delete', id: id }) });
    muatLaporan();
    Swal.close();
  }
}

// --- 7. UI HELPER & AUTH ---

// Fungsi Intip Password (Hide/Show)
function togglePassword(inputId, iconId) {
  const p = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  
  if (p.type === "password") {
    p.type = "text";
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    p.type = "password";
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

// Fungsi Logout
function logout() { 
  sessionStorage.clear(); 
  window.location.href = 'login.html'; 
}

// --- 8. SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('MOYA PWA: Active'))
      .catch(err => console.log('PWA Error:', err));
  });
}
  
