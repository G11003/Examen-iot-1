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
    const continueBtn = document.getElementById('continueBtn');
    const lastUpdated = document.getElementById('lastUpdated');
    const liquid = document.getElementById('liquid');
    const steam = document.getElementById('steam');
    const waves = document.getElementById('waves');

    // --- Variables Globales ---
    let cafeteraData = null;
    let statusData = null;
    let monitoringInterval = null;
    let isSimulating = false;
    let historialRegistrado = false;

    // --- Funciones Auxiliares ---
    const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    const actualizarEstadoAPI = async (cambios) => {
        if (!statusData) return;
        const estadoCompleto = { ...statusData, ...cambios };
        try {
            await fetch(`${API_URL}/cafetera_status/${statusData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estadoCompleto)
            });
        } catch (error) { console.error('Error en la simulación:', error); }
    };
    
    const obtenerReceta = async (nombreBebida) => {
        try {
            const response = await fetch(`${API_URL}/bebidas?nombre=${nombreBebida}`);
            const recetaArray = await response.json();
            if (recetaArray.length > 0) {
                return { coffee: recetaArray[0].porcentaje_cafe, milk: recetaArray[0].porcentaje_leche };
            }
        } catch (error) {
            console.error("No se pudo obtener la receta:", error);
        }
        return { coffee: 100, milk: 0 };
    };

    const registrarEnHistorial = async () => {
        if (historialRegistrado || !cafeteraData || !statusData) return;
        const registroHistorial = {
            cafeteraId: cafeteraData.id,
            ip_address: cafeteraData.ip_address,
            ubicacion: cafeteraData.ubicacion,
            tipo_bebida: statusData.tipo_bebida,
            temperatura_setting: statusData.temperatura_setting,
            tamano_taza: statusData.tamano_taza
        };
        try {
            const historialResponse = await fetch(`${API_URL}/historial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registroHistorial)
            });
            if (historialResponse.ok) {
                console.log("Preparación registrada en el historial.");
                historialRegistrado = true;
            } else {
                throw new Error("El servidor rechazó el registro del historial.");
            }
        } catch (error) {
            console.error("Error al guardar en el historial:", error);
        }
    };

    // --- Lógica Principal de la Página ---
    const actualizarTaza = (estado) => {
        liquid.style.height = `${estado.brewing_progreso}%`;
        let colorPrincipal = '#654321';
        if (estado.brewing_status.includes('leche')) {
            colorPrincipal = '#D2B48C';
        } else if (['LATTE', 'CAPUCCINO', 'CORTADO'].includes(estado.tipo_bebida)) {
            colorPrincipal = '#a05a2c';
        }
        liquid.style.background = `linear-gradient(145deg, ${colorPrincipal} 0%, #3a2411 100%)`;
        const enProceso = estado.brewing_status.includes('calentando') || estado.brewing_status.includes('dispensando');
        steam.style.display = (enProceso && estado.temperatura_setting === 'caliente') ? 'block' : 'none';
        waves.style.display = enProceso ? 'block' : 'none';
    };

    const renderizarUI = async () => {
        if (!statusData) return;
        statusBadge.textContent = statusData.brewing_status.replace('_', ' ').toUpperCase();
        let badgeClass = 'bg-secondary';
        const status = statusData.brewing_status;
        if (status.includes('calentando')) badgeClass = 'bg-warning text-dark';
        else if (status.includes('dispensando')) badgeClass = 'bg-info text-dark';
        else if (status === 'finalizado') badgeClass = 'bg-success';
        else if (status === 'error') badgeClass = 'bg-danger';
        else if (status === 'esperando_leche') badgeClass = 'bg-light text-dark border border-secondary';
        statusBadge.className = `badge ${badgeClass}`;
        progressBar.style.width = `${statusData.brewing_progreso}%`;
        progressBar.textContent = `${statusData.brewing_progreso}%`;
        beverageDetails.textContent = `Preparando: ${statusData.tipo_bebida} ${statusData.tamano_taza}`;
        lastUpdated.textContent = new Date(statusData.last_updated).toLocaleTimeString();
        actualizarTaza(statusData);
    };

    const simularProceso = async () => {
        if (document.hidden || !statusData || isSimulating) return;
        const receta = await obtenerReceta(statusData.tipo_bebida);
        const ejecutarSimulacion = (accion, duracion) => {
            isSimulating = true;
            setTimeout(() => {
                actualizarEstadoAPI(accion).then(() => { isSimulating = false; });
            }, duracion);
        };

        switch (statusData.brewing_status) {
            case 'calentando_cafe':
                historialRegistrado = false;
                ejecutarSimulacion({ brewing_status: 'dispensando_cafe', brewing_progreso: 15 }, randomDelay(2000, 3000));
                break;
            case 'dispensando_cafe':
                const proximoEstado = receta.milk > 0 ? 'esperando_leche' : 'finalizado';
                const progresoFinalCafe = receta.milk > 0 ? receta.coffee : 100;
                ejecutarSimulacion({ brewing_progreso: progresoFinalCafe, brewing_status: proximoEstado }, randomDelay(3000, 5000));
                break;
            case 'esperando_leche':
                alertSection.classList.remove('d-none');
                alertSection.classList.add('d-flex');
                alertMessage.textContent = '¡Atención! Inserte la cápsula de leche.';
                continueBtn.disabled = false;
                clearInterval(monitoringInterval);
                break;
            case 'calentando_leche':
                 ejecutarSimulacion({ brewing_status: 'dispensando_leche' }, randomDelay(1500, 2500));
                break;
            case 'dispensando_leche':
                ejecutarSimulacion({ brewing_progreso: 100, brewing_status: 'finalizado' }, randomDelay(3000, 5000));
                break;
            case 'finalizado':
                clearInterval(monitoringInterval);
                registrarEnHistorial();
                setTimeout(() => actualizarEstadoAPI({ brewing_status: 'inactivo', brewing_progreso: 0 }), 8000);
                break;
        }
    };

    const actualizarEstado = async () => {
        if (!cafeteraData) return;
        try {
            const statusResponse = await fetch(`${API_URL}/cafetera_status?cafeteraId=${cafeteraData.id}`);
            if (!statusResponse.ok) throw new Error('Fallo al obtener el estado');
            const statusArray = await statusResponse.json();
            if (statusArray.length === 0) throw new Error('El estado de la cafetera no fue encontrado.');
            statusData = statusArray[0];
            await renderizarUI();
            if (!isSimulating) {
                simularProceso();
            }
        } catch (error) {
            console.error(error);
            clearInterval(monitoringInterval);
            statusBadge.textContent = 'ERROR';
            statusBadge.className = 'badge bg-danger';
        }
    };

    const iniciarMonitoreo = async () => {
        const params = new URLSearchParams(window.location.search);
        const cafeteraId = params.get('id');
        if (!cafeteraId) {
            loadingState.innerHTML = '<p class="text-danger">Error: No se especificó un ID de cafetera.</p>';
            return;
        }
        try {
            const cafeteraResponse = await fetch(`${API_URL}/cafeteras/${cafeteraId}`);
            if (!cafeteraResponse.ok) throw new Error('No se encontró la cafetera con ese ID.');
            cafeteraData = await cafeteraResponse.json();
            cafeteraTitle.textContent = `Monitoreando: ${cafeteraData.nombre} (${cafeteraData.ubicacion})`;
            await actualizarEstado();
            loadingState.classList.add('d-none');
            monitoringContent.classList.remove('d-none');
            monitoringInterval = setInterval(actualizarEstado, 2000);
        } catch (error) {
            console.error(error);
            loadingState.innerHTML = `<p class="text-danger"><b>Error al Cargar:</b> ${error.message}</p><a href="control.html">Volver a Control</a>`;
        }
    };

    // --- Event Listeners ---
    continueBtn.addEventListener('click', () => {
        continueBtn.disabled = true;
        alertSection.classList.add('d-none');
        alertSection.classList.remove('d-flex');
        actualizarEstadoAPI({ brewing_status: 'calentando_leche' }).then(() => {
            monitoringInterval = setInterval(actualizarEstado, 2000);
        });
    });

    // --- Carga Inicial ---
    iniciarMonitoreo();
});