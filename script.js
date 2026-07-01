// ---------- STORAGE ----------
const STORAGE_KEY = 'qwi_bills';
const COUNTER_KEY = 'qwi_invoice_counter';

function getBills() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveBills(bills) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

function getNextInvoiceNumber() {
    let counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
    counter += 1;
    localStorage.setItem(COUNTER_KEY, counter);
    return 'QWI-' + String(counter).padStart(4, '0');
}

function peekInvoiceNumber() {
    let counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
    return 'QWI-' + String(counter + 1).padStart(4, '0');
}

// ---------- NAVIGATION ----------
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

function showView(id) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    navButtons.forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-btn[data-view="${id}"]`);
    if (navBtn) navBtn.classList.add('active');
}

navButtons.forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
});

document.getElementById('newBillBtn').addEventListener('click', () => {
    resetForm();
    showView('billForm');
});

// ---------- SERVICES TABLE ----------
let serviceCounter = 0;
const servicesBody = document.getElementById('servicesBody');

function addServiceRow(data) {
    serviceCounter++;
    const row = document.createElement('tr');
    row.dataset.id = serviceCounter;
    row.innerHTML = `
    <td><input type="text" class="svc-name" value="${data?.name || ''}" required></td>
    <td><input type="text" class="svc-desc" value="${data?.desc || ''}"></td>
    <td><input type="number" class="svc-qty qty-input" min="1" value="${data?.qty || 1}"></td>
    <td><input type="number" class="svc-price price-input" min="0" value="${data?.price || 0}"></td>
    <td class="svc-amount">₹0</td>
    <td><button type="button" class="btn danger remove-service">✕</button></td>
  `;
    servicesBody.appendChild(row);
    updateRowAmount(row);
    attachRowEvents(row);
}

function attachRowEvents(row) {
    row.querySelector('.svc-qty').addEventListener('input', () => {
        updateRowAmount(row);
        calculateTotals();
    });
    row.querySelector('.svc-price').addEventListener('input', () => {
        updateRowAmount(row);
        calculateTotals();
    });
    row.querySelector('.remove-service').addEventListener('click', () => {
        row.remove();
        calculateTotals();
    });
}

function updateRowAmount(row) {
    const qty = parseFloat(row.querySelector('.svc-qty').value) || 0;
    const price = parseFloat(row.querySelector('.svc-price').value) || 0;
    const amount = qty * price;
    row.querySelector('.svc-amount').textContent = '₹' + amount.toFixed(2);
}

document.getElementById('addServiceBtn').addEventListener('click', () => addServiceRow());

// ---------- CALCULATIONS ----------
function calculateTotals() {
    let subtotal = 0;
    document.querySelectorAll('#servicesBody tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.svc-qty').value) || 0;
        const price = parseFloat(row.querySelector('.svc-price').value) || 0;
        subtotal += qty * price;
    });

    let discount = parseFloat(document.getElementById('discount').value) || 0;
    if (discount < 0) discount = 0;
    if (discount > subtotal) discount = subtotal;

    const gstPercent = parseFloat(document.getElementById('gstPercent').value) || 0;
    const taxableAmount = subtotal - discount;
    const gstAmount = (taxableAmount * gstPercent) / 100;
    const grandTotal = taxableAmount + gstAmount;

    let advance = parseFloat(document.getElementById('advancePaid').value) || 0;
    if (advance < 0) advance = 0;
    if (advance > grandTotal) {
        advance = grandTotal;
        document.getElementById('advancePaid').value = advance.toFixed(2);
    }

    const pending = grandTotal - advance;

    document.getElementById('sumSubtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('sumDiscount').textContent = '₹' + discount.toFixed(2);
    document.getElementById('sumGst').textContent = '₹' + gstAmount.toFixed(2);
    document.getElementById('sumGrandTotal').textContent = '₹' + grandTotal.toFixed(2);
    document.getElementById('sumAdvance').textContent = '₹' + advance.toFixed(2);
    document.getElementById('sumPending').textContent = '₹' + pending.toFixed(2);

    return { subtotal, discount, gstPercent, gstAmount, grandTotal, advance, pending };
}

['discount', 'gstPercent', 'advancePaid'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateTotals);
});

// ---------- FORM RESET ----------
function resetForm() {
    document.getElementById('invoiceForm').reset();
    document.getElementById('billId').value = '';
    servicesBody.innerHTML = '';
    addServiceRow();
    document.getElementById('invoiceNumber').value = peekInvoiceNumber();
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('formTitle').textContent = 'Create New Bill';
    document.getElementById('discount').value = 0;
    document.getElementById('gstPercent').value = 18;
    document.getElementById('advancePaid').value = 0;
    calculateTotals();
}

document.getElementById('resetFormBtn').addEventListener('click', resetForm);

// ---------- SAVE / UPDATE ----------
document.getElementById('invoiceForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const serviceRows = document.querySelectorAll('#servicesBody tr');
    if (serviceRows.length === 0) {
        alert('Please add at least one service.');
        return;
    }

    const services = [];
    let valid = true;
    serviceRows.forEach(row => {
        const name = row.querySelector('.svc-name').value.trim();
        const desc = row.querySelector('.svc-desc').value.trim();
        const qty = parseFloat(row.querySelector('.svc-qty').value) || 0;
        const price = parseFloat(row.querySelector('.svc-price').value) || 0;
        if (!name || qty <= 0 || price < 0) { valid = false; }
        services.push({ name, desc, qty, price, amount: qty * price });
    });

    if (!valid) {
        alert('Please fill all service fields correctly (name required, qty > 0, price >= 0).');
        return;
    }

    const totals = calculateTotals();
    const billId = document.getElementById('billId').value;
    const isEdit = !!billId;

    const bill = {
        id: isEdit ? billId : 'bill_' + Date.now(),
        invoiceNumber: isEdit ? document.getElementById('invoiceNumber').value : getNextInvoiceNumber(),
        customerName: document.getElementById('customerName').value.trim(),
        customerPhone: document.getElementById('customerPhone').value.trim(),
        customerEmail: document.getElementById('customerEmail').value.trim(),
        companyName: document.getElementById('companyName').value.trim(),
        customerGst: document.getElementById('customerGst').value.trim(),
        customerAddress: document.getElementById('customerAddress').value.trim(),
        invoiceDate: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        paymentStatus: document.getElementById('paymentStatus').value,
        paymentMode: document.getElementById('paymentMode').value,
        services: services,
        discount: totals.discount,
        gstPercent: totals.gstPercent,
        gstAmount: totals.gstAmount,
        subtotal: totals.subtotal,
        grandTotal: totals.grandTotal,
        advancePaid: totals.advance,
        pending: totals.pending,
        notes: document.getElementById('notes').value.trim(),
        terms: document.getElementById('terms').value.trim(),
        createdAt: isEdit ? undefined : new Date().toISOString()
    };

    let bills = getBills();

    if (isEdit) {
        const index = bills.findIndex(b => b.id === billId);
        if (index !== -1) {
            bill.createdAt = bills[index].createdAt;
            bills[index] = bill;
        }
    } else {
        bills.unshift(bill);
    }

    saveBills(bills);
    renderDashboard();
    renderAllBills();
    openInvoiceView(bill.id);
});

// ---------- RENDER DASHBOARD ----------
function statusBadge(status) {
    return `<span class="badge ${status}">${status}</span>`;
}

function renderDashboard(filter = '') {
    const bills = getBills();
    const totalBills = bills.length;
    const totalRevenue = bills.reduce((s, b) => s + b.grandTotal, 0);
    const totalAdvance = bills.reduce((s, b) => s + b.advancePaid, 0);
    const totalPending = bills.reduce((s, b) => s + b.pending, 0);

    document.getElementById('statTotalBills').textContent = totalBills;
    document.getElementById('statTotalRevenue').textContent = '₹' + totalRevenue.toFixed(2);
    document.getElementById('statTotalAdvance').textContent = '₹' + totalAdvance.toFixed(2);
    document.getElementById('statTotalPending').textContent = '₹' + totalPending.toFixed(2);

    const filtered = filterBills(bills, filter).slice(0, 8);
    const tbody = document.getElementById('recentBillsBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);">No bills found.</td></tr>`;
        return;
    }

    filtered.forEach(bill => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${bill.invoiceNumber}</td>
      <td>${bill.customerName}</td>
      <td>${bill.invoiceDate}</td>
      <td>₹${bill.grandTotal.toFixed(2)}</td>
      <td>₹${bill.advancePaid.toFixed(2)}</td>
      <td>₹${bill.pending.toFixed(2)}</td>
      <td>${statusBadge(bill.paymentStatus)}</td>
      <td><button class="btn secondary view-bill" data-id="${bill.id}">View</button></td>
    `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.view-bill').forEach(btn => {
        btn.addEventListener('click', () => openInvoiceView(btn.dataset.id));
    });
}

function filterBills(bills, query) {
    if (!query) return bills;
    const q = query.toLowerCase();
    return bills.filter(b =>
        b.customerName.toLowerCase().includes(q) ||
        b.invoiceNumber.toLowerCase().includes(q) ||
        b.customerPhone.toLowerCase().includes(q) ||
        (b.companyName || '').toLowerCase().includes(q)
    );
}

document.getElementById('dashboardSearch').addEventListener('input', function() {
    renderDashboard(this.value);
});

// ---------- RENDER ALL BILLS ----------
function renderAllBills(filter = '') {
    const bills = getBills();
    const filtered = filterBills(bills, filter);
    const tbody = document.getElementById('allBillsBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);">No bills found.</td></tr>`;
        return;
    }

    filtered.forEach(bill => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${bill.invoiceNumber}</td>
      <td>${bill.customerName}</td>
      <td>${bill.customerPhone}</td>
      <td>${bill.companyName || '-'}</td>
      <td>${bill.invoiceDate}</td>
      <td>₹${bill.grandTotal.toFixed(2)}</td>
      <td>₹${bill.advancePaid.toFixed(2)}</td>
      <td>₹${bill.pending.toFixed(2)}</td>
      <td>${statusBadge(bill.paymentStatus)}</td>
      <td>
        <button class="btn secondary view-bill" data-id="${bill.id}">View</button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.view-bill').forEach(btn => {
        btn.addEventListener('click', () => openInvoiceView(btn.dataset.id));
    });
}

document.getElementById('allBillsSearch').addEventListener('input', function() {
    renderAllBills(this.value);
});

// ---------- INVOICE VIEW ----------
let currentBillId = null;

function openInvoiceView(id) {
    const bills = getBills();
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    currentBillId = id;

    document.getElementById('inv_number').textContent = 'Invoice #: ' + bill.invoiceNumber;
    document.getElementById('inv_date').textContent = 'Date: ' + bill.invoiceDate;
    document.getElementById('inv_due').textContent = 'Due: ' + bill.dueDate;

    document.getElementById('inv_customerName').textContent = bill.customerName;
    document.getElementById('inv_customerAddress').textContent = bill.customerAddress;
    document.getElementById('inv_customerPhone').textContent = 'Phone: ' + bill.customerPhone;
    document.getElementById('inv_customerEmail').textContent = bill.customerEmail ? 'Email: ' + bill.customerEmail : '';
    document.getElementById('inv_companyName').textContent = bill.companyName ? 'Company: ' + bill.companyName : '';
    document.getElementById('inv_customerGst').textContent = bill.customerGst ? 'GST: ' + bill.customerGst : '';

    document.getElementById('inv_status').textContent = bill.paymentStatus;
    document.getElementById('inv_mode').textContent = bill.paymentMode;

    const tbody = document.getElementById('inv_servicesBody');
    tbody.innerHTML = '';
    bill.services.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.desc || '-'}</td>
      <td>${s.qty}</td>
      <td>₹${s.price.toFixed(2)}</td>
      <td>₹${s.amount.toFixed(2)}</td>
    `;
        tbody.appendChild(tr);
    });

    document.getElementById('inv_subtotal').textContent = '₹' + bill.subtotal.toFixed(2);
    document.getElementById('inv_discount').textContent = '₹' + bill.discount.toFixed(2);
    document.getElementById('inv_gst').textContent = '₹' + bill.gstAmount.toFixed(2) + ' (' + bill.gstPercent + '%)';
    document.getElementById('inv_grandTotal').textContent = '₹' + bill.grandTotal.toFixed(2);
    document.getElementById('inv_advance').textContent = '₹' + bill.advancePaid.toFixed(2);
    document.getElementById('inv_pending').textContent = '₹' + bill.pending.toFixed(2);

    document.getElementById('inv_notes').textContent = bill.notes || '-';
    document.getElementById('inv_terms').textContent = bill.terms || '-';

    showView('invoiceView');
}

// ---------- EDIT ----------
document.getElementById('editBillBtn').addEventListener('click', () => {
    const bills = getBills();
    const bill = bills.find(b => b.id === currentBillId);
    if (!bill) return;

    document.getElementById('billId').value = bill.id;
    document.getElementById('invoiceNumber').value = bill.invoiceNumber;
    document.getElementById('customerName').value = bill.customerName;
    document.getElementById('customerPhone').value = bill.customerPhone;
    document.getElementById('customerEmail').value = bill.customerEmail;
    document.getElementById('companyName').value = bill.companyName;
    document.getElementById('customerGst').value = bill.customerGst;
    document.getElementById('customerAddress').value = bill.customerAddress;
    document.getElementById('invoiceDate').value = bill.invoiceDate;
    document.getElementById('dueDate').value = bill.dueDate;
    document.getElementById('paymentStatus').value = bill.paymentStatus;
    document.getElementById('paymentMode').value = bill.paymentMode;
    document.getElementById('discount').value = bill.discount;
    document.getElementById('gstPercent').value = bill.gstPercent;
    document.getElementById('advancePaid').value = bill.advancePaid;
    document.getElementById('notes').value = bill.notes;
    document.getElementById('terms').value = bill.terms;

    servicesBody.innerHTML = '';
    bill.services.forEach(s => addServiceRow({ name: s.name, desc: s.desc, qty: s.qty, price: s.price }));

    document.getElementById('formTitle').textContent = 'Edit Bill - ' + bill.invoiceNumber;
    calculateTotals();
    showView('billForm');
});

// ---------- DUPLICATE ----------
document.getElementById('duplicateBillBtn').addEventListener('click', () => {
    const bills = getBills();
    const bill = bills.find(b => b.id === currentBillId);
    if (!bill) return;

    const newBill = JSON.parse(JSON.stringify(bill));
    newBill.id = 'bill_' + Date.now();
    newBill.invoiceNumber = getNextInvoiceNumber();
    newBill.createdAt = new Date().toISOString();
    newBill.invoiceDate = new Date().toISOString().split('T')[0];

    bills.unshift(newBill);
    saveBills(bills);
    renderDashboard();
    renderAllBills();
    openInvoiceView(newBill.id);
});

// ---------- DELETE ----------
document.getElementById('deleteBillBtn').addEventListener('click', () => {
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) return;

    let bills = getBills();
    bills = bills.filter(b => b.id !== currentBillId);
    saveBills(bills);
    renderDashboard();
    renderAllBills();
    showView('dashboard');
});

// ---------- PRINT ----------
document.getElementById('printBillBtn').addEventListener('click', () => {
    window.print();
});

// ---------- PDF DOWNLOAD ----------
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    const element = document.getElementById('invoicePrintArea');
    const bills = getBills();
    const bill = bills.find(b => b.id === currentBillId);
    const filename = (bill ? bill.invoiceNumber : 'invoice') + '.pdf';

    html2canvas(element, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(filename);
    });
});

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
    resetForm();
    renderDashboard();
    renderAllBills();
    showView('dashboard');
});