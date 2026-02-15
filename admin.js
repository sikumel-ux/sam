// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log("MOYA PWA Active"))
    .catch(err => console.error("PWA Error", err));
}

// Konfigurasi API (Pastikan URL lo bener)
const API_URL = "https://script.google.com/macros/s/AKfycbzUQCPbV8f7sWIx1PMm0XLAQtA_DKgZoHHhI6HdM6xbIGp5a7zUkgoCdGp8IDyUVRAB/exec";
const GITHUB_URL = "https://moya.sekawan.my.id";

// Set Tanggal Otomatis
document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());

// Fungsi Notifikasi
function notif(tipe, judul, teks) {
  Swal.fire({
    icon: tipe,
    title: judul,
    text: teks,
    confirmButtonColor: '#00B7EB'
  });
}

// Navigasi Halaman
function nav(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  if (id === 'laporan') muatLaporan();
}

// Simpan Kas Internal
async function simpanKas() {
  const amt = document.getElementById('k-amt').value;
  const ket = document.getElementById('k-desc').value;
  if (!amt || !ket) return notif('warning', 'Lengkapi Data', 'Nominal dan keterangan wajib diisi.');

  const payload = [
    "K-" + Date.now(),
    document.getElementById('k-tgl').value,
    "INTERNAL", "-", amt, ket,
    document.getElementById('k-jenis').value,
    new Date().toLocaleString()
  ];

  notif('info', 'Memproses...', 'Mohon tunggu sebentar.');
  try {
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
    notif('success', 'Berhasil', 'Data kas internal tersimpan.');
    document.getElementById('k-amt').value = '';
    document.getElementById('k-desc').value = '';
    muatLaporan();
    nav('laporan', document.querySelector('.nav-item'));
  } catch (e) { notif('error', 'Gagal', 'Terjadi gangguan koneksi.'); }
}

// Simpan Transaksi Penjualan
async function simpanTransaksi() {
  const wa = document.getElementById('t-wa').value;
  const amt = document.getElementById('t-amt').value;
  const nama = document.getElementById('t-nama').value;
  const ket = document.getElementById('t-desc').value;

  if (!wa || !amt || !nama) return notif('warning', 'Data Belum Lengkap', 'Nama, WA, dan Nominal wajib diisi.');

  const idTrx = "M" + Math.floor(10000 + Math.random() * 99999);
  const payload = [
    idTrx,
    document.getElementById('t-tgl').value,
    nama, wa, amt, ket,
    "Masuk",
    new Date().toLocaleString()
  ];

  try {
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
    let NoWa = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
    const link = `${GITHUB_URL}/kuitansi.html?id=${idTrx}`;
    const text = `*KUITANSI DIGITAL MOYA*%0A%0ATerima kasih Kak *${nama}*, Berikut link kuitansi Anda:%0A%0A📄 ${link}%0A💰 Total: Rp ${Number(amt).toLocaleString('id-ID')}`;
    
    window.open(`https://wa.me/${NoWa}?text=${text}`, '_blank');
    muatLaporan();
    nav('laporan', document.querySelector('.nav-item'));
  } catch (e) { notif('error', 'Gagal', 'Sistem error.'); }
}

// Ambil Data Laporan
async function muatLaporan() {
  const log = document.getElementById('log-data');
  log.innerHTML = "<center style='padding:20px;'><i class='fas fa-sync fa-spin'></i> Memuat data...</center>";
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    let inSum = 0, outSum = 0, html = "";

    data.reverse().forEach(r => {
      const n = Number(r.nominal) || 0;
      const isMasuk = r.jenis === 'Masuk';
      if (isMasuk) inSum += n; else outSum += n;

      html += `
        <div style="padding:15px 0; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b style="font-size:14px;">${r.nama === 'INTERNAL' ? r.ket : r.nama}</b><br>
            <small style="color:#999;">${new Date(r.tgl).toLocaleDateString('id-ID')}</small>
          </div>
          <b style="color:${isMasuk ? '#27ae60' : '#e74c3c'};">
            ${isMasuk ? '+' : '-'} Rp ${n.toLocaleString('id-ID')}
          </b>
        </div>`;
    });

    document.getElementById('sum-in').innerText = "Rp " + inSum.toLocaleString('id-ID');
    document.getElementById('sum-out').innerText = "Rp " + outSum.toLocaleString('id-ID');
    document.getElementById('sum-total').innerText = "Rp " + (inSum - outSum).toLocaleString('id-ID');
    log.innerHTML = html || "<center style='padding:20px;'>Belum ada data.</center>";
  } catch (e) { log.innerHTML = "<center style='color:red; padding:20px;'>Gagal memuat database.</center>"; }
}

// Jalankan laporan saat startup
window.onload = muatLaporan;
      
