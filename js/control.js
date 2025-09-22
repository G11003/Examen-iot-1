document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores del DOM ---
    const cafeteraSelector = document.getElementById('cafeteraSelector');
    const cafeteraInfo = document.getElementById('cafeteraInfo');
    const controlsContainer = document.getElementById('controlsContainer');
    const btnIniciar = document.getElementById('btnIniciar');
    const tipoBebidaSelect = document.getElementById('tipoBebida');

    // --- Variables Globales ---
    let cafeteras = [];
    let statusCache = {};

    // --- Funciones de Carga Inicial ---
    const cargarTiposDeBebida = async () => {
        try {
            const response = await fetch(`${API_URL}/bebidas`);
            const bebidas = await response.json();
            tipoBebidaSelect.innerHTML = '';
            if (bebidas.length === 0) {
                tipoBebidaSelect.innerHTML = '<option disabled>No hay bebidas</option>';
            }
            bebidas.forEach(bebida => {
                const option = document.createElement('option');
                option.value = bebida.nombre;
                option.textContent = bebida.nombre.charAt(0).toUpperCase() + bebida.nombre.slice(1).toLowerCase();
                tipoBebidaSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error al cargar tipos de bebida:", error);
            tipoBebidaSelect.innerHTML = '<option disabled>Error al cargar</option>';
        }
    };

    const cargarCafeteras = async () => {
        try {
            const response = await fetch(`${API_URL}/cafeteras`);
            if (!response.ok) throw new Error('No se pudieron cargar las cafeteras');
            cafeteras = await response.json();
            cafeteraSelector.innerHTML = '<option selected disabled value="">-- Elija una --</option>';
            cafeteras.forEach(cafetera => {
                const option = document.createElement('option');
                option.value = cafetera.id;
                option.textContent = `${cafetera.nombre} (${cafetera.ubicacion})`;
                cafeteraSelector.appendChild(option);
            });
        } catch (error) {
            console.error(error);
        }
    };

    // --- Funciones de Lógica Principal ---
    const cargarEstadoCafetera = async (cafeteraId) => {
        try {
            const response = await fetch(`${API_URL}/cafetera_status?cafeteraId=${cafeteraId}`);
            if (!response.ok) throw new Error('No se pudo obtener el estado');
            const statusArray = await response.json();
            if (statusArray.length === 0) {
                alert('Esta cafetera no tiene un estado asociado.');
                controlsContainer.classList.add('d-none'); return;
            }
            const status = statusArray[0];
            statusCache[cafeteraId] = status;
            document.getElementById('powerSwitch').checked = status.power_status;
            document.querySelector(`input[name="tamano"][value="${status.tamano_taza}"]`).checked = true;
            tipoBebidaSelect.value = status.tipo_bebida;
            document.querySelector(`input[name="temp"][value="${status.temperatura_setting}"]`).checked = true;
            controlsContainer.classList.remove('d-none');
            btnIniciar.disabled = !status.power_status;
        } catch (error) {
            console.error(error);
            alert('Error al cargar el estado de la cafetera.');
        }
    };
    
    const actualizarEstado = async (cafeteraId, nuevoEstadoParcial) => {
        const estadoActual = statusCache[cafeteraId];
        if (!estadoActual) return;
        const estadoCompleto = { ...estadoActual, ...nuevoEstadoParcial };
        try {
            const response = await fetch(`${API_URL}/cafetera_status/${estadoActual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estadoCompleto)
            });
            if (!response.ok) throw new Error('Error al actualizar el estado');
            const estadoActualizado = await response.json();
            statusCache[cafeteraId] = estadoActualizado;
            btnIniciar.disabled = !estadoActualizado.power_status;
            return estadoActualizado;
        } catch (error) {
            console.error(error);
            alert('No se pudo actualizar el estado.');
        }
    };

    const iniciarPreparacion = async () => {
        const cafeteraId = cafeteraSelector.value;
        const cafeteraSeleccionada = cafeteras.find(c => c.id === cafeteraId);
        if (!cafeteraSeleccionada) return;
        
        btnIniciar.disabled = true;
        btnIniciar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Redirigiendo...';

        try {
            const tipoBebidaActual = tipoBebidaSelect.value;
            const tamanoTazaActual = document.querySelector('input[name="tamano"]:checked').value;
            const temperaturaActual = document.querySelector('input[name="temp"]:checked').value;
            
            await actualizarEstado(cafeteraId, { brewing_status: 'calentando_cafe', brewing_progreso: 0, tipo_bebida: tipoBebidaActual, tamano_taza: tamanoTazaActual, temperatura_setting: temperaturaActual });
            
            const registroHistorial = { cafeteraId, ip_address: cafeteraSeleccionada.ip_address, ubicacion: cafeteraSeleccionada.ubicacion, tipo_bebida: tipoBebidaActual, temperatura_setting: temperaturaActual, tamano_taza: tamanoTazaActual };
            const historialResponse = await fetch(`${API_URL}/historial`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registroHistorial) });
            if (!historialResponse.ok) throw new Error('El servidor rechazó el registro del historial.');
            
            window.location.href = `monitoreo.html?id=${cafeteraId}`;
        } catch (error) {
            console.error(error);
            alert('Error al iniciar la preparación. Revisa la consola.');
            btnIniciar.disabled = false;
            btnIniciar.innerHTML = '<i class="bi bi-play-fill me-2"></i>Iniciar Preparación';
        }
    };

    // --- Event Listeners ---
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
    const cargaInicial = async () => {
        await cargarTiposDeBebida();
        await cargarCafeteras();
    };

    cargaInicial();
});