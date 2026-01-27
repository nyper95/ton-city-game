// Inicialización de datos de Ton City
const userData = {
    username: "Cargando...",
    balance: 0.00000000,
    incomePerSecond: 0.00000000,
    energy: 0,
    maxEnergy: 1000,
    minWithdrawal: 5.0 // Ejemplo de mínimo de retiro
};

// Función para actualizar el DOM al cargar
function initCity() {
    document.getElementById('balance').innerText = userData.balance.toFixed(4);
    document.getElementById('income-per-second').innerText = userData.incomePerSecond.toFixed(8);
    document.getElementById('energy-text').innerText = `${userData.energy} / ${userData.maxEnergy}`;
    document.getElementById('energy-fill').style.width = "0%";
    
    // Aquí conectarías con la API de Telegram para el nombre real
    // document.getElementById('user-name').innerText = `@${Telegram.WebApp.user.username}`;
}

// Lógica para el botón del Parque (Opción gratuita)
document.getElementById('collect-park').addEventListener('click', () => {
    console.log("Recolectando TON gratuito...");
    // Aquí disparas la función de Smart Contract o backend
});

window.onload = initCity;
