document.addEventListener('DOMContentLoaded', () => {
    const historialTableBody = document.getElementById('historialTableBody');

    // --- Cargar y mostrar el historial ---
    const cargarHistorial = async () => {
        try {
            const response = await fetch(`${API_URL}/historial`);
            if (!response.ok) throw new Error('No se pudo cargar el historial.');
            
            let historial = await response.json();

            // Ordenar por fecha de creación, del más reciente al más antiguo
            historial.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Tomar solo los últimos 10 registros
            const ultimos10 = historial.slice(0, 10);
            
            // Limpiar la tabla
            historialTableBody.innerHTML = '';

            if (ultimos10.length === 0) {
                historialTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No hay registros en el historial.</td>
                    </tr>
                `;
                return;
            }

            // Llenar la tabla con los datos
            ultimos10.forEach(registro => {
                const tr = document.createElement('tr');
                
                // Formatear la fecha para que sea más legible
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
            historialTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error al cargar el historial. Revise la conexión con la API.
                    </td>
                </tr>
            `;
        }
    };

    // --- Carga Inicial ---
    cargarHistorial();
});