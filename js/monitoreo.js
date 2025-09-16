document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const monitoringContent = document.getElementById('monitoringContent');
    const cafeteraTitle = document.getElementById('cafeteraTitle');
    const statusBadge = document.getElementById('statusBadge');
    const progressBar = document.getElementById('progressBar');
    const beverageDetails = document.getElementById('beverageDetails');
    const alertSection = document.getElementById('alertSection');
    const alertMessage = document.getElementById('alertMessage');
    const lastUpdated = document.getElementById('lastUpdated');

    let cafeteraData = null;
    let statusData = null;
    let monitoringInterval = null;

    // --- 1. Obtener ID de la URL y Cargar Datos Iniciales ---
    const iniciarMonitoreo = async () => {
        const params = new URLSearchParams(window.location.search);
        const cafeteraId = params.get('id');

        if (!cafeteraId) {
            loadingState.innerHTML = '<p class="text-danger">Error: No se especificó un ID de cafetera.</p>';
            return;
        }

        try {
            // Obtener datos generales de la cafetera (nombre, ubicacion)
            const cafeteraResponse = await fetch(`${API_URL}/cafeteras/${cafeteraId}`);
            if (!cafeteraResponse.ok) throw new Error('No se encontró la cafetera');
            cafeteraData = await cafeteraResponse.json();

            cafeteraTitle.textContent = `Monitoreando: ${cafeteraData.nombre} (${cafeteraData.ubicacion})`;

            // Iniciar el ciclo de actualización de estado
            actualizarEstado(); // Primera llamada inmediata
            monitoringInterval = setInterval(actualizarEstado, 2000); // Refrescar cada 2 segundos

            loadingState.classList.add('d-none');
            monitoringContent.classList.remove('d-none');

        } catch (error) {
            console.error(error);
            loadingState.innerHTML = `<p class="text-danger">Error al cargar la cafetera: ${error.message}</p>`;
        }
    };

    // --- 2. Función para Obtener y Actualizar el Estado (se ejecuta cada 2 seg) ---
    const actualizarEstado = async () => {
        if (!cafeteraData) return;
        
        try {
            const statusResponse = await fetch(`${API_URL}/cafetera_status?cafeteraId=${cafeteraData.id}`);
            if (!statusResponse.ok) throw new Error('Fallo al obtener el estado');
            const statusArray = await statusResponse.json();
            
            if (statusArray.length === 0) {
                 // Si el proceso termina, detenemos el intervalo
                clearInterval(monitoringInterval);
                statusBadge.textContent = 'ERROR';
                statusBadge.className = 'badge bg-danger';
                progressBar.style.width = '100%';
                progressBar.classList.add('bg-danger');
                progressBar.textContent = 'Error de comunicación';
                return;
            }
            statusData = statusArray[0];
            
            // Actualizamos la UI
            renderizarUI();

        } catch (error) {
            console.error(error);
            // Detenemos el monitoreo si hay un error de red
            clearInterval(monitoringInterval);
        }
    };

    // --- 3. Renderizar la UI con los nuevos datos de estado ---
    const renderizarUI = () => {
        if (!statusData) return;

        // Actualizar Badge de Estado
        statusBadge.textContent = statusData.brewing_status.toUpperCase();
        let badgeClass = 'bg-secondary';
        switch(statusData.brewing_status) {
            case 'calentando': badgeClass = 'bg-warning text-dark'; break;
            case 'dispensando': badgeClass = 'bg-info text-dark'; break;
            case 'finalizado': badgeClass = 'bg-success'; break;
            case 'error': badgeClass = 'bg-danger'; break;
        }
        statusBadge.className = `badge ${badgeClass}`;

        // Actualizar Barra de Progreso
        progressBar.style.width = `${statusData.brewing_progreso}%`;
        progressBar.textContent = `${statusData.brewing_progreso}%`;
        progressBar.setAttribute('aria-valuenow', statusData.brewing_progreso);

        // Actualizar Detalles de la Bebida
        beverageDetails.textContent = `Preparando: ${statusData.tipo_bebida} ${statusData.tamano_taza} (${statusData.temperatura_setting})`;
        
        // Actualizar Timestamp
        lastUpdated.textContent = new Date(statusData.last_updated).toLocaleTimeString();

        // Lógica de Alerta de Leche
        if ((statusData.tipo_bebida === 'CAPUCCINO' || statusData.tipo_bebida === 'LATTE') && statusData.brewing_status === 'finalizado') {
            alertMessage.textContent = '¡Atención! Inserte la cápsula de leche y presione continuar.';
            alertSection.classList.remove('d-none');
        } else {
            alertSection.classList.add('d-none');
        }

        // Lógica de simulación del proceso (si no hay un backend que lo haga)
        simularProceso();

        // Si el proceso ha finalizado o ha dado error, detenemos el refresco
        if (statusData.brewing_status === 'finalizado' || statusData.brewing_status === 'error') {
            clearInterval(monitoringInterval);
             // Simulación final: volver a 'inactivo' después de un tiempo
            setTimeout(() => {
                actualizarEstadoAPI({ brewing_status: 'inactivo', brewing_progreso: 0 });
            }, 5000); // 5 segundos después de finalizar
        }
    };

    // --- 4. Simulación del Proceso (CLIENT-SIDE) ---
    // Esta función simula los pasos de la cafetera si el backend no lo hace.
    const simularProceso = () => {
        if (statusData.brewing_status === 'calentando' && statusData.brewing_progreso < 50) {
            // Simula que el calentamiento tarda un poco y avanza al 50%
            setTimeout(() => {
                actualizarEstadoAPI({ brewing_progreso: 50, brewing_status: 'dispensando' });
            }, 3000); // 3 segundos para calentar
        } else if (statusData.brewing_status === 'dispensando' && statusData.brewing_progreso < 100) {
            // Simula que el dispensado tarda un poco y avanza al 100%
            setTimeout(() => {
                actualizarEstadoAPI({ brewing_progreso: 100, brewing_status: 'finalizado' });
            }, 4000); // 4 segundos para dispensar
        }
    };
    
    // --- 5. Función auxiliar para enviar actualizaciones de estado a la API ---
    const actualizarEstadoAPI = async (cambios) => {
        if (!statusData) return;
        const estadoCompleto = { ...statusData, ...cambios };
        try {
            await fetch(`${API_URL}/cafetera_status/${statusData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estadoCompleto)
            });
        } catch (error) {
            console.error('Error en la simulación:', error);
        }
    };


    // --- Carga Inicial ---
    iniciarMonitoreo();
});