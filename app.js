/* app.js — CBI lead dashboard. Reads/writes Supabase REST with the anon key. */
const { url, anon, table } = window.SUPA;
const REST = `${url}/rest/v1/${table}`;
const H = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' };
const GREEN = ['Kartal','Pendik','Çekmeköy','Ataşehir','Maltepe','Tuzla','Ümraniye','Sancaktepe'];
const RED = ['Fatih','Esenyurt','Avcılar','Bahçelievler','Başakşehir','Bağcılar','Esenler','Küçükçekmece','Sultangazi','Zeytinburnu'];
const $ = id => document.getElementById(id);

let ALL = [], sortKey = 'price_tl', sortDir = 1, activeDistricts = new Set();

const fmt = n => (n == null || n === '') ? '—' : Number(n).toLocaleString('tr-TR');
// escape ALL DB-sourced strings before innerHTML (anon can insert rows → stored-XSS guard)
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? esc(u) : '';
const STATUSES = ['new','contacted','visited','appraised','rejected','won'];
function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function getWriteToken(){
  let token = localStorage.getItem('cbi_write_token') || '';
  if(!token){
    token = (prompt('Private CBI write token:') || '').trim();
    if(token) localStorage.setItem('cbi_write_token', token);
  }
  return token;
}

async function load(){
  try{
    const r = await fetch(`${REST}?select=*&order=price_tl.asc`, { headers: H });
    if(!r.ok) throw new Error(await r.text());
    ALL = await r.json();
    buildDistrictChips();
    buildRoomsOptions();
    render();
  }catch(e){ $('warn').textContent = 'Load failed: ' + e.message; }
}

function buildDistrictChips(){
  const counts = {};
  ALL.forEach(r => { if(r.district) counts[r.district]=(counts[r.district]||0)+1; });
  const dists = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  $('districtChips').innerHTML = dists.map(d=>{
    const cls = RED.includes(d)?'chip red':'chip';
    return `<span class="${cls}" data-d="${esc(d)}">${esc(d)} <span class="muted">${counts[d]}</span></span>`;
  }).join('');
  document.querySelectorAll('#districtChips .chip').forEach(c=>{
    c.onclick=()=>{ const d=c.dataset.d; if(activeDistricts.has(d)){activeDistricts.delete(d);c.classList.remove('on');}else{activeDistricts.add(d);c.classList.add('on');} render(); };
  });
}
function buildRoomsOptions(){
  const rs=[...new Set(ALL.map(r=>r.rooms).filter(Boolean))].sort();
  $('rooms').innerHTML='<option value="">any</option>'+rs.map(r=>`<option>${esc(r)}</option>`).join('');
}

function passes(r){
  const q=$('q').value.trim().toLowerCase();
  if(q && !(`${r.neighborhood||''} ${r.district||''} ${r.ilan_no||''} ${r.desc_flags||''}`.toLowerCase().includes(q))) return false;
  const pmin=+$('pmin').value, pmax=+$('pmax').value, amin=+$('amin').value, amax=+$('amax').value;
  if(pmin && (r.price_tl||0)<pmin) return false;
  if(pmax && (r.price_tl||0)>pmax) return false;
  if(amin && (r.m2_net||0)<amin) return false;
  if(amax && (r.m2_net||0)>amax) return false;
  if($('rooms').value && r.rooms!==$('rooms').value) return false;
  if($('verdict').value && r.verdict!==$('verdict').value) return false;
  if($('status').value && (r.status||'new')!==$('status').value) return false;
  if(activeDistricts.size && !activeDistricts.has(r.district)) return false;
  return true;
}

function render(){
  let rows = ALL.filter(passes);
  rows.sort((a,b)=>{ let x=a[sortKey],y=b[sortKey]; if(typeof x==='number'||typeof y==='number'){x=+x||0;y=+y||0;} else {x=(x||'').toString();y=(y||'').toString();} return x<y?-sortDir:x>y?sortDir:0; });
  $('resultCount').textContent = rows.length;
  $('rows').innerHTML = rows.map(r=>{
    const tapuBad=/irtifak|hisseli|arsa/i.test(r.tapu_durumu||'');
    const st = STATUSES.includes(r.status) ? r.status : 'new';      // sanitized to known set
    const v = (r.verdict||'FLAG').replace(/[^A-Za-z]/g,'') || 'FLAG'; // safe for class + text
    const id = String(r.id).replace(/[^0-9]/g,'');
    const url = safeUrl(r.url);
    return `<tr>
      <td><span class="badge b-${v}">${esc(v)}</span></td>
      <td>${esc(r.district)||'—'}${RED.includes(r.district)?' <span class="small" style="color:var(--danger)">⚠</span>':''}</td>
      <td>${esc(r.neighborhood)||'—'}</td>
      <td>${esc(r.rooms)||'—'}</td>
      <td class="num">${fmt(r.m2_net)}</td>
      <td class="num">${fmt(r.price_tl)}</td>
      <td class="num">$${fmt(r.usd)}</td>
      <td>${esc(r.building_age)||'—'}</td>
      <td>${esc(r.floor)||'—'}</td>
      <td class="${tapuBad?'tapu-bad':'tapu-ok'}">${esc(r.tapu_durumu)||'—'}</td>
      <td class="small">${esc(r.iskan)||'—'}</td>
      <td class="small">${esc(r.kimden)||'—'}</td>
      <td><select class="status st-${st}" data-id="${id}">
        ${STATUSES.map(s=>`<option ${s===st?'selected':''}>${s}</option>`).join('')}
      </select></td>
      <td>${url?`<a href="${url}" target="_blank" rel="noopener noreferrer">aç ↗</a>`:'—'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="14" class="muted" style="padding:24px;text-align:center">No listings match.</td></tr>`;

  document.querySelectorAll('select.status').forEach(sel=>{
    sel.onchange = async ()=>{
      const id=sel.dataset.id, status=sel.value;
      const prev = (ALL.find(x=>String(x.id)===String(id)) || {}).status || 'new';
      const token = getWriteToken();
      if(!token){ sel.value = prev; toast('Write token required'); return; }
      sel.className='status st-'+status;
      try{
        const r=await fetch(`${REST}?id=eq.${id}&select=id,status`,{method:'PATCH',headers:{...H,'x-cbi-write-token':token,Prefer:'return=representation'},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
        if(!r.ok) throw new Error(await r.text());
        const changed = await r.json();
        if(!changed.length) throw new Error('No row updated. Check write token.');
        const row=ALL.find(x=>x.id==id); if(row) row.status=status;
        toast(`Saved: ${status}`); renderKpis();
      }catch(e){ localStorage.removeItem('cbi_write_token'); sel.value = prev; sel.className='status st-'+prev; toast('Save failed: token?'); }
    };
  });
  renderKpis(rows);
}

function renderKpis(rows){
  rows = rows || ALL.filter(passes);
  const keep=ALL.filter(r=>r.verdict==='KEEP').length;
  const inBand=ALL.filter(r=>(r.price_tl||0)>=6300000 && (r.price_tl||0)<=7800000).length;
  const prices=ALL.map(r=>r.price_tl).filter(Boolean);
  const avg=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):0;
  const contacted=ALL.filter(r=>['contacted','visited','appraised','won'].includes(r.status)).length;
  const kpi=[
    ['Total',ALL.length],['KEEP',keep],['In-band ₺6.3–7.8M',inBand],
    ['Avg price ₺',fmt(avg)],['Contacted+',contacted],['Showing',rows.length],
  ];
  $('kpis').innerHTML=kpi.map(k=>`<div class="kpi"><div class="v">${k[1]}</div><div class="l">${k[0]}</div></div>`).join('');
}

// events
['q','pmin','pmax','amin','amax','rooms','verdict','status'].forEach(id=>$(id).addEventListener('input',render));
document.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=1;} render(); });
$('refreshBtn').onclick=load;
$('resetBtn').onclick=()=>{['q','pmin','pmax','amin','amax','rooms','verdict','status'].forEach(id=>$(id).value='');activeDistricts.clear();document.querySelectorAll('#districtChips .chip').forEach(c=>c.classList.remove('on'));render();};

load();
