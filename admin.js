const API = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";
const DOMAIN = "https://moya.sekawan.my.id";
const role = sessionStorage.getItem("userRole");

function init() {
    document.getElementById('display-role').innerText = role || "User";
    document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());
    
    if(role !== 'admin') {
        const adminIds = ['nav-kas', 'nav-lap', 'nav-user', 'saldo-box'];
        adminIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'none'; });
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
        const saldoEl = document.getElementById('q-total');
        if(saldoEl) saldoEl.innerText = "Rp " + Math.max(0, total).toLocaleString('id-ID');
    } catch(e) { console.error("Saldo Error"); }
}

async function simpanTrx() {
    const btn = document.getElementById('btn-trx');
    const wa = document.getElementById('t-wa').value;
    const nominal = document.getElementById('t-amt').value;
    if(!wa || !nominal) return Swal.fire('Error', 'Data belum lengkap!', 'warning');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const id = "M" + Date.now();
    const payload = [id, document.getElementById('t-tgl').value, document.getElementById('t-nama').value || 'Konsumen', wa, nominal, document.getElementById('t-desc').value, "Masuk", new Date().toLocaleString('id-ID')];

    try {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
        let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
        window.open(`https://wa.me/${fw}?text=*KUITANSI MOYA*%0ACek: ${DOMAIN}/kuitansi.html?id=${id}`, '_blank');
        Swal.fire('Berhasil!', '', 'success');
        updateSaldo();
    } catch(e) { Swal.fire('Gagal!', '', 'error'); }
    btn.disabled = false;
    btn.innerText = 'SIMPAN & KIRIM WA';
}

async function muatLaporan() {
    const container = document.getElementById('log-data');
    container.innerHTML = "<center style='padding:40px'><i class='fas fa-sync fa-spin fa-2x' style='color:#1e3799'></i></center>";
    try {
        const res = await fetch(API);
        let data = await res.json();
        let html = "";
        
        // Filter data supaya baris header/kosong gak ikut masuk
        data.reverse().filter(r => r.id && r.nominal).forEach(r => {
            const isM = r.jenis === 'Masuk';
            const n = parseFloat(r.nominal) || 0;
            
            // Perbaikan Tanggal
            let tglFormatted = "Format tgl salah";
            if(r.tgl) {
                const d = new Date(r.tgl);
                tglFormatted = isNaN(d) ? r.tgl : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            html += `<div class="log-item">
                <div style="flex:1">
                    <b style="font-size:14px; color:#1e3799">${(r.nama === 'INTERNAL' ? r.ket : r.nama) || 'Tanpa Nama'}</b><br>
                    <small style="color:#aaa"><i class="far fa-calendar-alt"></i> ${tglFormatted}</small>
                </div>
                <div style="text-align:right">
                    <b style="color:${isM?'#2ecc71':'#e74c3c'}; font-size:15px;">${isM?'+':'-'} Rp ${n.toLocaleString('id-ID')}</b><br>
                    ${role === 'admin' ? `<i class="fas fa-trash-alt" onclick="hapus('${r.id}')" style="color:#eee; cursor:pointer; font-size:12px; margin-top:5px"></i>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = html || "<center>Belum ada data</center>";
    } catch(e) { container.innerHTML = "<center>Gagal memuat</center>"; }
}

async function hapus(id) {
    const cek = await Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true });
    if(cek.isConfirmed) {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "delete", id }) });
        muatLaporan(); updateSaldo();
    }
}

function logout() {
    Swal.fire({ title: 'Keluar?', icon: 'question', showCancelButton: true }).then(r => {
        if(r.isConfirmed) { sessionStorage.clear(); window.location.href = "index.html"; }
    });
}

window.onload = init;
        
