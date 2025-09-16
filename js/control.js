document.addEventListener('DOMContentLoaded', () => {
    // ... (no cambian las variables iniciales)
    const cafeteraSelector = document.getElementById('cafeteraSelector');
    const cafeteraInfo = document.getElementById('cafeteraInfo');
    const controlsContainer = document.getElementById('controlsContainer');
    const btnIniciar = document.getElementById('btnIniciar');
    let cafeteras = [];
    let statusCache = {};

    // --- Cargar Cafeteras (sin cambios) ---
    const cargarCafeteras = async () => {
        try {
            const response = await fetch(`${API_URL}/cafeteras`);
            if (!response.ok) throw new Error('No se pudieron cargar las cafeteras');
            cafeteras = await response.json();
            cafeteraSelector.innerHTML = '<option selected disabled>-- Elija una --</option>';
            cafeteras.forEach(cafetera => {
                const option = document.createElement('option');
                option.value = cafetera.id;
                option.textContent = `${cafetera.nombre} (${cafetera.ubicacion})`;
                cafeteraSelector.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            cafeteraSelector.innerHTML = '<option selected disabled>Error al cargar</option>';
        }
    };

    // --- Cargar Estado (URL CORREGIDA) ---
    const cargarEstadoCafetera = async (cafeteraId) => {
        try {
            // VOLVEMOS A LA URL PLANA CON PARÁMETRO DE BÚSQUEDA
            const response = await fetch(`${API_URL}/cafetera_status?cafeteraId=${cafeteraId}`);
            if (!response.ok) throw new Error('No se pudo obtener el estado');
            const statusArray = await response.json();
            if (statusArray.length === 0) {
                alert('Esta cafetera no tiene un estado asociado. Por favor, créelo desde la app de inventario.');
                controlsContainer.classList.add('d-none');
                return;
            }
            const status = statusArray[0];
            statusCache[cafeteraId] = status;
            
            document.getElementById('powerSwitch').checked = status.power_status;
            document.querySelector(`input[name="tamano"][value="${status.tamano_taza}"]`).checked = true;
            document.getElementById('tipoBebida').value = status.tipo_bebida;
            document.querySelector(`input[name="temp"][value="${status.temperatura_setting}"]`).checked = true;

            controlsContainer.classList.remove('d-none');
            btnIniciar.disabled = !status.power_status || status.brewing_status !== 'inactivo';
        } catch (error) {
            console.error(error);
            alert('Error al cargar el estado de la cafetera.');
        }
    };
    
    // --- Actualizar Estado (URL CORREGIDA) ---
    const actualizarEstado = async (cafeteraId, nuevoEstadoParcial) => {
        const estadoActual = statusCache[cafeteraId];
        if (!estadoActual) return;
        const estadoCompleto = { ...estadoActual, ...nuevoEstadoParcial };
        try {
            // USAMOS LA URL PLANA, APUNTANDO AL ID DEL ESTADO
            const response = await fetch(`${API_URL}/cafetera_status/${estadoActual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estadoCompleto)
            });
            if (!response.ok) throw new Error('Error al actualizar el estado');
            const estadoActualizado = await response.json();
            statusCache[cafeteraId] = estadoActualizado;
            btnIniciar.disabled = !estadoActualizado.power_status || estadoActualizado.brewing_status !== 'inactivo';
            return estadoActualizado;
        } catch (error) {
            console.error(error);
            alert('No se pudo actualizar el estado.');
        }
    };

    // --- Iniciar Preparación (sin cambios) ---
    const iniciarPreparacion = async () => {
        // ... (el código de esta función es correcto y no necesita cambios)
        const cafeteraId = cafeteraSelector.value;
        const cafeteraSeleccionada = cafeteras.find(c => c.id === cafeteraId);
        const estadoActual = statusCache[cafeteraId];
        if (!cafeteraSeleccionada || !estadoActual) return;
        btnIniciar.disabled = true;
        btnIniciar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Iniciando...';
        try {
            await actualizarEstado(cafeteraId, { brewing_status: 'calentando', brewing_progreso: 0 });
            const registroHistorial = {
                cafeteraId: cafeteraId,
                ip_address: cafeteraSeleccionada.ip_address,
                ubicacion: cafeteraSeleccionada.ubicacion,
                tipo_bebida: estadoActual.tipo_bebida,
                temperatura_setting: estadoActual.temperatura_setting,
                tamano_taza: estadoActual.tamano_taza
            };
            await fetch(`${API_URL}/historial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registroHistorial)
            });
            window.location.href = `monitoreo.html?id=${cafeteraId}`;
        } catch (error) {
            console.error(error);
            alert('Error al iniciar la preparación.');
            btnIniciar.disabled = false;
            btnIniciar.innerHTML = '<i class="bi bi-play-fill me-2"></i>Iniciar Preparación';
        }
    };

    // --- Event Listeners (sin cambios) ---
    cafeteraSelector.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const cafetera = cafeteras.find(c => c.id === selectedId);
        if (cafetera) {
            cafeteraInfo.textContent = `ID: ${cafetera.id} | Alta: ${new Date(cafetera.createdAt).toLocaleDateString()}`;
            cargarEstadoCafetera(selectedId);
        }
    });
    controlsContainer.addEventListener('change', (e) => {
        const cafeteraId = cafeteraSelector.value;
        let cambios = {};
        switch (e.target.id) {
            case 'powerSwitch': cambios.power_status = e.target.checked; break;
            case 'tamanoEstandar': case 'tamanoGrande': cambios.tamano_taza = e.target.value; break;
            case 'tipoBebida': cambios.tipo_bebida = e.target.value; break;
            case 'tempCaliente': case 'tempFrio': cambios.temperatura_setting = e.target.value; break;
            default: return;
        }
        actualizarEstado(cafeteraId, cambios);
    });
    btnIniciar.addEventListener('click', iniciarPreparacion);

    // --- Carga Inicial ---
    cargarCafeteras();
});