var manual = [];
var lastGenerated = [];

// ── Tab switching ────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}

// ── Manual list ──────────────────────────────────────────────────────────────
function addManual() {
  var n = document.getElementById('mName').value.trim();
  var e = document.getElementById('mEmail').value.trim();
  if (!n || !e) return;
  manual.push({ name: n, email: e });
  document.getElementById('mName').value = '';
  document.getElementById('mEmail').value = '';
  renderManual();
}

function renderManual() {
  document.getElementById('manualList').innerHTML = manual.map(function(u, i) {
    return '<div class="m-item">' +
      '<div><div class="m-name">' + h(u.name) + '</div><div class="m-email">' + h(u.email) + '</div></div>' +
      '<button class="m-rm" onclick="manual.splice(' + i + ',1);renderManual()">×</button>' +
      '</div>';
  }).join('');
}

// ── Parse bulk textarea ──────────────────────────────────────────────────────
function parseBulk() {
  var raw = document.getElementById('bulkInput').value.trim();
  if (!raw) return [];
  return raw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean).map(function(l) {
    var p = l.split(/[,|\t]/).map(function(s) { return s.trim(); });
    return p.length >= 2 ? { name: p[0], email: p[1] } : null;
  }).filter(Boolean);
}

// ── Generate all ─────────────────────────────────────────────────────────────
function generateAll() {
  var all = parseBulk().concat(manual);
  if (!all.length) { alert('Please add at least one user.'); return; }

  lastGenerated = all;

  var grid = document.getElementById('cardsGrid');
  var profilesGrid = document.getElementById('profilesGrid');
  grid.innerHTML = '';
  profilesGrid.innerHTML = '';

  document.getElementById('results').style.display = 'block';
  document.getElementById('cntBadge').textContent = all.length + ' user' + (all.length !== 1 ? 's' : '');

  all.forEach(function(u, i) {
    var profileUrl = buildProfileUrl(u.name, u.email);
    var ini = u.name.split(/\s+/).slice(0, 2).map(function(w) { return w[0] ? w[0].toUpperCase() : ''; }).join('');

    // ── QR card ──
    var card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = (i * 0.05) + 's';
    card.innerHTML =
      '<div class="c-av">' + ini + '</div>' +
      '<div class="c-name">' + h(u.name) + '</div>' +
      '<div class="c-email">' + h(u.email) + '</div>' +
      '<div class="qr-wrap" id="qr-' + i + '"></div>' +
      '<div class="c-link" onclick="cp(this.dataset.url)" data-url="' + encodeURIComponent(profileUrl) + '"><span>⎘</span><span>' + h(profileUrl) + '</span></div>' +
      '<div class="c-acts">' +
        '<button class="c-btn b" onclick="cp(this.dataset.url)" data-url="' + encodeURIComponent(profileUrl) + '">Copy link</button>' +
        '<button class="c-btn b" onclick="window.open(decodeURIComponent(this.dataset.url),\'_blank\')" data-url="' + encodeURIComponent(profileUrl) + '">Open page</button>' +
        '<button class="c-btn" onclick="dlQR(' + i + ',this.dataset.name)" data-name="' + encodeURIComponent(u.name) + '">⬇ QR</button>' +
      '</div>';
    grid.appendChild(card);

    // ── Profile card ──
    var pc = document.createElement('div');
    pc.className = 'profile-card';
    pc.style.animationDelay = (i * 0.05) + 's';
    pc.innerHTML =
      '<div class="p-scan-tag"><span class="p-dot"></span> Verified Profile</div>' +
      '<div class="p-avatar">' + ini + '</div>' +
      '<div class="p-name">' + h(u.name) + '</div>' +
      '<div class="p-email-box" onclick="cp(this.dataset.email)" data-email="' + encodeURIComponent(u.email) + '">' +
        '<div class="p-email-icon">✉</div>' +
        '<span class="p-email-text">' + h(u.email) + '</span>' +
        '<span class="p-copy-hint">tap to copy</span>' +
      '</div>' +
      '<a class="p-open-btn" href="' + profileUrl + '" target="_blank">↗ Open Profile Page</a>';
    profilesGrid.appendChild(pc);

    // Generate QR code
    (function(idx) {
      setTimeout(function() {
        new QRCode(document.getElementById('qr-' + idx), {
          text: profileUrl, width: 110, height: 110,
          colorDark: '#3d2d8e', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }, 60);
    })(i);
  });

  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  switchTab('qr');
}

// ── URL builders ─────────────────────────────────────────────────────────────
function buildProfileUrl(name, email) {
  var base = window.location.href.replace('index.html', '').replace(/\/$/, '');
  return base + '/profile.html?' + new URLSearchParams({ name: name, email: email }).toString();
}

function buildQRPageUrl(name, email) {
  var base = window.location.href.replace('index.html', '').replace(/\/$/, '');
  return base + '/qr.html?' + new URLSearchParams({ name: name, email: email }).toString();
}

// ── Clipboard copy ───────────────────────────────────────────────────────────
function cp(encoded) {
  var val = decodeURIComponent(encoded);
  navigator.clipboard.writeText(val).then(function() {
    showToast('✓ Copied to clipboard');
  });
}

// ── Download single QR ───────────────────────────────────────────────────────
function dlQR(i, encodedName) {
  var name = decodeURIComponent(encodedName);
  var c = document.getElementById('qr-' + i).querySelector('canvas');
  if (!c) { showToast('QR not ready, try again'); return; }
  var a = document.createElement('a');
  a.download = name.replace(/\s+/g, '_') + '_QR.png';
  a.href = c.toDataURL('image/png');
  a.click();
}

// ── Export Excel ─────────────────────────────────────────────────────────────
function exportExcel() {
  if (!lastGenerated.length) return;

  var wsData = [['Name', 'Email', 'QR Code']];

  lastGenerated.forEach(function(u) {
    var qrPageUrl = buildQRPageUrl(u.name, u.email);
    wsData.push([
      u.name,
      u.email,
      { f: 'HYPERLINK("' + qrPageUrl + '","📷 View & Download QR")' }
    ]);
  });

  var ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 36 }, { wch: 28 }];

  var headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 },
    fill: { patternType: 'solid', fgColor: { rgb: '3D2D8E' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  ['A1', 'B1', 'C1'].forEach(function(cell) {
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  lastGenerated.forEach(function(u, i) {
    var cellRef = 'C' + (i + 2);
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { color: { rgb: '0563C1' }, underline: true, name: 'Arial', sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  });

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QR Codes');
  XLSX.writeFile(wb, 'QR_Users.xlsx');
  showToast('✓ Excel downloaded!');
}

// ── Clear all ────────────────────────────────────────────────────────────────
function clearAll() {
  manual = [];
  renderManual();
  document.getElementById('bulkInput').value = '';
  document.getElementById('results').style.display = 'none';
  document.getElementById('cardsGrid').innerHTML = '';
  document.getElementById('profilesGrid').innerHTML = '';
  lastGenerated = [];
}

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2200);
}

// ── HTML escape ──────────────────────────────────────────────────────────────
function h(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('mEmail').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addManual();
  });
});
