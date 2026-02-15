const API = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";
const DOMAIN = "https://moya.sekawan.my.id";
const role = sessionStorage.getItem("userRole");

function init() {
    document.getElementById('display-role').innerText = role;
    document.querySelectorAll('input[type="date"]').forEach(i => i.valueAsDate = new Date());
    
    if(role !== 'admin') {
        ['nav-kas','nav-lap','nav-user','saldo-box'].forEach(id => document.getElementById(id).style.display = 'none');
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
            r.jenis === 'Masuk' ? total += n : total -= n;
        });
        document.getElementById('q-total').innerText = "Rp " + total.toLocaleString('id-ID');
    } catch(e) { console.log("Saldo Error"); }
}

async function simpanTrx() {
    const btn = document.getElementById('btn-trx');
    const wa = document.getElementById('t-wa').value;
    const nominal = document.getElementById('t-amt').value;
    if(!wa || !nominal) return Swal.fire('Error', 'Lengkapi data!', 'error');

    btn.disabled = true;
    const id = "M" + Date.now();
    const payload = [id, document.getElementById('t-tgl').value, document.getElementById('t-nama').value || 'Konsumen', wa, nominal, document.getElementById('t-desc').value, "Masuk", new Date().toLocaleString('id-ID')];

    await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ data: payload }) });
    let fw = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
    window.open(`https://wa.me/${fw}?text=*KUITANSI MOYA*%0ACek link: ${DOMAIN}/kuitansi.html?id=${id}`, '_blank');
    
    Swal.fire('Berhasil', 'Data disimpan!', 'success');
    btn.disabled = false;
    updateSaldo();
}

async function muatLaporan() {
    const container = document.getElementById('log-data');
    container.innerHTML = "<center><i class='fas fa-sync fa-spin'></i></center>";
    try {
        const res = await fetch(API);
        const data = await res.json();
        let html = "";
        data.reverse().forEach(r => {
            const isM = r.jenis === 'Masuk';
            const tgl = new Date(r.tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            html += `<div class="log-item">
                <div><b>${r.nama === 'INTERNAL' ? r.ket : r.nama}</b><br><small>${tgl}</small></div>
                <div style="text-align:right">
                    <b style="color:${isM?'#2ecc71':'#e74c3c'}">${isM?'+':'-'} Rp ${Number(r.nominal).toLocaleString('id-ID')}</b><br>
                    ${role === 'admin' ? `<i class="fas fa-trash-alt" onclick="hapus('${r.id}')" style="color:#ddd; cursor:pointer; font-size:12px;"></i>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = html || "Kosong";
    } catch(e) { container.innerHTML = "Error"; }
}

async function hapus(id) {
    const cek = await Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true });
    if(cek.isConfirmed) {
        await fetch(API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "delete", id }) });
        muatLaporan(); updateSaldo();
    }
}

function logout() {
    Swal.fire({ title: 'Logout?', icon: 'question', showCancelButton: true }).then(r => {
        if(r.isConfirmed) { sessionStorage.clear(); window.location.href = "index.html"; }
    });
}

window.onload = init;
        
