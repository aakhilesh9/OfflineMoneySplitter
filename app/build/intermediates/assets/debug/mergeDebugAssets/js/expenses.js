function addPerson() {
    const input = document.getElementById("personName");
    const name = input.value.trim();
    if (name && !activeTrip.people.includes(name)) {
        activeTrip.people.push(name);
        save();
        renderAll();
        input.value = "";
    } else if (activeTrip.people.includes(name)) {
        alert("Already added.");
    }
}

function removePerson(name) {
    if (confirm(`Remove ${name}?`)) {
        activeTrip.people = activeTrip.people.filter(p => p !== name);
        save();
        renderAll();
    }
}

function renderPeople() {
    const list = document.getElementById("peopleList");
    list.innerHTML = activeTrip.people.map(p => `
        <div class="person-tag">
            ${p}
            <span onclick="removePerson('${p}')" style="cursor:pointer; color:var(--danger); font-weight:bold;">&times;</span>
        </div>
    `).join('');

    const payerSelect = document.getElementById("payer");
    const currentPayer = payerSelect.value;
    payerSelect.innerHTML = activeTrip.people.map(p => `<option value="${p}">${p}</option>`).join('');
    if (activeTrip.people.includes(currentPayer)) payerSelect.value = currentPayer;

    const involvedDiv = document.getElementById("involvedPeople");
    involvedDiv.innerHTML = activeTrip.people.map(p => `
        <div class="checkbox-item">
            <input type="checkbox" id="involved_${p}" checked onchange="renderSplit()">
            <label for="involved_${p}">${p}</label>
        </div>
    `).join('');
}

function renderSplit() {
    const mode = document.getElementById("splitMode").value;
    const div = document.getElementById("splitInputs");
    div.innerHTML = "";
    if (mode === "equal") return;

    activeTrip.people.forEach(p => {
        const isChecked = document.getElementById("involved_" + p).checked;
        if (!isChecked) return;

        const group = document.createElement("div");
        group.className = "input-group";
        group.innerHTML = `
            <label>${p}</label>
            <input type="number" id="split_${p}" placeholder="${
                mode === "percentage" ? "Percentage (%)" :
                mode === "ratio" ? "Ratio" : "Amount ("+activeTrip.currency+")"
            }">
        `;
        if (mode === "percentage") {
            group.querySelector('input').oninput = livePercentageCheck;
        }
        div.appendChild(group);
    });
}

function addExpense() {
    const category = document.getElementById("category").value.trim();
    const payer = document.getElementById("payer").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const mode = document.getElementById("splitMode").value;
    const date = document.getElementById("expenseDate").value || new Date().toISOString().split("T")[0];

    if (!category || !payer || isNaN(amount) || amount <= 0) {
        return alert("Please fill in category, payer, and a valid amount.");
    }

    const involved = activeTrip.people.filter(p => document.getElementById("involved_" + p).checked);
    if (involved.length === 0) return alert("Select involved people.");

    const splits = {};
    let totalInput = 0;

    if (mode === "equal") {
        const share = amount / involved.length;
        involved.forEach(p => splits[p] = share);
    } else {
        involved.forEach(p => {
            const val = parseFloat(document.getElementById("split_" + p).value) || 0;
            totalInput += val;
            if (mode === "percentage") splits[p] = (val / 100) * amount;
            else if (mode === "ratio") splits[p] = val;
            else splits[p] = val;
        });

        if (mode === "percentage" && Math.abs(totalInput - 100) > 0.01) return alert("Must total 100%");
        if (mode === "exact" && Math.abs(totalInput - amount) > 0.01) return alert(`Total mismatch!`);
        if (mode === "ratio") {
            if (totalInput === 0) return alert("Enter ratios.");
            involved.forEach(p => splits[p] = (splits[p] / totalInput) * amount);
        }
    }

    const expense = {
        category, payer, amount, splits, date,
        id: editIndex >= 0 ? activeTrip.expenses[editIndex].id : Date.now()
    };

    if (editIndex >= 0) {
        activeTrip.expenses[editIndex] = expense;
        editIndex = -1;
        document.getElementById("formTitle").innerText = "Add Expense";
        document.getElementById("submitExpense").innerText = "Add Expense";
        document.getElementById("cancelEdit").style.display = "none";
    } else {
        activeTrip.expenses.push(expense);
    }

    // Auto-sort by date
    activeTrip.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    save();
    renderAll();
    document.getElementById("category").value = "";
    document.getElementById("amount").value = "";
    if (typeof showTab === 'function') showTab('tab-history');
}

function editExpense(realIndex) {
    editIndex = realIndex;
    const e = activeTrip.expenses[realIndex];
    document.getElementById("formTitle").innerText = "Edit Expense";
    document.getElementById("submitExpense").innerText = "Update";
    document.getElementById("cancelEdit").style.display = "block";
    document.getElementById("category").value = e.category;
    document.getElementById("payer").value = e.payer;
    document.getElementById("amount").value = e.amount;
    document.getElementById("expenseDate").value = e.date;

    activeTrip.people.forEach(p => {
        document.getElementById("involved_" + p).checked = e.splits.hasOwnProperty(p);
    });

    document.getElementById("splitMode").value = "exact";
    renderSplit();
    Object.keys(e.splits).forEach(p => {
        if (document.getElementById("split_" + p)) {
            document.getElementById("split_" + p).value = e.splits[p].toFixed(2);
        }
    });

    if (typeof showTab === 'function') showTab('tab-expense');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteExpense(i) {
    if (confirm("Delete expense?")) {
        activeTrip.expenses.splice(i, 1);
        save();
        renderAll();
    }
}

function renderExpenses() {
    const search = document.getElementById("searchExpenses").value.toLowerCase();
    const div = document.getElementById("expenseList");

    let filtered = activeTrip.expenses;
    if (search) {
        filtered = activeTrip.expenses.filter(e => e.category.toLowerCase().includes(search) || e.payer.toLowerCase().includes(search));
    }

    if (filtered.length === 0) {
        div.innerHTML = "<p style='color:var(--text-muted)'>No expenses found.</p>";
        return;
    }

    // Group expenses by date
    const groups = {};
    filtered.forEach(e => {
        if (!groups[e.date]) groups[e.date] = [];
        groups[e.date].push(e);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    let html = "";
    sortedDates.forEach(date => {
        html += `<div style="padding: 0.5rem; background: #eef2ff; font-weight: bold; color: var(--primary); border-radius: 6px; margin: 1rem 0 0.5rem 0;">📅 ${date}</div>`;
        groups[date].forEach(e => {
            const realIndex = activeTrip.expenses.indexOf(e);
            html += `
                <div class="expense-item">
                    <div class="flex" style="justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong>${e.category}</strong><br>
                            <small>Paid by ${e.payer} • ${activeTrip.currency}${e.amount.toFixed(2)}</small>
                        </div>
                        <div class="flex">
                            <button class="small edit" onclick="editExpense(${realIndex})">Edit</button>
                            <button class="danger small" onclick="deleteExpense(${realIndex})">Del</button>
                        </div>
                    </div>
                </div>
            `;
        });
    });
    div.innerHTML = html;
}
