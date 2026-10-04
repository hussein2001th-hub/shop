const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.hide();

let userCurrency = localStorage.getItem("appCurrency") || "دينار";
document.getElementById("currency-selector").value = userCurrency;
document.getElementById("currency-label").innerText = userCurrency;

function changeCurrency(val) {
  userCurrency = val;
  localStorage.setItem("appCurrency", val);
  document.getElementById("currency-label").innerText = val;
  renderCustomers();
}

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
  document.getElementById('greeting').innerText = 'أهلاً ' + tg.initDataUnsafe.user.first_name;
}

// ================= SUPABASE CONFIG =================
const SUPABASE_URL = 'https://seeiuejrloeanylsoziy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Qk2n6skDAtljJ_DGy6Aqww_cEIi6q53';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatMoney(amount) { return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function getInitials(name) { return name.substring(0, 1).toUpperCase(); }

function switchTab(tabId) {
  document.getElementById('tab-home').classList.remove('active');
  document.getElementById('tab-settings').classList.remove('active');
  document.getElementById('nav-home').classList.remove('active');
  document.getElementById('nav-settings').classList.remove('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`nav-${tabId}`).classList.add('active');
  tg.HapticFeedback.selectionChanged();
}

let allCustomers = [];

async function loadCustomers() {
  supabase
    .channel('public:customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchAllCustomers)
    .subscribe();
  fetchAllCustomers();
}

async function fetchAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    alert("خطأ في جلب البيانات: " + error.message);
    document.getElementById("customers-list").innerHTML = `<div class="text-center py-10 text-red-500 font-bold">خطأ في الاتصال بقاعدة البيانات</div>`;
    return;
  }
  
  allCustomers = data || [];
  let totalDebt = allCustomers.reduce((sum, c) => sum + parseFloat(c.balance || 0), 0);
  
  document.getElementById("total-debt").innerText = formatMoney(totalDebt);
  document.getElementById("stats-count").innerText = allCustomers.length;
  renderCustomers();
}

function renderCustomers() {
  const listDiv = document.getElementById("customers-list");
  listDiv.innerHTML = "";
  
  const searchTerm = document.getElementById("search-input").value.trim().toLowerCase();
  const filtered = allCustomers.filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm));

  if (filtered.length === 0) {
    listDiv.innerHTML = `<div class="text-center py-10 opacity-50"><p class="font-bold">لا يوجد بيانات</p></div>`;
    return;
  }

  filtered.forEach((data) => {
    const isDebt = data.balance > 0;
    const statusText = isDebt ? "عليه دين" : "الحساب خالص";
    const statusColor = isDebt ? "var(--danger)" : "var(--success)";
    
    let dateString = "غير معروف";
    if (data.updated_at) {
      const d = new Date(data.updated_at);
      dateString = d.toLocaleDateString('ar-IQ') + ' ' + d.toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'});
    }

    listDiv.innerHTML += `
      <div class="customer-card relative">
        <button onclick="deleteCustomer('${data.id}', '${data.name}')" class="absolute top-3 left-3 text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-full transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
        <div class="flex items-center gap-4 mt-2">
          <div class="avatar ${isDebt ? 'avatar-debt' : 'avatar-clear'} flex-none">${getInitials(data.name)}</div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-lg truncate">${data.name}</h3>
            <p class="text-sm opacity-60 font-medium font-mono" dir="ltr" style="text-align: right;">${data.phone}</p>
          </div>
          <div class="text-left flex-none pl-6">
            <span class="block font-bold text-xl currency" style="color: ${statusColor}">${formatMoney(data.balance)}</span>
            <span class="text-xs opacity-60 font-medium">${statusText}</span>
          </div>
        </div>
        <div class="mt-3 text-[11px] text-gray-400 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          آخر تحديث: ${dateString}
        </div>
        <div class="btn-group mt-2">
          <button class="action-btn btn-debt" onclick="openActionSheet('${data.id}', ${data.balance}, 'add')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            دين
          </button>
          <button class="action-btn btn-pay" onclick="openActionSheet('${data.id}', ${data.balance}, 'pay')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            تسديد
          </button>
          <button class="action-btn btn-history" onclick="openHistorySheet('${data.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            كشف
          </button>
        </div>
      </div>
    `;
  });
}

let currentDocId = '';
let currentBalance = 0;
let currentAction = '';

function closeSheet() {
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('action-sheet').classList.remove('active');
  document.getElementById('customer-sheet').classList.remove('active');
  document.getElementById('history-sheet').classList.remove('active');
  document.getElementById('amount-input').value = '';
  document.getElementById('cust-name').value = '';
  document.getElementById('cust-phone').value = '';
  document.getElementById('cust-initial-debt').value = '';
}

function openActionSheet(id, balance, action) {
  tg.HapticFeedback.selectionChanged();
  currentDocId = id; currentBalance = parseFloat(balance); currentAction = action;
  
  const title = action === 'add' ? '➕ إضافة دين جديد' : '➖ تسديد دفعة من الحساب';
  const btnColor = action === 'add' ? 'var(--danger)' : 'var(--success)';
  
  document.getElementById('sheet-title').innerText = title;
  document.getElementById('sheet-title').style.color = btnColor;
  document.getElementById('submit-action-btn').style.backgroundColor = btnColor;
  
  document.getElementById('overlay').classList.add('active');
  document.getElementById('action-sheet').classList.add('active');
  setTimeout(() => document.getElementById('amount-input').focus(), 300);
}

async function submitAction() {
  const amount = parseFloat(document.getElementById('amount-input').value);
  if (isNaN(amount) || amount <= 0) {
    tg.HapticFeedback.notificationOccurred('error'); return alert('أدخل مبلغاً صحيحاً!');
  }
  tg.HapticFeedback.impactOccurred('medium');
  
  const btn = document.getElementById('submit-action-btn');
  const originalText = btn.innerText;
  btn.innerText = 'جاري التحميل...';
  btn.style.opacity = '0.7';
  btn.disabled = true;

  let newBal = currentAction === 'add' ? currentBalance + amount : currentBalance - amount;
  
  const newTransaction = { type: currentAction, amount: amount, date: new Date().toISOString() };
  const customer = allCustomers.find(c => c.id === currentDocId);
  const updatedHistory = [...(customer.history || []), newTransaction];

  const { error } = await supabase.from('customers').update({ balance: newBal, history: updatedHistory }).eq('id', currentDocId);

  btn.innerText = originalText;
  btn.style.opacity = '1';
  btn.disabled = false;

  if (error) {
    alert("خطأ: " + error.message);
  } else {
    tg.HapticFeedback.notificationOccurred('success');
    closeSheet();
  }
}

function openHistorySheet(id) {
  tg.HapticFeedback.selectionChanged();
  const customer = allCustomers.find(c => c.id === id);
  document.getElementById('history-name').innerText = customer.name;
  
  const listDiv = document.getElementById('history-list');
  listDiv.innerHTML = '';
  
  if (!customer.history || customer.history.length === 0) {
    listDiv.innerHTML = '<p class="text-center text-sm opacity-50 py-4">لا يوجد كشف حساب حالياً.</p>';
  } else {
    const sortedHistory = [...customer.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedHistory.forEach(tx => {
      const isAdd = tx.type === 'add';
      const titleText = isAdd ? '➕ دين' : '➖ تسديد';
      const colorClass = isAdd ? 'text-red-500' : 'text-green-500';
      const d = new Date(tx.date);
      const dateStr = d.toLocaleDateString('ar-IQ') + ' ' + d.toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'});

      listDiv.innerHTML += `
        <div class="history-item">
          <div>
            <div class="font-bold text-sm ${colorClass}">${titleText}</div>
            <div class="history-date mt-1">${dateStr}</div>
          </div>
          <div class="font-bold text-base currency">${formatMoney(tx.amount)} ${userCurrency}</div>
        </div>
      `;
    });
  }
  document.getElementById('overlay').classList.add('active');
  document.getElementById('history-sheet').classList.add('active');
}

function openAddCustomerSheet() {
  tg.HapticFeedback.selectionChanged();
  document.getElementById('overlay').classList.add('active');
  document.getElementById('customer-sheet').classList.add('active');
  setTimeout(() => document.getElementById('cust-name').focus(), 300);
}

async function submitNewCustomer() {
  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const debtInput = document.getElementById('cust-initial-debt');
  const name = nameInput.value;
  const phone = phoneInput.value;
  let initialDebt = parseFloat(debtInput.value);
  if (isNaN(initialDebt) || initialDebt < 0) initialDebt = 0;
  
  if (!name || !phone) {
    tg.HapticFeedback.notificationOccurred('error'); return alert('الرجاء كتابة الاسم والرقم!');
  }
  tg.HapticFeedback.impactOccurred('medium');
  
  const btn = document.querySelector('#customer-sheet .btn-submit');
  const originalText = btn.innerText;
  btn.innerText = 'جاري التحميل...';
  btn.style.opacity = '0.7';
  btn.disabled = true;

  // إعداد كشف الحساب إذا كان هناك دين أولي
  let historyArray = [];
  if (initialDebt > 0) {
    historyArray.push({
      type: 'add',
      amount: initialDebt,
      date: new Date().toISOString()
    });
  }

  const { error } = await supabase.from('customers').insert([{ 
    name: name, 
    phone: phone, 
    balance: initialDebt, 
    history: historyArray 
  }]);

  btn.innerText = originalText;
  btn.style.opacity = '1';
  btn.disabled = false;

  if (error) {
    alert("خطأ: " + error.message);
  } else {
    tg.HapticFeedback.notificationOccurred('success');
    // تصفير الحقول فقط والبقاء في نفس النافذة لإضافة شخص آخر
    nameInput.value = '';
    phoneInput.value = '';
    debtInput.value = '';
    nameInput.focus(); // إعادة المؤشر لكتابة اسم جديد
  }
}

async function deleteCustomer(id, name) {
  tg.HapticFeedback.notificationOccurred('warning');
  if (confirm(`هل أنت متأكد من حذف الزبون "${name}" نهائياً من الدفتر؟`)) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) alert("خطأ في الحذف: " + error.message);
    else tg.HapticFeedback.notificationOccurred('success');
  }
}

loadCustomers();
