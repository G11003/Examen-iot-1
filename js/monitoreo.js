document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores del DOM ---
    const loadingState = document.getElementById('loadingState');
    const monitoringContent = document.getElementById('monitoringContent');
    const cafeteraTitle = document.getElementById('cafeteraTitle');
    const statusBadge = document.getElementById('statusBadge');
    const progressBar = document.getElementById('progressBar');
    const beverageDetails = document.getElementById('beverageDetails');
    const alertSection = document.getElementById('alertSection');
    const alertMessage = document.getElementById('alertMessage');
    const lastUpdated = document.getElementById('lastUpdated');
    
    // Selectores para la taza interactiva
    const liquid = document.getElementById('liquid');
    const steam = document.getElementById('steam');
    const waves = document.getElementById('waves');

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
            const cafeteraResponse = await fetch(`${API_URL}/cafeteras/${cafeteraId}`);
            if (!cafeteraResponse.ok) throw new Error('No se encontró la cafetera');
            cafeteraData = await cafeteraResponse.json();

            cafeteraTitle.textContent = `Monitoreando: ${cafeteraData.nombre} (${cafeteraData.ubicacion})`;

            await actualizarEstado();
            monitoringInterval = setInterval(actualizarEstado, 2000);

            loadingState.classList.add('d-none');
            monitoringContent.classList.remove('d-none');
        } catch (error) {
            console.error(error);
            loadingState.innerHTML = `<p class="text-danger">Error al cargar la cafetera: ${error.message}</p>`;
        }
    };

    // --- 2. Función para Obtener y Actualizar el Estado (cada 2 seg) ---
    const actualizarEstado = async () => {
        if (!cafeteraData) return;
        
        try {
            const statusResponse = await fetch(`${API_URL}/cafetera_status?cafeteraId=${cafeteraData.id}`);
            if (!statusResponse.ok) throw new Error('Fallo al obtener el estado');
            const statusArray = await statusResponse.json();
            
            if (statusArray.length === 0) {
                throw new Error('El estado de la cafetera no fue encontrado.');
            }
            statusData = statusArray[0];
            
            renderizarUI();
            simularProceso();

        } catch (error) {
            console.error(error);
            clearInterval(monitoringInterval);
            statusBadge.textContent = 'ERROR';
            statusBadge.className = 'badge bg-danger';
        }
    };

    // --- 3. Renderizar (dibujar) la UI con los nuevos datos ---
    const renderizarUI = () => {
        if (!statusData) return;

        // Actualizar Badge de Estado y Barra de Progreso
        statusBadge.textContent = statusData.brewing_status.toUpperCase();
        let badgeClass = 'bg-secondary';
        switch(statusData.brewing_status) {
            case 'calentando': badgeClass = 'bg-warning text-dark'; break;
            case 'dispensando': badgeClass = 'bg-info text-dark'; break;
            case 'finalizado': badgeClass = 'bg-success'; break;
            case 'error': badgeClass = 'bg-danger'; break;
        }
        statusBadge.className = `badge ${badgeClass}`;

        progressBar.style.width = `${statusData.brewing_progreso}%`;
        progressBar.textContent = `${statusData.brewing_progreso}%`;
        progressBar.setAttribute('aria-valuenow', statusData.brewing_progreso);
        
        // Actualizar Detalles y Timestamp
        beverageDetails.textContent = `Preparando: ${statusData.tipo_bebida} ${statusData.tamano_taza} (${statusData.temperatura_setting})`;
        lastUpdated.textContent = new Date(statusData.last_updated).toLocaleTimeString();

        // --- ACTUALIZAR TAZA INTERACTIVA ---
        actualizarTaza(statusData);
    };

    // --- 4. Función para controlar la animación de la taza ---
    const actualizarTaza = (estado) => {
        // Nivel del líquido
        liquid.style.height = `${estado.brewing_progreso}%`;

        // Color del líquido (simple por ahora, podría ser más complejo)
        let colorCafe = '#654321';
        if (estado.tipo_bebida === 'LATTE' || estado.tipo_bebida === 'CAPUCCINO') {
            colorCafe = '#a05a2c'; // Un café con leche más claro
        }
        liquid.style.background = `linear-gradient(145deg, ${colorCafe} 0%, #3a2411 100%)`;
        
        // Mostrar/Ocultar vapor y ondas
        const enProceso = estado.brewing_status === 'calentando' || estado.brewing_status === 'dispensando';
        
        steam.style.display = (enProceso && estado.temperatura_setting === 'caliente') ? 'block' : 'none';
        waves.style.display = enProceso ? 'block' : 'none';
    };


    // --- 5. Lógica de Simulación (Client-side) ---
    const simularProceso = () => {
        if (statusData.brewing_status === 'calentando' && statusData.brewing_progreso < 50) {
            setTimeout(() => actualizarEstadoAPI({ brewing_progreso: 50, brewing_status: 'dispensando' }), 3000);
        } else if (statusData.brewing_status === 'dispensando' && statusData.brewing_progreso < 100) {
            setTimeout(() => actualizarEstadoAPI({ brewing_progreso: 100, brewing_status: 'finalizado' }), 4000);
        } else if (statusData.brewing_status === 'finalizado') {
            clearInterval(monitoringInterval);
            if ((statusData.tipo_bebida === 'CAPUCCINO' || statusData.tipo_bebida === 'LATTE')) {
                alertMessage.textContent = '¡Atención! Inserte la cápsula de leche y presione continuar.';
                alertSection.classList.remove('d-none');
            }
            setTimeout(() => actualizarEstadoAPI({ brewing_status: 'inactivo', brewing_progreso: 0 }), 8000); // 8 segundos para reiniciar
        }
    };
    
    // --- 6. Función auxiliar para enviar updates a la API durante la simulación ---
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