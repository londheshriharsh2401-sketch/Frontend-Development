const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
// Updated to include Lane 5
const lanes = [1, 2, 3, 4, 5]; 
let selected = null;
let filter = 'All';
let laneFilter = 'All';
let timerInterval = null;
let generatedOtp = null;
let foundUserRecord = null;

// Clean expired bookings from localStorage automatically
function cleanupExpiredRegistrations() {
  const regs = JSON.parse(localStorage.getItem('mallpark_regs_v3') || '[]');
  const now = Date.now();
  const validRegs = regs.filter(r => (now - r.time) < SIX_HOURS_MS);

  if (validRegs.length !== regs.length) {
    localStorage.setItem('mallpark_regs_v3', JSON.stringify(validRegs));
    refreshSlotsFromStorage();
    render();
    loadRegs();
  }
}

setInterval(cleanupExpiredRegistrations, 10000);

// Mall Guide Functions
function openMallGuide() {
  const modal = document.getElementById('mallGuideModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    switchCategory('all');
  }
}

function closeMallGuide() {
  const modal = document.getElementById('mallGuideModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
}

function switchCategory(cat) {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    if (btn.dataset.cat === cat) {
      btn.className = 'cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-sm shrink-0';
    } else {
      btn.className = 'cat-btn px-4 py-2 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 shrink-0';
    }
  });

  document.querySelectorAll('.guide-sec').forEach(sec => {
    if (cat === 'all' || sec.id === `sec-${cat}`) {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  });
}

// Generate slot data
function genSlots() {
  cleanupExpiredRegistrations();
  const data = [];
  const regs = JSON.parse(localStorage.getItem('mallpark_regs_v3') || '[]');
  const activeOccupiedSlots = new Set(regs.map(r => r.slot));

  lanes.forEach(l => {
    for (let i = 1; i <= 5; i++) { 
      const id = `L${l}-B${String(i).padStart(2, '0')}`;
      data.push({ id, lane: l, type: '2W', zone: 'B', num: i, occupied: activeOccupiedSlots.has(id) });
    }
    for (let i = 1; i <= 15; i++) { 
      const id = `L${l}-A${String(i).padStart(2, '0')}`;
      data.push({ id, lane: l, type: '4W', zone: 'A', num: i, occupied: activeOccupiedSlots.has(id) });
    }
  });
  return data;
}

let allSlots = genSlots();

function refreshSlotsFromStorage() {
  allSlots = genSlots();
}

// Render Parking Grid Layout
function render() {
  const container = document.getElementById('lanesContainer');
  if (!container) return;
  container.innerHTML = '';

  lanes.forEach(l => {
    if (laneFilter !== 'All' && String(l) !== laneFilter) return;
    
    let laneSlots = allSlots.filter(s => s.lane === l);
    if (filter !== 'All') laneSlots = laneSlots.filter(s => s.type === filter);

    const laneDiv = document.createElement('div');
    laneDiv.className = 'flex gap-2 items-center p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-inner overflow-x-auto no-scrollbar';

    const label = document.createElement('div');
    label.className = 'sticky left-0 z-10 w-[68px] shrink-0 h-[56px] rounded-xl bg-slate-700 border border-slate-600 grid place-items-center text-[11px] font-bold shadow-md text-white text-center';
    const count2W = allSlots.filter(s => s.lane === l && s.type === '2W' && !s.occupied).length;
    const count4W = allSlots.filter(s => s.lane === l && s.type === '4W' && !s.occupied).length;
    
    // Check if Lane 3 (EV Dedicated)
    const evTag = l === 3 ? '<br><span class="text-[7px] text-emerald-400 font-bold uppercase">⚡ EV Zone</span>' : '';
    label.innerHTML = `Lane ${l}${evTag}<br><span class="text-[8px] font-medium text-amber-300">${count2W} 2W • ${count4W} 4W</span>`;
    laneDiv.appendChild(label);

    const zone2W = document.createElement('div');
    zone2W.className = 'flex gap-1.5 items-center p-2 rounded-xl bg-amber-950/40 border border-amber-500/30';
    const z2 = document.createElement('span'); 
    z2.className = 'text-[9px] font-bold text-amber-400 px-1 uppercase tracking-wider'; 
    z2.textContent = '2W'; 
    zone2W.appendChild(z2);

    const zone4W = document.createElement('div');
    zone4W.className = 'flex gap-1.5 items-center p-2 rounded-xl bg-sky-950/40 border border-sky-500/30';
    const z4 = document.createElement('span'); 
    z4.className = 'text-[9px] font-bold text-sky-400 px-1 uppercase tracking-wider'; 
    z4.textContent = '4W'; 
    zone4W.appendChild(z4);

    laneSlots.filter(s => s.type === '2W').forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `w-8 h-8 rounded-[8px] border text-[9px] font-bold grid place-items-center transition ${
        s.occupied 
          ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-50' 
          : 'bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:bg-amber-50 hover:shadow'
      } ${selected && selected.id === s.id ? '!bg-indigo-600 !text-white !border-indigo-500 ring-2 ring-indigo-400' : ''}`;
      b.innerHTML = s.zone + String(s.num).padStart(2, '0');
      b.title = `${s.id} • ${s.occupied ? 'Occupied' : 'Vacant'}`;
      if (!s.occupied) b.onclick = () => selectSlot(s);
      zone2W.appendChild(b);
    });

    laneSlots.filter(s => s.type === '4W').forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `w-9 h-11 rounded-[8px] border text-[9px] font-bold flex flex-col items-center justify-center transition ${
        s.occupied 
          ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-50' 
          : 'bg-white text-slate-800 border-sky-200 hover:border-sky-400 hover:bg-sky-50 hover:shadow'
      } ${selected && selected.id === s.id ? '!bg-indigo-600 !text-white !border-indigo-500 ring-2 ring-indigo-400' : ''}`;
      b.innerHTML = `<span>${s.zone}${String(s.num).padStart(2, '0')}</span><span class="text-[7px] opacity-60">4W</span>`;
      b.title = `${s.id} • ${s.occupied ? 'Occupied' : 'Vacant'}`;
      if (!s.occupied) b.onclick = () => selectSlot(s);
      zone4W.appendChild(b);
    });

    laneDiv.appendChild(zone2W);
    const divider = document.createElement('div'); 
    divider.className = 'w-px h-10 bg-slate-700/80 self-center mx-1'; 
    laneDiv.appendChild(divider);
    laneDiv.appendChild(zone4W);
    container.appendChild(laneDiv);
  });
}

function selectSlot(s) {
  selected = s;
  document.getElementById('selectedInfo').innerHTML = `<p class="font-bold text-slate-800 text-[14px]">${s.id}</p><p class="text-[12px] text-indigo-600 font-semibold">${s.type} • Lane ${s.lane}</p>`;
  document.getElementById('slotInput').value = s.id;
  document.getElementById('vType').value = s.type;
  render(); 
  toast(`Selected ${s.id} (${s.type})`);
}

function toast(msg) {
  const t = document.getElementById('toast'); 
  if (t) {
    t.textContent = msg; 
    t.style.opacity = '1'; 
    setTimeout(() => t.style.opacity = '0', 2200);
  }
}

// Load Active Registrations
function loadRegs() {
  cleanupExpiredRegistrations();
  const regs = JSON.parse(localStorage.getItem('mallpark_regs_v3') || '[]');
  const list = document.getElementById('regList');
  if (!list) return;

  if (!regs.length) {
    list.innerHTML = '<p class="text-slate-400 py-6 text-center">No active registrations yet.</p>'; 
    return;
  }

  const now = Date.now();
  list.innerHTML = regs.slice().reverse().map(r => {
    const timeLeft = Math.max(0, SIX_HOURS_MS - (now - r.time));
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `<div class="flex justify-between items-center p-3 rounded-2xl border border-slate-200 bg-slate-50/80 hover:border-slate-300 transition">
      <div>
        <p class="font-bold text-slate-800">${r.name} • <span class="text-indigo-600">${r.slot}</span></p>
        <p class="text-[11px] text-slate-500">${r.vehNo} • ${r.type} • Mobile: ${r.mobile.slice(0,3)}*****${r.mobile.slice(-2)}</p>
      </div>
      <div class="text-right">
        <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] block">Active</span>
        <span class="text-[10px] text-amber-600 font-semibold">${hoursLeft}h ${minsLeft}m left</span>
      </div>
    </div>`;
  }).join('');
}

// QR Code Modal Timer
function showQrModal(passCode, slot, vehNo, startTime) {
  document.getElementById('qrModal').classList.remove('hidden');

  const qrContainer = document.getElementById('qrcodeCanvas');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: passCode,
    width: 140,
    height: 140
  });

  document.getElementById('modalPassCode').textContent = passCode;
  document.getElementById('modalSlotDetails').textContent = `Slot: ${slot} • Vehicle: ${vehNo}`;

  startSixHourTimer(startTime);
}

function startSixHourTimer(startTime) {
  if (timerInterval) clearInterval(timerInterval);

  function update() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, SIX_HOURS_MS - elapsed);

    const h = Math.floor(remaining / (1000 * 60 * 60));
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((remaining % (1000 * 60)) / 1000);

    document.getElementById('qrTimer').textContent = 
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      document.getElementById('qrTimer').textContent = "EXPIRED";
    }
  }

  update();
  timerInterval = setInterval(update, 1000);
}

function closeQrModal() {
  document.getElementById('qrModal').classList.add('hidden');
  if (timerInterval) clearInterval(timerInterval);
}

// Vacate Parking Slot
function vacatePosition(queryCode) {
  const code = queryCode.trim().toUpperCase();
  if (!code) {
    showExitMessage('Please enter a Pass Code or Slot ID.', false);
    return;
  }

  let regs = JSON.parse(localStorage.getItem('mallpark_regs_v3') || '[]');
  const index = regs.findIndex(r => (r.passCode && r.passCode.toUpperCase() === code) || r.slot.toUpperCase() === code);

  if (index !== -1) {
    const record = regs[index];
    const freedSlot = record.slot;

    regs.splice(index, 1);
    localStorage.setItem('mallpark_regs_v3', JSON.stringify(regs));

    refreshSlotsFromStorage();
    render();
    loadRegs();

    showExitMessage(` Exit Gate Opened! Position <strong>${freedSlot}</strong> vacated for ${record.name} (${record.vehNo}).`, true);
    toast(`Slot ${freedSlot} vacated successfully`);
    document.getElementById('exitPassCode').value = '';
  } else {
    showExitMessage(` No active reservation found for "<strong>${code}</strong>".`, false);
  }
}

function showExitMessage(msg, isSuccess) {
  const el = document.getElementById('exitMsg');
  el.innerHTML = msg;
  el.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-rose-50', 'text-rose-700', 'border-rose-200');
  
  if (isSuccess) {
    el.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
  } else {
    el.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-200');
  }
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  render();
  loadRegs();

  // Navigation & Mall Guide Trigger
  document.getElementById('navMallGuideBtn')?.addEventListener('click', openMallGuide);
  document.getElementById('closeMallGuideBtn')?.addEventListener('click', closeMallGuide);

  // Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.className = 'filter-btn px-3 h-7 rounded-full text-slate-600 hover:text-slate-900'); 
      btn.className = 'filter-btn px-3 h-7 rounded-full bg-white text-slate-800 shadow-sm border border-slate-200 font-semibold'; 
      filter = btn.dataset.f; 
      render();
    }
  });

  document.getElementById('laneSelect').onchange = e => {
    laneFilter = e.target.value; 
    render();
  };

  document.getElementById('goRegister')?.addEventListener('click', () => {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Mall Directory Tab Switching
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => switchCategory(btn.dataset.cat));
  });

  // Registration Form
  document.getElementById('regForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const vehNo = document.getElementById('vehNo').value.trim();
    const type = document.getElementById('vType').value;
    const slot = document.getElementById('slotInput').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (!name) { toast('Please enter your full name'); return; }
    if (!slot) { toast('Select a slot from layout grid'); return; }
    if (!mobile || !vehNo) { toast('Fill mobile and vehicle number'); return; }
    
    const passCode = 'MP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const regTime = Date.now();
    const regs = JSON.parse(localStorage.getItem('mallpark_regs_v3') || '[]');
    regs.push({ name, mobile, vehNo, type, slot, email, passCode, time: regTime });
    localStorage.setItem('mallpark_regs_v3', JSON.stringify(regs));
    
    refreshSlotsFromStorage();
    selected = null;
    
    showQrModal(passCode, slot, vehNo, regTime);

    e.target.reset(); 
    document.getElementById('slotInput').value = '';
    document.getElementById('selectedInfo').innerHTML = '<p class="text-[13px] text-slate-500">No slot selected — tap a white slot from the layout grid.</p>';
    render(); 
    loadRegs();
  });

  // QR Modal Action Buttons
  document.getElementById('modalGuideBtn')?.addEventListener('click', () => {
    closeQrModal();
    document.getElementById('guidePromptModal').classList.remove('hidden');
  });

  document.getElementById('modalDoneBtn')?.addEventListener('click', closeQrModal);

  document.getElementById('promptNoBtn')?.addEventListener('click', () => {
    document.getElementById('guidePromptModal').classList.add('hidden');
  });

  document.getElementById('promptYesBtn')?.addEventListener('click', () => {
    document.getElementById('guidePromptModal').classList.add('hidden');
    openMallGuide();
  });

  // Forgot Code Modals Trigger
  const openForgot = () => {
    document.getElementById('forgotModal').classList.remove('hidden');
    document.getElementById('otpStep1').classList.remove('hidden');
    document.getElementById('otpStep2').classList.add('hidden');
    document.getElementById('otpStep3').classList.add('hidden');
    document.getElementById('forgotMobileInput').value = '';
  };

  document.getElementById('forgotPassLink1')?.addEventListener('click', openForgot);
  document.getElementById('forgotPassLink2')?.addEventListener('click', openForgot);
  document.getElementById('forgotPassLink3')?.addEventListener('click', openForgot);

  document.getElementById('closeForgotModalBtn')?.addEventListener('click', () => {
    document.getElementById('forgotModal').classList.add('hidden');
  });

  document.getElementById('closeForgotStep3Btn')?.addEventListener('click', () => {
    document.getElementById('forgotModal').classList.add('hidden');
  });

  document.getElementById('sendOtpBtn')?.addEventListener('click', () => {
    const mob = document.getElementById('forgotMobileInput').value.trim();
    if (!mob) { toast('Enter registered mobile number'); return; }

    const regs = JSON.parse(localStorage.getItem('mallpark_regs_v3') || '[]');
    foundUserRecord = regs.find(r => r.mobile === mob);

    if (!foundUserRecord) {
      toast('No active reservation found for this mobile');
      return;
    }

    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    document.getElementById('simulatedOtp').textContent = 'OTP: ' + generatedOtp;
    
    document.getElementById('otpStep1').classList.add('hidden');
    document.getElementById('otpStep2').classList.remove('hidden');
    toast('OTP SMS sent to ' + mob);
  });

  document.getElementById('verifyOtpBtn')?.addEventListener('click', () => {
    const enteredOtp = document.getElementById('otpInput').value.trim();
    if (enteredOtp !== generatedOtp) {
      toast('Invalid OTP code. Try again.');
      return;
    }

    document.getElementById('recoveredPassCode').textContent = foundUserRecord.passCode;
    document.getElementById('recoveredSlot').textContent = `Slot: ${foundUserRecord.slot} • ${foundUserRecord.name}`;
    
    document.getElementById('otpStep2').classList.add('hidden');
    document.getElementById('otpStep3').classList.remove('hidden');
  });

  // Exit Gate Actions
  document.getElementById('btnVacateByCode')?.addEventListener('click', () => {
    const inputVal = document.getElementById('exitPassCode').value;
    vacatePosition(inputVal);
  });

  // QR Image Reader File Input
  document.getElementById('qrFileInput')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qrReaderHidden");
    html5QrCode.scanFile(file, true)
      .then(decodedText => vacatePosition(decodedText))
      .catch(() => showExitMessage('Unable to read QR code from image. Try entering the Pass Code/Slot ID.', false));
  });
});