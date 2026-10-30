/* =====================================================
   NF Invoice Generator - app.js
   Form se data le kar invoice document banata hai
   Invoice size: 11.5" x 4.5"  (PNG: 3450 x 1350 px @ 300 DPI)
   ===================================================== */

const $ = (id) => document.getElementById(id);

const INV_W = 1104;   // 11.5 inch @ 96 DPI
const INV_H = 432;    // 4.5 inch @ 96 DPI
const PNG_SCALE = 300 / 96;   // 3.125 -> output 3450 x 1350 px = 300 DPI

/* ---------- helpers ---------- */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return 'Rs. ' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtDate(value) {
  if (!value) return '-';
  const parts = value.split('-');           // yyyy-mm-dd
  if (parts.length !== 3) return value;
  return parts[2] + '-' + parts[1] + '-' + parts[0];
}

function val(id) {
  return $(id).value.trim();
}

/* =====================================================
   PRODUCT ROWS (form side)
   ===================================================== */
const productRowsEl = $('productRows');

function addProductRow(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML =
    '<td class="row-num"></td>' +
    '<td class="col-name"><input type="text" class="f-name" placeholder="Hoodie / T-Shirt"></td>' +
    '<td><input type="text" class="f-color" placeholder="Black"></td>' +
    '<td><input type="text" class="f-size" placeholder="M / L / XL"></td>' +
    '<td><input type="number" class="f-qty" min="1" placeholder="1"></td>' +
    '<td><input type="number" class="f-disc" min="0" max="100" placeholder="0"></td>' +
    '<td><input type="number" class="f-price" min="0" placeholder="0"></td>' +
    '<td class="row-total">Rs. 0</td>' +
    '<td><button type="button" class="btn-remove" title="Remove row">&#10005;</button></td>';

  tr.querySelector('.f-name').value = data.name || '';
  tr.querySelector('.f-color').value = data.color || '';
  tr.querySelector('.f-size').value = data.size || '';
  tr.querySelector('.f-qty').value = data.qty || '';
  tr.querySelector('.f-disc').value = data.disc || '';
  tr.querySelector('.f-price').value = data.price || '';

  productRowsEl.appendChild(tr);
  renumberRows();
  recalcRow(tr);
}

function renumberRows() {
  [...productRowsEl.children].forEach((tr, i) => {
    tr.querySelector('.row-num').textContent = i + 1;
  });
}

function recalcRow(tr) {
  const qty = parseFloat(tr.querySelector('.f-qty').value) || 0;
  const price = parseFloat(tr.querySelector('.f-price').value) || 0;
  const disc = parseFloat(tr.querySelector('.f-disc').value) || 0;
  const gross = qty * price;
  const net = gross * (1 - Math.min(Math.max(disc, 0), 100) / 100);
  tr.querySelector('.row-total').textContent = money(net);
}

/* form events: input se total update, remove button */
productRowsEl.addEventListener('input', (e) => {
  const tr = e.target.closest('tr');
  if (tr) {
    recalcRow(tr);
    updateLiveTotal();
  }
});

productRowsEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove')) {
    e.target.closest('tr').remove();
    renumberRows();
    updateLiveTotal();
  }
});

$('btnAddRow').addEventListener('click', () => addProductRow());

/* rows collect karo (jo rows bhari hain) */
function collectRows() {
  const rows = [];
  [...productRowsEl.children].forEach((tr) => {
    const name = tr.querySelector('.f-name').value.trim();
    const color = tr.querySelector('.f-color').value.trim();
    const size = tr.querySelector('.f-size').value.trim();
    const qty = parseFloat(tr.querySelector('.f-qty').value) || 0;
    const price = parseFloat(tr.querySelector('.f-price').value) || 0;
    const discRaw = tr.querySelector('.f-disc').value.trim();
    const disc = discRaw ? Math.min(Math.max(parseFloat(discRaw) || 0, 0), 100) : 0;
    if (name || qty || price) {
      rows.push({ name, color, size, qty, price, disc, hasDisc: discRaw !== '' });
    }
  });
  return rows;
}

/* row ka net amount (discount ke baad) */
function lineNet(r) {
  return r.qty * r.price * (1 - r.disc / 100);
}

function updateLiveTotal() {
  const rows = collectRows();
  const itemsTotal = rows.reduce((s, r) => s + lineNet(r), 0);
  const dc = parseFloat($('dcCharges').value) || 0;
  $('liveNetTotal').textContent = money(itemsTotal + dc);
}

$('dcCharges').addEventListener('input', updateLiveTotal);

/* =====================================================
   BUILD INVOICE
   ===================================================== */
$('btnBuild').addEventListener('click', buildInvoice);

/* ---------- number ko words mein (amount in words) ---------- */
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoDigits(r) : '');
}

function numToWords(num) {
  num = Math.floor(Math.abs(num));
  if (num === 0) return 'Zero';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh  = Math.floor(num / 100000);   num %= 100000;
  const thou  = Math.floor(num / 1000);     num %= 1000;
  const rest  = num;
  const parts = [];
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh)  parts.push(twoDigits(lakh) + ' Lakh');
  if (thou)  parts.push(twoDigits(thou) + ' Thousand');
  if (rest)  parts.push(threeDigits(rest));
  return parts.join(' ');
}

function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let s = 'Rupees ' + numToWords(rupees);
  if (paise) s += ' and ' + numToWords(paise) + ' Rupees';
  return s + ' Only';
}

async function buildInvoice() {
  const invNo = val('invNo');
  const invDate = val('invDate');
  const purpose = val('purpose');
  const customer = val('customer');
  const address = val('address');
  const area = val('area');
  const landmark = val('landmark');
  const city = val('city');

  if (!invNo) return alert('Invoice No likhein.');
  if (!customer) return alert('Customer Name likhein.');

  const rows = collectRows().filter((r) => r.name && r.qty > 0);
  if (rows.length === 0) return alert('Kam se kam aik product add karein (Name + Qty).');

  const itemsTotal = rows.reduce((s, r) => s + r.qty * r.price, 0);        /* gross (bina discount) */
  const netItems   = rows.reduce((s, r) => s + lineNet(r), 0);             /* discount ke baad */
  const discountTotal = itemsTotal - netItems;
  const dc = parseFloat($('dcCharges').value) || 0;
  const netTotal = netItems + dc;

  /* kisi bhi row par discount diya gaya hai? (summary row ke liye) */
  const anyDisc = rows.some((r) => r.hasDisc && r.disc > 0);

  /* ---- meta ---- */
  $('outInvNo').textContent = invNo;
  $('outInvDate').textContent = fmtDate(invDate);
  $('outPurpose').textContent = purpose || '-';

  /* ---- billed to ---- */
  $('outCustomer').textContent = customer;

  const setLine = (id, text) => {
    const el = $(id);
    if (text) { el.textContent = text; el.hidden = false; }
    else { el.textContent = ''; el.hidden = true; }
  };

  setLine('outAddress', address);
  setLine('outAreaLandmark', [area, landmark].filter(Boolean).join(', '));
  setLine('outCity', city);

  /* ---- product rows (discount column: diya ho to %, warna "-") ---- */
  $('outProductRows').innerHTML = rows.map((r, i) =>
    '<tr>' +
      '<td class="c-num">' + (i + 1) + '</td>' +
      '<td>' + esc(r.name) + '</td>' +
      '<td>' + esc(r.color || '-') + '</td>' +
      '<td>' + esc(r.size || '-') + '</td>' +
      '<td class="c-qty">' + r.qty + '</td>' +
      '<td class="c-disc">' + (r.hasDisc ? r.disc + '%' : '-') + '</td>' +
      '<td class="c-amt">' + money(r.price) + '</td>' +
      '<td class="c-amt">' + money(lineNet(r)) + '</td>' +
    '</tr>'
  ).join('');

  /* ---- summary ---- */
  $('outSubTotal').textContent = money(itemsTotal);
  $('outDc').textContent = money(dc);
  $('outNetTotal').textContent = money(netTotal);
  $('outQty').textContent = rows.reduce((s, r) => s + r.qty, 0);
  $('outDiscount').textContent = anyDisc ? '- ' + money(discountTotal) : '-';
  $('outAmountWords').textContent = amountInWords(netTotal);

  /* ---- logo load hone ka intezar ---- */
  const logo = $('nfLogoTop');
  if (logo && logo.src && !logo.complete) {
    try { await logo.decode(); } catch (e) { /* ignore */ }
  }

  /* ---- overlay dikhao, phir rows adjust karo ---- */
  $('previewOverlay').hidden = false;
  document.body.classList.add('overlay-open');

  adjustRows();
  fitInvoiceContent();
  fitOverlay();
}

/* Content agar fixed height (432px) se ooncha ho to thora scale down kar do */
function fitInvoiceContent() {
  const inner = $('invInner');
  inner.style.transform = 'none';
  inner.style.width = '100%';

  if (inner.scrollHeight > inner.clientHeight + 1) {
    const k = inner.clientHeight / inner.scrollHeight;
    inner.style.width = (100 / k) + '%';
    inner.style.transformOrigin = 'top left';
    inner.style.transform = 'scale(' + k + ')';
  }
}

/* Sirf product rows rakho (koi khali filler line nahi).
   Agar products itne hain ke fit nahi ho rahe -> dense mode (chhoti rows) */
function adjustRows() {
  const tbody = $('outProductRows');
  [...tbody.querySelectorAll('tr.empty-row')].forEach((tr) => tr.remove());

  const table  = $('invTable');
  const left   = table.closest('.inv-left');
  const theadH = table.tHead.offsetHeight;
  const words  = $('amountWords');
  const wordsH = words.offsetHeight + 10;      /* + margin */
  const totalH = left.clientHeight;
  const realRows = tbody.rows.length;

  left.style.flex = '';
  left.style.transform = 'none';
  left.style.width = '100%';

  if (totalH <= 0 || realRows === 0) return;

  /* rows ki asal height (normal mode) */
  table.classList.remove('dense');
  [...tbody.rows].forEach((tr) => {
    [...tr.cells].forEach((td) => { td.style.height = ''; });
  });
  const rowH = tbody.rows[0].offsetHeight || 24;

  const avail = totalH - theadH - wordsH;
  const needed = realRows * rowH;

  if (needed > avail) {
    /* dense mode: row height aur font chhota kar do (summary card safe rahega) */
    table.classList.add('dense');
    let denseH = Math.floor(avail / realRows);
    if (denseH < 13) denseH = 13;          /* is se chhoti rows readable nahi hongi */
    [...tbody.rows].forEach((tr) => {
      [...tr.cells].forEach((td) => { td.style.height = denseH + 'px'; });
    });
    return;
  }

  /* kam items: rows ki height barha kar table thora bhara lage
     (lekin zyada nahi - 22px se 30px tak hi) */
  let grownH = Math.floor(avail / realRows);
  if (grownH > 30) grownH = 30;
  if (grownH > rowH) {
    [...tbody.rows].forEach((tr) => {
      [...tr.cells].forEach((td) => { td.style.height = grownH + 'px'; });
    });
  }
}

/* Screen par invoice ko fit karo (sirf display ke liye) */
function fitOverlay() {
  if ($('previewOverlay').hidden) return;

  const stage = $('overlayStage');
  const availW = stage.clientWidth - 48;
  const availH = stage.clientHeight - 48;
  const s = Math.min(1, availW / INV_W, availH / INV_H);

  $('invoiceScaler').style.transform = 'scale(' + s + ')';
  $('scalerWrap').style.width = Math.ceil(INV_W * s) + 'px';
  $('scalerWrap').style.height = Math.ceil(INV_H * s) + 'px';
}

window.addEventListener('resize', fitOverlay);

/* ---- overlay band karo ---- */
function closeOverlay() {
  $('previewOverlay').hidden = true;
  document.body.classList.remove('overlay-open');
}

$('btnClose').addEventListener('click', closeOverlay);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('previewOverlay').hidden) closeOverlay();
});

/* =====================================================
   DOWNLOAD IMAGE (PNG) - exactly 11.5" x 4.5" @ 300 DPI
   ===================================================== */
$('btnDownload').addEventListener('click', async () => {
  if (typeof html2canvas === 'undefined') {
    return alert('Image library load nahi hui. Internet connection check karein aur page refresh karein.');
  }

  const btn = $('btnDownload');
  const original = btn.innerHTML;
  btn.innerHTML = 'Ban rahi hai...';
  btn.disabled = true;

  /* display scale temporarily hatao taake exact size ki image bane */
  const scaler = $('invoiceScaler');
  const savedTransform = scaler.style.transform;
  scaler.style.transform = 'none';

  try {
    await new Promise((r) => setTimeout(r, 60));

    const logo = $('nfLogoTop');
    if (logo && !logo.complete) { try { await logo.decode(); } catch (e) {} }

    const canvas = await html2canvas($('invoice'), {
      scale: PNG_SCALE,          // 3.125 -> 1104*3.125 = 3450 px, 432*3.125 = 1350 px
      width: INV_W,
      height: INV_H,
      windowWidth: INV_W,
      windowHeight: INV_H,
      backgroundColor: '#ffffff',
      useCORS: true
    });

    const link = document.createElement('a');
    const safeNo = (val('invNo') || 'invoice').replace(/[^\w-]/g, '_');
    link.download = 'NF-Invoice-' + safeNo + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('Image nahi ban saki: ' + err.message);
  } finally {
    scaler.style.transform = savedTransform;
    btn.innerHTML = original;
    btn.disabled = false;
  }
});

/* =====================================================
   PRINT / SAVE AS PDF (page size: 11.5" x 4.5")
   ===================================================== */
$('btnPrint').addEventListener('click', () => window.print());

/* =====================================================
   INIT - logo, aaj ki date, pehli product row
   ===================================================== */
(function init() {
  /* logo images mein base64 logo lagao (canvas taint bachne ke liye) */
  document.querySelectorAll('.nf-logo-img').forEach((img) => {
    if (window.NF_LOGO_SRC) img.src = window.NF_LOGO_SRC;
  });

  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  $('invDate').value = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());

  addProductRow();

  /* autotest=1 se demo invoice auto build hota hai (testing ke liye) */
  const params = new URLSearchParams(location.search);
  if (params.get('autotest') === '1') {
    $('invNo').value = 'NF-1001';
    $('purpose').value = 'Order Payment';
    $('customer').value = 'Bilal Samad';
    $('address').value = 'House 12, Street 5, Block C';
    $('area').value = 'Gulberg III';
    $('landmark').value = 'Main Boulevard';
    $('city').value = 'Lahore';
    addProductRow({ name: 'Heavy Hoodie', color: 'Black', size: 'L', qty: 2, price: 2500 });
    addProductRow({ name: 'Cargo Pants', color: 'Olive', size: '32', qty: 1, price: 1800 });
    $('dcCharges').value = '250';
    updateLiveTotal();
    buildInvoice();
  }
})();
