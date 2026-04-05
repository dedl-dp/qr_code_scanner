// ── Firebase Setup ────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1WexCYb3BFkr4PnQo32n1lSJjzer2S-0",
  authDomain: "qr-id-system-34cec.firebaseapp.com",
  projectId: "qr-id-system-34cec",
  storageBucket: "qr-id-system-34cec.firebasestorage.app",
  messagingSenderId: "373142412871",
  appId: "1:373142412871:web:6d6c49b098a9e4a0389b62",
  measurementId: "G-PX8PJ4FXCG"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const COLLECTION = "users";

// ── State ─────────────────────────────────────────────────────────────────────
var manual = [];
var lastGenerated = []; // [{name, email, firestoreId}]

// ── On page load: fetch saved users from Firestore ───────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  document.getElementById('mEmail').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addManual();
  });
  await loadFromFirestore();
});

async function loadFromFirestore() {
  showToast('⏳ Loading saved users...');
  try {
    var snapshot = await getDocs(collection(db, COLLECTION));
    var users = [];
    snapshot.forEach(function (docSnap) {
      var d = docSnap.data();
      users.push({ name: d.name, email: d.email, firestoreId: docSnap.id });
    });

    window.setDbStatus && window.setDbStatus(true);
    if (users.length > 0) {
      lastGenerated = users;
      renderResults(users);
      showToast('✅ ' + users.length + ' user' + (users.length !== 1 ? 's' : '') + ' loaded from database');
    } else {
      showToast('✅ Database connected — no users yet');
    }
  } catch (e) {
    window.setDbStatus && window.setDbStatus(false);
    showToast('⚠️ Could not connect to database');
    console.error(e);
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}
window.switchTab = switchTab;

// ── Manual list ───────────────────────────────────────────────────────────────
function addManual() {
  var n = document.getElementById('mName').value.trim();
  var e = document.getElementById('mEmail').value.trim();
  if (!n || !e) return;
  manual.push({ name: n, email: e });
  document.getElementById('mName').value = '';
  document.getElementById('mEmail').value = '';
  renderManual();
}
window.addManual = addManual;

function renderManual() {
  document.getElementById('manualList').innerHTML = manual.map(function (u, i) {
    return '<div class="m-item">' +
      '<div><div class="m-name">' + h(u.name) + '</div><div class="m-email">' + h(u.email) + '</div></div>' +
      '<button class="m-rm" onclick="removeManual(' + i + ')">×</button>' +
      '</div>';
  }).join('');
}

function removeManual(i) {
  manual.splice(i, 1);
  renderManual();
}
window.removeManual = removeManual;

// ── Parse bulk textarea ───────────────────────────────────────────────────────
function parseBulk() {
  var raw = document.getElementById('bulkInput').value.trim();
  if (!raw) return [];
  return raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
    var p = l.split(/[,|\t]/).map(function (s) { return s.trim(); });
    return p.length >= 2 ? { name: p[0], email: p[1] } : null;
  }).filter(Boolean);
}

// ── Generate + Save to Firestore ──────────────────────────────────────────────
async function generateAll() {
  var newUsers = parseBulk().concat(manual);
  if (!newUsers.length) { alert('Please add at least one user.'); return; }

  showToast('⏳ Saving to database...');

  // Save each new user to Firestore
  var savedUsers = [];
  for (var i = 0; i < newUsers.length; i++) {
    var u = newUsers[i];
    try {
      var docRef = await addDoc(collection(db, COLLECTION), {
        name: u.name,
        email: u.email,
        createdAt: serverTimestamp()
      });
      savedUsers.push({ name: u.name, email: u.email, firestoreId: docRef.id });
    } catch (e) {
      console.error('Failed to save user:', u.name, e);
    }
  }

  // Merge with existing
  lastGenerated = lastGenerated.concat(savedUsers);

  // Clear inputs
  document.getElementById('bulkInput').value = '';
  manual = [];
  renderManual();

  renderResults(lastGenerated);
  showToast('✅ ' + savedUsers.length + ' user' + (savedUsers.length !== 1 ? 's' : '') + ' saved to database!');
}
window.generateAll = generateAll;

// ── Render both grids ─────────────────────────────────────────────────────────
function renderResults(users) {
  var grid = document.getElementById('cardsGrid');
  var profilesGrid = document.getElementById('profilesGrid');
  grid.innerHTML = '';
  profilesGrid.innerHTML = '';

  document.getElementById('results').style.display = 'block';
  document.getElementById('cntBadge').textContent = users.length + ' user' + (users.length !== 1 ? 's' : '');

  users.forEach(function (u, i) {
    var profileUrl = buildProfileUrl(u.name, u.email);
    var ini = u.name.split(/\s+/).slice(0, 2).map(function (w) { return w[0] ? w[0].toUpperCase() : ''; }).join('');
    var fid = u.firestoreId || '';

    // ── QR card ──
    var card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = (i * 0.04) + 's';
    card.innerHTML =
      '<div class="card-top-row">' +
        '<div class="c-av">' + ini + '</div>' +
        (fid ? '<button class="c-delete" onclick="deleteUser(\'' + fid + '\',this)" title="Delete user">🗑</button>' : '') +
      '</div>' +
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
    pc.style.animationDelay = (i * 0.04) + 's';
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

    // Mark QR wrap with the URL to generate lazily
    var qrEl = document.getElementById('qr-' + i);
    qrEl.dataset.url = profileUrl;
    qrEl.dataset.idx = i;
  });

  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  switchTab('qr');

  // Use IntersectionObserver to generate QR only when card is visible
  lazyGenerateQRCodes();
}

function lazyGenerateQRCodes() {
  var elements = document.querySelectorAll('.qr-wrap[data-url]');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          if (!el.dataset.generated) {
            el.dataset.generated = '1';
            new QRCode(el, {
              text: el.dataset.url, width: 110, height: 110,
              colorDark: '#3d2d8e', colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.H
            });
          }
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '200px' }); // start generating 200px before visible

    elements.forEach(function(el) { observer.observe(el); });
  } else {
    // Fallback: stagger generation with increasing delays
    elements.forEach(function(el, i) {
      (function(elem, delay) {
        setTimeout(function() {
          if (!elem.dataset.generated) {
            elem.dataset.generated = '1';
            new QRCode(elem, {
              text: elem.dataset.url, width: 110, height: 110,
              colorDark: '#3d2d8e', colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.H
            });
          }
        }, delay);
      })(el, i * 80);
    });
  }
}
window.lazyGenerateQRCodes = lazyGenerateQRCodes;

// ── Delete user from Firestore ────────────────────────────────────────────────
async function deleteUser(firestoreId, btn) {
  if (!confirm('Delete this user from the database?')) return;
  try {
    await deleteDoc(doc(db, COLLECTION, firestoreId));
    lastGenerated = lastGenerated.filter(function (u) { return u.firestoreId !== firestoreId; });
    renderResults(lastGenerated);
    showToast('🗑 User deleted from database');
  } catch (e) {
    showToast('⚠️ Could not delete user');
    console.error(e);
  }
}
window.deleteUser = deleteUser;

// ── URL builders ──────────────────────────────────────────────────────────────
function buildProfileUrl(name, email) {
  var base = window.location.href.replace('index.html', '').replace(/\/$/, '');
  return base + '/profile.html?' + new URLSearchParams({ name: name, email: email }).toString();
}

function buildQRPageUrl(name, email) {
  var base = window.location.href.replace('index.html', '').replace(/\/$/, '');
  return base + '/qr.html?' + new URLSearchParams({ name: name, email: email }).toString();
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
function cp(encoded) {
  navigator.clipboard.writeText(decodeURIComponent(encoded)).then(function () {
    showToast('✓ Copied to clipboard');
  });
}
window.cp = cp;

// ── Download single QR ────────────────────────────────────────────────────────
function dlQR(i, encodedName) {
  var name = decodeURIComponent(encodedName);
  var wrap = document.getElementById('qr-' + i);

  // If QR not yet generated (lazy), generate it now then download
  if (!wrap.dataset.generated && wrap.dataset.url) {
    wrap.dataset.generated = '1';
    new QRCode(wrap, {
      text: wrap.dataset.url, width: 110, height: 110,
      colorDark: '#3d2d8e', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
    // Wait a moment for canvas to render
    setTimeout(function() { doDownload(wrap, name); }, 300);
    return;
  }
  doDownload(wrap, name);
}

function doDownload(wrap, name) {
  var c = wrap.querySelector('canvas');
  if (!c) { showToast('QR not ready, try again'); return; }
  var a = document.createElement('a');
  a.download = name.replace(/\s+/g, '_') + '_QR.png';
  a.href = c.toDataURL('image/png');
  a.click();
}
window.dlQR = dlQR;

// ── Export Excel ──────────────────────────────────────────────────────────────
function exportExcel() {
  if (!lastGenerated.length) return;
  var wsData = [['Name', 'Email', 'QR Code']];
  lastGenerated.forEach(function (u) {
    var qrPageUrl = buildQRPageUrl(u.name, u.email);
    wsData.push([u.name, u.email, { f: 'HYPERLINK("' + qrPageUrl + '","📷 View & Download QR")' }]);
  });
  var ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 36 }, { wch: 28 }];
  var hStyle = { font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 }, fill: { patternType: 'solid', fgColor: { rgb: '3D2D8E' } }, alignment: { horizontal: 'center', vertical: 'center' } };
  ['A1', 'B1', 'C1'].forEach(function (c) { if (ws[c]) ws[c].s = hStyle; });
  lastGenerated.forEach(function (u, i) {
    var ref = 'C' + (i + 2);
    if (ws[ref]) ws[ref].s = { font: { color: { rgb: '0563C1' }, underline: true, name: 'Arial', sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' } };
  });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QR Codes');
  XLSX.writeFile(wb, 'QR_Users.xlsx');
  showToast('✅ Excel downloaded!');
}
window.exportExcel = exportExcel;

// ── Delete ALL users from Firestore ──────────────────────────────────────────
async function deleteAllUsers() {
  if (!lastGenerated.length) { showToast('No users to delete'); return; }
  if (!confirm('Are you sure you want to delete ALL ' + lastGenerated.length + ' users from the database? This cannot be undone.')) return;

  showToast('⏳ Deleting all users...');
  var failed = 0;

  for (var i = 0; i < lastGenerated.length; i++) {
    var fid = lastGenerated[i].firestoreId;
    if (fid) {
      try {
        await deleteDoc(doc(db, COLLECTION, fid));
      } catch (e) {
        failed++;
        console.error('Failed to delete:', fid, e);
      }
    }
  }

  lastGenerated = [];
  document.getElementById('cardsGrid').innerHTML = '';
  document.getElementById('profilesGrid').innerHTML = '';
  document.getElementById('cntBadge').textContent = '0 users';
  document.getElementById('results').style.display = 'none';

  if (failed === 0) {
    showToast('🗑 All users deleted from database');
  } else {
    showToast('⚠️ Done — ' + failed + ' failed to delete');
  }
}
window.deleteAllUsers = deleteAllUsers;

// ── Clear local inputs only (does NOT delete from Firestore) ──────────────────
function clearAll() {
  manual = [];
  renderManual();
  document.getElementById('bulkInput').value = '';
}
window.clearAll = clearAll;

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2500);
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function h(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
