var manual = [];
var lastGenerated = [];

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

function parseBulk() {
  var raw = document.getElementById('bulkInput').value.trim();
  if (!raw) return [];
  return raw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean).map(function(l) {
    var p = l.split(/[,|\t]/).map(function(s) { return s.trim(); });
    return p.length >= 2 ? { name: p[0], email: p[1] } : null;
  }).filter(Boolean);
}

function generateAll() {
  var all = parseBulk().concat(manual);
  if (!all.length) { alert('Please add at least one user.'); return; }

  var grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';
  document.getElementById('results').style.display = 'block';
  document.getElementById('cntBadge').textContent = all.length + ' user' + (all.length !== 1 ? 's' : '');

  lastGenerated = all;

  all.forEach(function(u, i) {
    var url = buildUrl(u.name, u.email);
    var ini = u.name.split(/\s+/).slice(0, 2).map(function(w) { return w[0] ? w[0].toUpperCase() : ''; }).join('');
    var card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = (i * 0.05) + 's';
    card.innerHTML =
      '<div class="c-av">' + ini + '</div>' +
      '<div class="c-name">' + h(u.name) + '</div>' +
      '<div class="c-email">' + h(u.email) + '</div>' +
      '<div class="qr-wrap" id="qr-' + i + '"></div>' +
      '<div class="c-link" onclick="cp(this.dataset.url)" data-url="' + encodeURIComponent(url) + '"><span>⎘</span><span>' + h(url) + '</span></div>' +
      '<div class="c-acts">' +
        '<button class="c-btn b" onclick="cp(this.dataset.url)" data-url="' + encodeURIComponent(url) + '">Copy link</button>' +
        '<button class="c-btn b" onclick="window.open(decodeURIComponent(this.dataset.url),\'_blank\')" data-url="' + encodeURIComponent(url) + '">Open page</button>' +
        '<button class="c-btn" onclick="dlQR(' + i + ',this.dataset.name)" data-name="' + encodeURIComponent(u.name) + '">Download QR</button>' +
      '</div>';
    grid.appendChild(card);
    (function(idx) {
      setTimeout(function() {
        new QRCode(document.getElementById('qr-' + idx), {
          text: url, width: 110, height: 110,
          colorDark: '#3d2d8e', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }, 60);
    })(i);
  });

  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildUrl(name, email) {
  var base = window.location.href.replace('index.html', '').replace(/\/$/, '');
  return base + '/profile.html?' + new URLSearchParams({ name: name, email: email }).toString();
}

function cp(encodedUrl) {
  var url = decodeURIComponent(encodedUrl);
  navigator.clipboard.writeText(url).then(function() {
    showToast('✓ Copied to clipboard');
  });
}

function dlQR(i, encodedName) {
  var name = decodeURIComponent(encodedName);
  var c = document.getElementById('qr-' + i).querySelector('canvas');
  if (!c) return;
  var a = document.createElement('a');
  a.download = 'qr-' + name.replace(/\s+/g, '-') + '.png';
  a.href = c.toDataURL();
  a.click();
}

function exportExcel() {
  if (!lastGenerated.length) return;

  var rows = lastGenerated.map(function(u) {
    return {
      'Name': u.name,
      'Email': u.email,
      'QR Code Link': buildUrl(u.name, u.email)
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 36 }, { wch: 80 }];

  var headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 },
    fill: { patternType: 'solid', fgColor: { rgb: '3D2D8E' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  ['A1', 'B1', 'C1'].forEach(function(cell) {
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QR Codes');
  XLSX.writeFile(wb, 'QR_Users.xlsx');

  showToast('✓ Excel downloaded!');
}

function clearAll() {
  manual = [];
  renderManual();
  document.getElementById('bulkInput').value = '';
  document.getElementById('results').style.display = 'none';
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2200);
}

function h(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('mEmail').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addManual();
  });
});
