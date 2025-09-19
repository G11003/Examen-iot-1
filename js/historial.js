document.addEventListener('DOMContentLoaded', () => {
    const historialTableBody = document.getElementById('historialTableBody');

    // --- Cargar y mostrar el historial ---
  const cargarHistorial = async () => {
    try {
        const response = await fetch(`${API_URL}/historial`);
        if (!response.ok) throw new Error('No se pudo cargar el historial.');
        
        let historial = await response.json();

        // **CORRECCIÓN: Ordenamos por ID descendente (los más altos/recientes primero)**
        historial.sort((a, b) => b.id - a.id);

        // Tomar solo los últimos 10 registros
        const ultimos10 = historial.slice(0, 10);
        
        historialTableBody.innerHTML = '';

        if (ultimos10.length === 0) {
            historialTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No hay registros en el historial.</td></tr>`;
            return;
        }

        // Llenar la tabla con los datos
        ultimos10.forEach(registro => {
            const tr = document.createElement('tr');
            const fecha = new Date(registro.createdAt).toLocaleString('es-MX');

            tr.innerHTML = `
                <td>${registro.cafeteraId}</td>
                <td>${registro.ip_address}</td>
                <td>${registro.ubicacion}</td>
                <td>${registro.tipo_bebida}</td>
                <td>${registro.temperatura_setting}</td>
                <td>${registro.tamano_taza}</td>
                <td>${fecha}</td>
            `;
            historialTableBody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al cargar el historial:', error);
    }
};
    // --- Carga Inicial ---
    cargarHistorial();
    setInterval(cargarHistorial, 2000); 
});