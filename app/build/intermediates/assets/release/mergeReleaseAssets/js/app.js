function renderAll() {
    try {
        const tripSelector = document.getElementById("tripSelector");
        if (tripSelector) {
            tripSelector.innerHTML = trips.map(t => `<option value="${t.id}" ${t.id === currentTripId ? 'selected' : ''}>${t.name}</option>`).join('');
        }

        const currencySymbol = document.getElementById("currencySymbol");
        if (currencySymbol) {
            currencySymbol.value = activeTrip.currency || "₹";
        }

        const expenseDate = document.getElementById("expenseDate");
        if (expenseDate) {
            expenseDate.value = new Date().toISOString().split("T")[0];
        }

        if (typeof renderPeople === 'function') renderPeople();
        if (typeof renderExpenses === 'function') renderExpenses();
        if (typeof renderAnalytics === 'function') renderAnalytics();
        if (typeof calculate === 'function') calculate();
    } catch (e) {
        console.error("Render error:", e);
    }
}

function cancelEdit() {
    editIndex = -1;
    document.getElementById("formTitle").innerText = "Add Expense";
    document.getElementById("submitExpense").innerText = "Add Expense";
    const cancelBtn = document.getElementById("cancelEdit");
    if (cancelBtn) cancelBtn.style.display = "none";
    document.getElementById("category").value = "";
    document.getElementById("amount").value = "";
    renderAll();
}

function exportData() {
    try {
        const jsonString = JSON.stringify(trips, null, 2);
        if (window.Android && window.Android.exportData) {
            window.Android.exportData(jsonString);
            return;
        }
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `money_split_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (err) {
        alert("Export failed: " + err.message);
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            // Validation: check if it's an array of trips
            if (Array.isArray(data) && data.length > 0 && data[0].id) {
                if (confirm("Importing will overwrite all existing trips. Continue?")) {
                    trips = data;
                    currentTripId = trips[0].id;
                    activeTrip = trips[0];
                    save();
                    renderAll();
                    alert("Backup imported successfully!");
                }
            } else {
                alert("Invalid backup file format.");
            }
        } catch (err) {
            alert("Import failed: " + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.onerror = function() {
        alert("Error reading file.");
    };
    reader.readAsText(file);
}

function resetAll() {
    if (confirm("This will delete ALL trips and all data forever. Are you sure?")) {
        localStorage.clear();
        location.reload();
    }
}

// Initial Render - wait for everything to be ready
window.addEventListener('DOMContentLoaded', () => {
    renderAll();
});
