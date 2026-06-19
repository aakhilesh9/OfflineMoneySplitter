const CATEGORY_MAP = {
    "Food": ["chai", "coffee", "milk", "nashta", "dinner", "lunch", "breakfast", "khana", "snacks", "restaurant", "dhaba", "pizza", "burger", "water", "pani", "juice", "beverage", "grocery", "rashan", "mithai", "sweets", "biscuit", "maggi", "tea", "drink", "chocolate", "choco", "candy", "toffee", "ice cream", "icecream", "fruit", "fruit", "cake", "party", "daaru", "alcohol", "beer", "wine", "chicken", "meat", "Nariyal","Haldiram", "Paratha", "Paneer", "Bhojan", "Amar Punjabi", "rice", "Thali"],
    "Travel": ["bus", "taxi", "cab", "uber", "ola", "auto", "rickshaw", "train", "flight", "ticket", "fuel", "petrol", "diesel", "gas", "parking", "toll", "metro", "scooty", "bike", "car", "hire", "rent", "transport", "travel", "yatra", "rapido", "indriver"],
    "Hotel/Stay": ["hotel", "hostel", "dormitory", "stay", "room", "rent", "lodge", "guest house", "resort", "airbnb", "stay", "homestay", "pg", "villa", "cottage"],
    "Fun & Activity": ["movie", "cinema", "park", "tickets", "activity", "boating", "club", "party", "entry", "fee", "zoo", "museum", "trekking"],
    "Misc": ["shopping", "gift", "clothes", "medicine", "medical", "pharmacy", "mobile", "recharge", "tip", "tips", "misc", "others", "bill"]
};

function getBroadCategory(rawName) {
    const name = rawName.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(kw => name.includes(kw))) {
            return category;
        }
    }
    return "Other";
}

function renderAnalytics() {
    const div = document.getElementById("categoryBreakdown");
    if (!div) return;

    const stats = {};
    const itemDetails = {};
    let grandTotal = 0;

    activeTrip.expenses.forEach(e => {
        const cat = getBroadCategory(e.category);
        stats[cat] = (stats[cat] || 0) + e.amount;

        if (!itemDetails[cat]) itemDetails[cat] = new Set();
        itemDetails[cat].add(e.category);

        grandTotal += e.amount;
    });

    if (grandTotal === 0) {
        div.innerHTML = "<p style='color:var(--text-muted)'>No data yet.</p>";
        return;
    }

    const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const colors = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#db2777", "#0891b2", "#4b5563"];

    // Pie Chart Logic (SVG)
    let pieSlices = "";
    let currentAngle = 0;
    sortedStats.forEach(([cat, amt], idx) => {
        const percent = amt / grandTotal;
        const angle = percent * 360;
        const x1 = 50 + 40 * Math.cos(Math.PI * currentAngle / 180);
        const y1 = 50 + 40 * Math.sin(Math.PI * currentAngle / 180);
        currentAngle += angle;
        const x2 = 50 + 40 * Math.cos(Math.PI * currentAngle / 180);
        const y2 = 50 + 40 * Math.sin(Math.PI * currentAngle / 180);
        const largeArc = angle > 180 ? 1 : 0;
        const color = colors[idx % colors.length];
        pieSlices += `<path d="M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="white" stroke-width="0.5"/>`;
    });

    let html = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem; margin-bottom: 2rem;">
            <svg viewBox="0 0 100 100" style="width: 200px; height: 200px; transform: rotate(-90deg);">
                ${pieSlices}
            </svg>
            <div style="width: 100%;">
    `;

    sortedStats.forEach(([cat, amt], idx) => {
        const percent = ((amt / grandTotal) * 100).toFixed(1);
        const color = colors[idx % colors.length];
        const itemsList = Array.from(itemDetails[cat]).join(", ");

        html += `
            <div style="margin-bottom: 1rem;">
                <div class="flex" style="justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <div class="flex" style="align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                        <strong style="font-size: 0.9rem;">${cat}</strong>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: bold;">${activeTrip.currency}${amt.toFixed(2)} (${percent}%)</span>
                </div>
                <div class="stats-bar-container"><div class="stats-bar" style="width: ${percent}%; background: ${color}"></div></div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; padding-left: 1rem;">
                    ℹ️ Combined: <i>${itemsList}</i>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    div.innerHTML = html;
}

function calculate() {
    const div = document.getElementById("summary");
    if (!div) return;

    const balance = {}; const paid = {}; const used = {};
    activeTrip.people.forEach(p => { balance[p] = 0; paid[p] = 0; used[p] = 0; });

    let grandTotal = 0;
    activeTrip.expenses.forEach(e => {
        grandTotal += e.amount;
        if (paid[e.payer] !== undefined) paid[e.payer] += e.amount;
        if (balance[e.payer] !== undefined) balance[e.payer] += e.amount;
        for (let p in e.splits) {
            if (used[p] !== undefined) { used[p] += e.splits[p]; balance[p] -= e.splits[p]; }
        }
    });

    let summaryHtml = `<div style="background: var(--primary); color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
        <div style="font-size: 0.85rem; opacity: 0.9;">TOTAL TRIP EXPENSE</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${activeTrip.currency}${grandTotal.toFixed(2)}</div>
    </div>`;

    activeTrip.people.forEach(p => {
        let tag = balance[p] > 0.01 ? `<span class="badge get">Gets ${activeTrip.currency}${balance[p].toFixed(2)}</span>` :
                  balance[p] < -0.01 ? `<span class="badge owe">Owes ${activeTrip.currency}${Math.abs(balance[p]).toFixed(2)}</span>` :
                  `<span class="badge" style="background:#9ca3af">Settled</span>`;
        summaryHtml += `<div style="margin-bottom: 0.75rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.5rem;">
            <strong>${p}</strong><br>${tag}</div>`;
    });
    div.innerHTML = summaryHtml || "Add people first.";

    let resultHtml = "";
    const ds = []; const cs = [];
    for (let p in balance) {
        if (balance[p] < -0.01) ds.push({ n: p, a: Math.abs(balance[p]) });
        else if (balance[p] > 0.01) cs.push({ n: p, a: balance[p] });
    }
    let i = 0, j = 0;
    while (i < ds.length && j < cs.length) {
        let pay = Math.min(ds[i].a, cs[j].a);
        resultHtml += `<div style="padding:0.25rem 0;">💸 <b>${ds[i].n}</b> pays ${activeTrip.currency}${pay.toFixed(2)} to <b>${cs[j].n}</b></div>`;
        ds[i].a -= pay; cs[j].a -= pay;
        if (ds[i].a < 0.01) i++; if (cs[j].a < 0.01) j++;
    }
    const settDiv = document.getElementById("settlement");
    if (settDiv) settDiv.innerHTML = resultHtml || "All Settled! 🎉";
}

function livePercentageCheck() {
    let total = 0;
    activeTrip.people.forEach(p => {
        const input = document.getElementById("split_" + p);
        if (input) total += parseFloat(input.value) || 0;
    });

    let warn = document.getElementById("percentWarning");
    if (!warn) {
        warn = document.createElement("div");
        warn.id = "percentWarning";
        warn.style.cssText = "color: var(--danger); font-size: 0.75rem; margin-top: 0.25rem;";
        const splitInputs = document.getElementById("splitInputs");
        if (splitInputs) splitInputs.appendChild(warn);
    }

    if (warn) {
        if (total > 100) {
            warn.innerText = "⚠ Total exceeds 100%";
        } else if (total < 100 && total > 0) {
            warn.innerText = `Total: ${total}% (Need ${(100 - total).toFixed(1)}% more)`;
        } else {
            warn.innerText = "";
        }
    }
}

function shareSummary() {
    const title = activeTrip.name;
    const date = new Date().toISOString().split("T")[0];
    let text = `📊 *${title.toUpperCase()} REPORT*\n`;
    text += `📅 Date: ${date}\n`;
    text += `────────────────────\n\n`;

    const balance = {};
    activeTrip.people.forEach(p => { balance[p] = 0; });
    activeTrip.expenses.forEach(e => {
        if (balance[e.payer] !== undefined) balance[e.payer] += e.amount;
        for (let p in e.splits) {
            if (balance[p] !== undefined) balance[p] -= e.splits[p];
        }
    });

    text += `*💰 SETTLEMENTS:*\n`;
    const ds = []; const cs = [];
    for (let p in balance) {
        if (balance[p] < -0.01) ds.push({ n: p, a: Math.abs(balance[p]) });
        else if (balance[p] > 0.01) cs.push({ n: p, a: balance[p] });
    }
    let i = 0, j = 0;
    let hasSettlements = false;
    while (i < ds.length && j < cs.length) {
        let pay = Math.min(ds[i].a, cs[j].a);
        text += `💸 ${ds[i].n} → ${activeTrip.currency}${pay.toFixed(2)} to ${cs[j].n}\n`;
        ds[i].a -= pay; cs[j].a -= pay;
        if (ds[i].a < 0.01) i++; if (cs[j].a < 0.01) j++;
        hasSettlements = true;
    }
    if (!hasSettlements) text += "All settled! 🎉\n";

    text += `\n*👤 MEMBER SUMMARY:*\n`;
    activeTrip.people.forEach(p => {
        const b = balance[p];
        const status = b > 0.01 ? `Gets back ${activeTrip.currency}${b.toFixed(2)}` : b < -0.01 ? `Owes ${activeTrip.currency}${Math.abs(b).toFixed(2)}` : "Settled";
        text += `• ${p}: ${status}\n`;
    });

    text += `\n*📝 EXPENSE LOG:*\n`;
    activeTrip.expenses.forEach(e => {
        text += `• ${e.category}: ${activeTrip.currency}${e.amount.toFixed(2)} (Paid by ${e.payer})\n`;
    });

    text += `\n────────────────────\n`;
    text += `_Shared via Money Splitter App_`;

    if (window.Android && window.Android.shareText) window.Android.shareText(text);
    else window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, '_blank');
}

function getReportHtml() {
    const title = (document.getElementById("reportTitle") ? document.getElementById("reportTitle").value : "") || activeTrip.name;
    const date = (document.getElementById("reportDate") ? document.getElementById("reportDate").value : "") || new Date().toISOString().split("T")[0];

    const balance = {}; const paid = {}; const used = {};
    activeTrip.people.forEach(p => { balance[p] = 0; paid[p] = 0; used[p] = 0; });

    let grandTotal = 0;
    activeTrip.expenses.forEach(e => {
        grandTotal += e.amount;
        if (paid[e.payer] !== undefined) paid[e.payer] += e.amount;
        if (balance[e.payer] !== undefined) balance[e.payer] += e.amount;
        for (let p in e.splits) {
            if (used[p] !== undefined) { used[p] += e.splits[p]; balance[p] -= e.splits[p]; }
        }
    });

    let settlementRows = "";
    const ds = []; const cs = [];
    for (let p in balance) {
        if (balance[p] < -0.01) ds.push({ n: p, a: Math.abs(balance[p]) });
        else if (balance[p] > 0.01) cs.push({ n: p, a: balance[p] });
    }
    let i = 0, j = 0;
    while (i < ds.length && j < cs.length) {
        let pay = Math.min(ds[i].a, cs[j].a);
        settlementRows += `<tr><td><b>${ds[i].n}</b></td><td><b>${cs[j].n}</b></td><td>${activeTrip.currency}${pay.toFixed(2)}</td></tr>`;
        ds[i].a -= pay; cs[j].a -= pay;
        if (ds[i].a < 0.01) i++; if (cs[j].a < 0.01) j++;
    }
    if (!settlementRows) settlementRows = "<tr><td colspan='3' style='text-align:center'>All settled! 🎉</td></tr>";

    // Group expenses for Analytics
    const catStats = {};
    const groupedExpenses = {};
    activeTrip.expenses.forEach(e => {
        const cat = getBroadCategory(e.category);
        catStats[cat] = (catStats[cat] || 0) + e.amount;

        if (!groupedExpenses[e.date]) groupedExpenses[e.date] = [];
        groupedExpenses[e.date].push(e);
    });

    const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

    let expenseLogRows = "";
    if (activeTrip.expenses.length === 0) {
        expenseLogRows = "<tr><td colspan='4' style='text-align:center'>No expenses recorded.</td></tr>";
    } else {
        sortedDates.forEach(date => {
            expenseLogRows += `<tr style="background: #f0f4ff;"><td colspan="4" style="font-weight: bold; color: #2563eb;">📅 ${date}</td></tr>`;
            groupedExpenses[date].forEach(e => {
                expenseLogRows += `
                    <tr>
                        <td>${e.category}</td>
                        <td>${e.payer}</td>
                        <td>${activeTrip.currency}${e.amount.toFixed(2)}</td>
                        <td style="font-size: 11px; color: #666;">
                            ${Object.entries(e.splits).map(([p, a]) => `${p}: ${activeTrip.currency}${a.toFixed(2)}`).join('<br>')}
                        </td>
                    </tr>`;
            });
        });
    }

    // Pie Chart for PDF (SVG)
    const colors = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#db2777", "#0891b2", "#4b5563"];
    let pieSlices = "";
    let legendItems = "";
    let currentAngle = 0;
    const sortedCats = Object.entries(catStats).sort((a, b) => b[1] - a[1]);

    sortedCats.forEach(([cat, amt], idx) => {
        const percent = amt / grandTotal;
        const angle = percent * 360;
        const x1 = 50 + 40 * Math.cos(Math.PI * currentAngle / 180);
        const y1 = 50 + 40 * Math.sin(Math.PI * currentAngle / 180);
        currentAngle += angle;
        const x2 = 50 + 40 * Math.cos(Math.PI * currentAngle / 180);
        const y2 = 50 + 40 * Math.sin(Math.PI * currentAngle / 180);
        const largeArc = angle > 180 ? 1 : 0;
        const color = colors[idx % colors.length];
        pieSlices += `<path d="M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="white" stroke-width="0.5"/>`;
        legendItems += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:12px;"><div style="width:12px; height:12px; background:${color}; border-radius:2px;"></div><span>${cat}: ${activeTrip.currency}${amt.toFixed(2)} (${(percent*100).toFixed(1)}%)</span></div>`;
    });

    const analyticsHtml = grandTotal > 0 ? `<div class="section-title">Spending Analytics</div><div style="display:flex; align-items:center; gap:40px; margin-top:10px;"><svg viewBox="0 0 100 100" style="width:150px; height:150px; transform: rotate(-90deg);">${pieSlices}</svg><div style="flex-grow:1;">${legendItems}</div></div>` : "";

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #333; line-height: 1.6; background: white; }
            h1 { text-align: center; color: #2563eb; margin-bottom: 5px; }
            .date { text-align: center; margin-bottom: 30px; color: #666; font-style: italic; }
            .section-title { margin-top: 30px; margin-bottom: 10px; font-size: 18px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 5px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; }
            th { background: #f3f4f6; color: #1f2937; padding: 12px 10px; border: 1px solid #e5e7eb; text-align: left; }
            td { padding: 10px; border: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) { background: #f9fafb; }
            .positive { color: #16a34a; font-weight: bold; }
            .negative { color: #dc2626; font-weight: bold; }
            .total-row { background: #eef2ff !important; font-weight: bold; border-top: 2px solid #2563eb; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <div class="date">Generated on: ${date}</div>
        <div class="section-title">Settlement Instructions</div>
        <table><tr><th>From</th><th>To</th><th>Amount</th></tr>${settlementRows}</table>
        <div class="section-title">Member Summary</div>
        <table>
            <tr><th>Name</th><th>Total Paid</th><th>Total Used</th><th>Net Balance</th></tr>
            ${activeTrip.people.map(p => `<tr><td>${p}</td><td>${activeTrip.currency}${paid[p].toFixed(2)}</td><td>${activeTrip.currency}${used[p].toFixed(2)}</td><td class="${balance[p] >= 0 ? 'positive' : 'negative'}">${activeTrip.currency}${balance[p].toFixed(2)}</td></tr>`).join('')}
            <tr class="total-row"><td>GRAND TOTAL</td><td>${activeTrip.currency}${grandTotal.toFixed(2)}</td><td>${activeTrip.currency}${grandTotal.toFixed(2)}</td><td>-</td></tr>
        </table>
        <div class="section-title">Detailed Expense Log</div>
        <table><tr><th>Category</th><th>Payer</th><th>Amount</th><th>Splits</th></tr>${expenseLogRows}</table>
        ${analyticsHtml}
        <div class="footer">Generated by Money Splitter App</div>
    </body>
    </html>`;
}

function printSettlement() {
    const reportHtml = getReportHtml();
    if (window.Android && window.Android.printHtml) {
        window.Android.printHtml(reportHtml);
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(reportHtml);
            printWindow.document.close();
            printWindow.onload = () => { printWindow.print(); };
        } else { alert("Popup blocked!"); }
    }
}

function exportToCSV() {
    if (!activeTrip.expenses || activeTrip.expenses.length === 0) {
        return alert("No expenses to export.");
    }

    let csv = "Date,Category,Payer,Amount,Splits\n";
    activeTrip.expenses.forEach(e => {
        let splitStr = Object.entries(e.splits).map(([p, a]) => `${p}: ${a.toFixed(2)}`).join(' | ');
        csv += `"${e.date}","${e.category}","${e.payer}",${e.amount},"${splitStr}"\n`;
    });

    const fileName = `expenses_${activeTrip.name.replace(/\s+/g, '_')}.csv`;

    if (window.Android && window.Android.exportFile) {
        window.Android.exportFile(csv, "text/csv", fileName);
        return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
