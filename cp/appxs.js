const API_URL = "https://script.google.com/macros/s/AKfycbzwQ47v62YYbZIcUDk7hizLGN3hiqoWajxpehpZPrRBPVVhtxPgZO42TXR1d5Lh3KAN/exec";
const GITHUB_URL = "https://moya.sekawan.my.id";

const auth = sessionStorage.getItem('moya_auth');
const userNama = sessionStorage.getItem('moya_name');

if (!auth && !window.location.href.includes('login.html')) {
  window.location.href = 'login.html';
}

function initAdmin() {
  document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());
  if (auth === 'admin') {
    document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'flex');
    document.getElementById('role-display').innerText = "OWNER: " + userNama;
    pindahTab('laporan', document.getElementById('nav-laporan'));
  } else {
    document.querySelectorAll('.admin-only').forEach(e => e.remove());
    document.getElementById('role-display').innerText = "STAFF: " + userNama;
    pindahTab('jual', document.getElementById('nav-jual'));
  }
}

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

function pindahTab(id, btn) {
  if (auth !== 'admin' && (id === 'laporan' || id === 'kas')) return;
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).style.display = 'block';
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'laporan' && auth === 'admin') muatLaporan();
}

async function simpanKas() {
  const amt = document.getElementById('k-amt').value, ket = document.getElementById('k-desc').value;
  if(!amt || !ket) return Swal.fire('Eits!', 'Isi semua!', 'warning');
  Swal.fire({title: 'Menyimpan...', didOpen: () => Swal.showLoading()});
  const data = ["K-"+Date.now(), document.getElementById('k-tgl').value, "INTERNAL", "-", amt, ket, document.getElementById('k-jenis').value, new Date().toLocaleString()];
  await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'insert', data: data }) });
  Swal.fire('Berhasil!', 'Kas dicatat.', 'success');
  document.getElementById('k-amt').value = ''; document.getElementById('k-desc').value = '';
}

async function simpanTransaksi() {
  const wa = document.getElementById('t-wa').value, amt = document.getElementById('t-amt').value, nama = document.getElementById('t-nama').value;
  if(!wa || !amt || !nama) return Swal.fire('Error', 'Data kurang!', 'error');
  Swal.fire({title: 'Proses...', didOpen: () => Swal.showLoading()});
  const idTrx = "M" + Math.floor(10000 + Math.random() * 90000);
  const data = [idTrx, document.getElementById('t-tgl').value, nama, wa, amt, document.getElementById('t-desc').value, "Masuk", new Date().toLocaleString()];
  await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'insert', data: data }) });
  let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
  const msg = `*KUITANSI MOYA*%0A%0AHi Kak *${nama}*, terima kasih!%0A💰 Total: Rp ${Number(amt).toLocaleString()}%0A📄 Kuitansi: ${GITHUB_URL}/kuitansi.html?id=${idTrx}`;
  Swal.fire('Berhasil!', 'Penjualan dicatat.', 'success').then(() => {
    document.getElementById('t-nama').value = ''; document.getElementById('t-wa').value = ''; document.getElementById('t-amt').value = ''; document.getElementById('t-desc').value = '';
    window.open(`https://wa.me/${fw}?text=${msg}`, '_blank');
  });
}

async function muatLaporan() {
  const log = document.getElementById('log-data');
  log.innerHTML = "<center><i class='fas fa-sync fa-spin'></i> Memuat...</center>";
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const start = new Date(document.getElementById('f-start').value), end = new Date(document.getElementById('f-end').value);
    let inS = 0, outS = 0, html = "";
    data.reverse().forEach(r => {
      const tgl = new Date(r.tgl);
      if(tgl >= start && tgl <= end) {
        const n = Number(r.nominal); const isM = r.jenis === 'Masuk';
        if(isM) inS += n; else outS += n;
        html += `<div style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #eee;">
          <div><b>${r.id.startsWith('K-')?r.ket:r.nama}</b><br><small>${r.tgl.split('T')[0]}</small></div>
          <div style="text-align:right"><b style="color:${isM?'#2ecc71':'#e74c3c'}">Rp ${n.toLocaleString()}</b><br>
          <i onclick="hapusData('${r.id}')" class="fas fa-trash-alt" style="color:#ffcccb; cursor:pointer;"></i></div>
        </div>`;
      }
    });
    document.getElementById('sum-in').innerText = "Rp " + inS.toLocaleString();
    document.getElementById('sum-out').innerText = "Rp " + outS.toLocaleString();
    document.getElementById('sum-total').innerText = "Rp " + (inS - outS).toLocaleString();
    log.innerHTML = html || "<center>Kosong</center>";
  } catch (e) { log.innerHTML = "Gagal memuat."; }
}

async function hapusData(id) {
  if(confirm('Hapus?')) {
    Swal.fire({title: 'Hapus...', didOpen: () => Swal.showLoading()});
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'delete', id: id }) });
    muatLaporan(); Swal.close();
  }
}

function logout() { sessionStorage.clear(); window.location.href = 'login.html'; }

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }
          
