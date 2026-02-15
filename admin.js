const API = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";
const DOMAIN = "https://moya.sekawan.my.id";
const role = sessionStorage.getItem("userRole");

function init() {
    document.getElementById('display-role').innerText = role;
    document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());
    
    if(role !== 'admin') {
        document.getElementById('nav-kas').style.display = 'none';
        document.getElementById('nav-lap').style.display = 'none';
        document.getElementById('nav-user').style.display = 'none';
        document.getElementById('saldo-box').style.display = 'none';
    }
    updateSaldo();
}

function nav(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); 
    el.classList.add('active');
    
    if(id === 'laporan') muatLaporan();
    updateSaldo();
}

async function updateSaldo() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        let total = 0;
        data.forEach(r => {
            const n = Number(r.nominal) || 0;
            if(r.jenis === 'Masuk') total += n; else total -= n;
        });
        document.getElementById('q-total').innerText = "Rp " + total.toLocaleString('id-ID');
    } catch(e) { console.log("Gagal hitung saldo"); }
}

async function simpanTrx() {
    const btn = document.getElementById('btn-trx');
    const wa = document.getElementById('t-wa').value;
    const nominal = document.getElementById('t-amt').value;
    const idTrx = "M" + Date.now();

    if(!wa || !nominal) return Swal.fire('Error', 'WA dan Nominal wajib diisi!', 'error');

    btn.disabled = true;
    const payload = [idTrx, document.getElementById('t-tgl').value, document.getElementById('t-nama').value || 'Konsumen', wa, nominal, document.getElementById('t-desc').value, "Masuk", new Date().toLocaleString('id-ID')];

    await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
    
    let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
    window.open(`https://wa.me/${fw}?text=*KUITANSI DIGITAL MOYA*%0A%0ACek link: ${DOMAIN}/kuitansi.html?id=${idTrx}`, '_blank');
    
    Swal.fire('Sukses', 'Data tersimpan!', 'success');
    btn.disabled = false;
    updateSaldo();
}

async function simpanKas() {
    const btn = document.getElementById('btn-kas');
    const nominal = document.getElementById('k-amt').value;
    const ket = document.getElementById('k-desc').value;

    if(!nominal || !ket) return Swal.fire('Error', 'Lengkapi data!', 'error');

    btn.disabled = true;
    const payload = ["KAS-" + Date.now(), document.getElementById('k-tgl').value, "INTERNAL", "-", nominal, ket, document.getElementById('k-jenis').value, new Date().toLocaleString('id-ID')];

    await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
    Swal.fire('Berhasil', 'Kas disimpan!', 'success');
    btn.disabled = false;
    updateSaldo();
}

async function muatLaporan() {
    const container = document.getElementById('log-data');
    container.innerHTML = "<center style='padding:20px;'><i class='fas fa-sync fa-spin'></i></center>";
    
    try {
        const res = await fetch(API);
        const data = await res.json();
        let html = "";
        
        data.reverse().forEach(r => {
            const isMasuk = r.jenis === 'Masuk';
            const d = new Date(r.tgl);
            const tglIndo = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

            html += `
            <div style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #eee; align-items:center;">
                <div style="flex:1;">
                    <b style="font-size:14px;">${r.nama === 'INTERNAL' ? r.ket : r.nama}</b><br>
                    <small style="color:#888;"><i class="far fa-calendar-alt"></i> ${tglIndo}</small>
                </div>
                <div style="text-align:right;">
                    <b style="color:${isMasuk ? '#2ecc71' : '#e74c3c'}; font-size:15px;">${isMasuk ? '+' : '-'} Rp ${Number(r.nominal).toLocaleString('id-ID')}</b><br>
                    ${role === 'admin' ? `<i class="fas fa-trash-alt" onclick="hapus('${r.id}')" style="color:#ccc; cursor:pointer; font-size:12px; margin-top:8px;"></i>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = html || "<center>Kosong.</center>";
    } catch(e) { container.innerHTML = "Gagal memuat."; }
}

async function hapus(id) {
    const cek = await Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true });
    if(cek.isConfirmed) {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "delete", id: id }) });
        muatLaporan();
        updateSaldo();
    }
}

async function tambahUser() {
    const u = document.getElementById('new-u').value;
    const p = document.getElementById('new-p').value;
    const r = document.getElementById('new-r').value;
    if(!u || !p) return Swal.fire('Error', 'Isi data!', 'error');
    await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "addUser", data: [u, p, r] }) });
    Swal.fire('Berhasil', 'User terdaftar!', 'success');
}

window.onload = init;
