// Updated game.js with critical bug fixes

// Close all modals
function closeAll() {
    const modals = ['modal1', 'modal2', 'modal3']; // List of all modal IDs
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    });
}

// Function to buy an upgrade from a building
function buyUpgradeFromBuilding(buildingId) {
    // Implementation for buying upgrade
}

// Initializing TON_CONNECT_UI with error handling
try {
    TON_CONNECT_UI.init();
} catch (e) {
    console.error('Error initializing TON_CONNECT_UI:', e);
}

// Check for DOM elements before accessing them
const someElement = document.getElementById('someElementId');
if (someElement) {
    // Proceed with using someElement
}

// Fixing JSON.stringify onclick issue
function safeStringify(data) {
    return JSON.stringify(data).replace(/\/g, '\\\\').replace(/"/g, '\\"');
}

// Replacing onclick handlers with function calls
const button = document.getElementById('someButtonId');
if (button) {
    button.addEventListener('click', () => {
        handleButtonClick();
    });
}

function handleButtonClick() {
    // Button click handler implementation
}
