const API = "https://script.google.com/macros/s/AKfycbUQCPbV8f7sWIx1PMm0XLAQtA_DKgZoHHhI6HdM6xbIGp5a7zUkgoCdGp8IDyUVRAB/exec";
const DOMAIN = "https://moya.sekawan.my.id";
const role = sessionStorage.getItem("userRole");

function init() {
    document.getElementById('display-role').innerText = role || "USER";
    document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());
    
    if(role !== 'admin') {
        ['nav-kas', 'nav-lap', 'nav-user'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }
    updateSaldo();
}

function nav(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
        el.classList.add('active');
        if(id === 'laporan') muatLaporan();
        updateSaldo();
    }
}

async function updateSaldo() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        let total = 0;
        data.forEach(r => {
            const n = parseFloat(r.nominal);
            if(!isNaN(n)) {
                r.jenis === 'Masuk' ? total += n : total -= n;
            }
        });
        document.getElementById('q-total').innerText = "Rp " + Math.max(0, total).toLocaleString('id-ID');
    } catch(e) { console.log("Saldo Error"); }
}

async function simpanTrx() {
    const btn = document.getElementById('btn-trx');
    const wa = document.getElementById('t-wa').value;
    const nominal = document.getElementById('t-amt').value;
    const tgl = document.getElementById('t-tgl').value;
    const nama = document.getElementById('t-nama').value || 'Konsumen';
    const desc = document.getElementById('t-desc').value;

    if(!wa || !nominal) return Swal.fire('Gagal', 'Lengkapi WA & Nominal', 'warning');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM...';

    const id = "M" + Date.now();
    const payload = [id, tgl, nama, wa, nominal, desc, "Masuk", new Date().toLocaleString('id-ID')];

    try {
        // Kirim data ke Google Sheet
        await fetch(API, { 
            method: 'POST', 
            mode: 'no-cors', 
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: payload }) 
        });

        // Buka WhatsApp setelah fetch sukses (atau minimal sudah terpanggil)
        let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
        const waLink = `https://wa.me/${fw}?text=*KUITANSI MOYA*%0A%0ATerima kasih sdh memesan. Cek link: ${DOMAIN}/kuitansi.html?id=${id}`;
        window.open(waLink, '_blank');
        
        Swal.fire('Berhasil', 'Data tersimpan di Sheet & WA Terbuka', 'success');
        updateSaldo();
    } catch(e) { 
        Swal.fire('Error', 'Gagal koneksi ke server', 'error'); 
    } finally {
        btn.disabled = false;
        btn.innerText = "SIMPAN & KIRIM WA";
    }
}

async function simpanKas() {
    const btn = document.getElementById('btn-kas');
    const nominal = document.getElementById('k-amt').value;
    const ket = document.getElementById('k-desc').value;
    const tgl = document.getElementById('k-tgl').value;
    const jenis = document.getElementById('k-jenis').value;

    if(!nominal || !ket) return Swal.fire('Gagal', 'Lengkapi data kas', 'warning');

    btn.disabled = true;
    const id = "KAS-" + Date.now();
    const payload = [id, tgl, "INTERNAL", "-", nominal, ket, jenis, new Date().toLocaleString('id-ID')];

    try {
        await fetch(API, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ data: payload }) 
        });
        Swal.fire('Berhasil', 'Kas dicatat', 'success');
        document.getElementById('k-amt').value = '';
        document.getElementById('k-desc').value = '';
        updateSaldo();
    } catch(e) { Swal.fire('Error', 'Gagal', 'error'); }
    btn.disabled = false;
}

async function muatLaporan() {
    const container = document.getElementById('log-data');
    container.innerHTML = "<center style='padding:20px'><i class='fas fa-sync fa-spin'></i> Memuat...</center>";
    try {
        const res = await fetch(API);
        let data = await res.json();
        let html = "";
        
        // Anti NaN & Invalid Date
        data.reverse().filter(r => r.id && r.nominal).forEach(r => {
            const isM = r.jenis === 'Masuk';
            const n = parseFloat(r.nominal) || 0;
            const d = new Date(r.tgl);
            const tglFormatted = isNaN(d) ? r.tgl : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

            html += `
            <div style="display:flex; justify-content:space-between; padding:15px; background:#f8fdff; border-radius:20px; margin-bottom:10px; border:1px solid #eefaff; align-items:center;">
                <div style="flex:1">
                    <b style="font-size:14px; color:var(--text-deep)">${(r.nama === 'INTERNAL' ? r.ket : r.nama) || 'No Name'}</b><br>
                    <small style="color:#94a3b8">${tglFormatted} | ${r.id.includes('KAS') ? 'KAS' : 'JUAL'}</small>
                </div>
                <div style="text-align:right">
                    <b style="color:${isM ? '#10b981' : '#f43f5e'}; font-size:15px;">${isM ? '+' : '-'} ${n.toLocaleString('id-ID')}</b><br>
                    ${role === 'admin' ? `<i class="fas fa-trash-alt" onclick="hapus('${r.id}')" style="color:#cbd5e1; cursor:pointer; font-size:12px; margin-top:5px"></i>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = html || "<center>Belum ada transaksi</center>";
    } catch(e) { container.innerHTML = "Gagal memuat."; }
}

async function hapus(id) {
    const cek = await Swal.fire({ title: 'Hapus Data?', icon: 'warning', showCancelButton: true });
    if(cek.isConfirmed) {
        await fetch(API, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ action: "delete", id }) 
        });
        Swal.fire('Terhapus', '', 'success');
        muatLaporan(); 
        updateSaldo();
    }
}

async function tambahUser() {
    const u = document.getElementById('new-u').value;
    const p = document.getElementById('new-p').value;
    const r = document.getElementById('new-r').value;
    if(!u || !p) return Swal.fire('Lengkapi', 'Username & Password wajib', 'warning');
    await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "addUser", data: [u, p, r] }) });
    Swal.fire('Berhasil', 'User terdaftar', 'success');
}

function logout() {
    Swal.fire({ title: 'Logout?', icon: 'question', showCancelButton: true }).then(r => {
        if(r.isConfirmed) { sessionStorage.clear(); window.location.href = "index.html"; }
    });
}

window.onload = init;
