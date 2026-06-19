let trips = JSON.parse(localStorage.getItem("trips")) || [];
let currentTripId = localStorage.getItem("currentTripId");

// Initialize with a default trip if empty
if (trips.length === 0) {
    const defaultTrip = {
        id: Date.now().toString(),
        name: "Default Trip",
        people: [],
        expenses: [],
        currency: "₹"
    };
    trips.push(defaultTrip);
    currentTripId = defaultTrip.id;
    save();
}

let activeTrip = trips.find(t => t.id === currentTripId) || trips[0];
let editIndex = -1;

function save() {
    localStorage.setItem("trips", JSON.stringify(trips));
    localStorage.setItem("currentTripId", currentTripId);
}

function createNewTrip() {
    const name = prompt("Enter Trip Name:");
    if (name) {
        const newTrip = {
            id: Date.now().toString(),
            name: name,
            people: [],
            expenses: [],
            currency: activeTrip.currency || "₹"
        };
        trips.push(newTrip);
        currentTripId = newTrip.id;
        activeTrip = newTrip;
        save();
        renderAll();
    }
}

function switchTrip() {
    currentTripId = document.getElementById("tripSelector").value;
    activeTrip = trips.find(t => t.id === currentTripId);
    save();
    renderAll();
}

function renameTrip() {
    const newName = prompt("Enter new name for trip:", activeTrip.name);
    if (newName) {
        activeTrip.name = newName;
        save();
        renderAll();
    }
}

function startFresh() {
    if (confirm("Clear all data in THIS trip? Other trips will remain safe.")) {
        activeTrip.people = [];
        activeTrip.expenses = [];
        save();
        renderAll();
    }
}

function updateCurrency() {
    activeTrip.currency = document.getElementById("currencySymbol").value;
    save();
    renderAll();
}
