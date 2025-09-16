document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores Globales y Variables ---
    const cafeterasTableBody = document.getElementById('cafeterasTableBody');
    const capsulasTableBody = document.getElementById('capsulasTableBody');
    const capsulaCafeteraSelect = document.getElementById('capsulaCafeteraSelect');
    const capsulaTipoSelect = document.getElementById('capsulaTipo'); // Selector para el menú de cápsulas
    const formCafetera = document.getElementById('formCafetera');
    const formCapsulas = document.getElementById('formCapsulas');
    const modal = new bootstrap.Modal(document.getElementById('cafeteraModal'));
    const modalTitle = document.getElementById('modalTitle');
    const cafeteraIdInput = document.getElementById('cafeteraId');
    const formBebida = document.getElementById('formBebida');
    const bebidaNombreInput = document.getElementById('bebidaNombre');
    const bebidasList = document.getElementById('bebidasList');
    let inventarioCapsulas = [];

    // --- FUNCIONES PARA CAFETERAS (CRUD) ---
    const cargarCafeteras = async () => {
        try {
            const response = await fetch(`${API_URL}/cafeteras`);
            const cafeteras = await response.json();
            cafeterasTableBody.innerHTML = '';
            capsulaCafeteraSelect.innerHTML = '<option selected disabled value="">-- Elija --</option>';
            if (cafeteras.length === 0) {
                 cafeterasTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No hay cafeteras registradas.</td></tr>';
            }
            cafeteras.forEach(cafetera => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${cafetera.id}</td><td>${cafetera.nombre}</td><td>${cafetera.ubicacion}</td><td>${cafetera.ip_address}</td><td><button class="btn btn-warning btn-sm btn-editar" data-id="${cafetera.id}">Editar</button> <button class="btn btn-danger btn-sm btn-eliminar" data-id="${cafetera.id}">Eliminar</button></td>`;
                cafeterasTableBody.appendChild(tr);
                const option = document.createElement('option');
                option.value = cafetera.id;
                option.textContent = `${cafetera.nombre} (${cafetera.ubicacion})`;
                option.dataset.nombre = cafetera.nombre;
                option.dataset.ubicacion = cafetera.ubicacion;
                capsulaCafeteraSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar cafeteras:', error);
            cafeterasTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar datos.</td></tr>';
        }
    };
    const manejarSubmitCafetera = async (e) => {
        e.preventDefault();
        const id = cafeteraIdInput.value;
        const cafeteraData = { nombre: document.getElementById('cafeteraNombre').value, ubicacion: document.getElementById('cafeteraUbicacion').value, ip_address: document.getElementById('cafeteraIp').value };
        const esUpdate = !!id;
        const url = esUpdate ? `${API_URL}/cafeteras/${id}` : `${API_URL}/cafeteras`;
        const method = esUpdate ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cafeteraData) });
            const cafeteraGuardada = await response.json();
            if (!esUpdate) {
                const estadoInicial = { cafeteraId: cafeteraGuardada.id, power_status: false, tamano_taza: "ESTANDAR", tipo_bebida: "ESPRESSO", temperatura_setting: "caliente", brewing_status: "inactivo", brewing_progreso: 0 };
                await fetch(`${API_URL}/cafetera_status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(estadoInicial) });
            }
            modal.hide();
            cargarCafeteras();
        } catch (error) {
            console.error('Error al guardar cafetera:', error);
            alert('No se pudo guardar la cafetera.');
        }
    };
    const eliminarCafetera = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar esta cafetera y su estado asociado?')) return;
        try {
            const statusResponse = await fetch(`${API_URL}/cafetera_status?cafeteraId=${id}`);
            const statusArray = await statusResponse.json();
            if (statusArray.length > 0) {
                const statusId = statusArray[0].id;
                await fetch(`${API_URL}/cafetera_status/${statusId}`, { method: 'DELETE' });
            }
            await fetch(`${API_URL}/cafeteras/${id}`, { method: 'DELETE' });
            cargarCafeteras();
        } catch (error) {
            console.error('Error al eliminar cafetera:', error);
            alert('No se pudo eliminar la cafetera.');
        }
    };

    // --- FUNCIONES PARA BEBIDAS (CRUD) ---
    const cargarBebidas = async () => {
        try {
            const response = await fetch(`${API_URL}/bebidas`);
            const bebidas = await response.json();
            bebidasList.innerHTML = '';
            if (bebidas.length === 0) {
                bebidasList.innerHTML = '<li class="list-group-item">No hay bebidas registradas.</li>';
            }
            bebidas.forEach(bebida => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.textContent = bebida.nombre;
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm btn-eliminar-bebida';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.dataset.id = bebida.id;
                li.appendChild(deleteBtn);
                bebidasList.appendChild(li);
            });

            // **LÍNEA CLAVE:** Actualiza el menú de cápsulas cada vez que se cargan las bebidas
            cargarBebidasEnSelectorCapsulas(bebidas);
            
        } catch (error) {
            console.error("Error al cargar bebidas:", error);
            bebidasList.innerHTML = '<li class="list-group-item text-danger">Error al cargar la lista.</li>';
        }
    };
    
    const anadirBebida = async (e) => {
        e.preventDefault();
        const nombre = bebidaNombreInput.value.trim().toUpperCase();
        if (!nombre) return;
        try {
            await fetch(`${API_URL}/bebidas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombre }) });
            bebidaNombreInput.value = '';
            cargarBebidas(); // Esto recargará la lista Y el menú desplegable
        } catch (error) {
            console.error("Error al añadir bebida:", error);
            alert("No se pudo añadir la bebida.");
        }
    };

    const eliminarBebida = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar este tipo de bebida?')) return;
        try {
            await fetch(`${API_URL}/bebidas/${id}`, { method: 'DELETE' });
            cargarBebidas(); // Esto recargará la lista Y el menú desplegable
        } catch (error) {
            console.error("Error al eliminar bebida:", error);
            alert("No se pudo eliminar la bebida.");
        }
    };

    // --- FUNCIONES PARA CÁPSULAS (VISUAL) ---
    
    // **NUEVA FUNCIÓN** para llenar el selector de tipo de café dinámicamente
    const cargarBebidasEnSelectorCapsulas = (bebidas) => {
        capsulaTipoSelect.innerHTML = '';
         if (bebidas.length === 0) {
            capsulaTipoSelect.innerHTML = '<option disabled>No hay bebidas registradas</option>';
        }
        bebidas.forEach(bebida => {
            const option = document.createElement('option');
            option.value = bebida.nombre;
            option.textContent = bebida.nombre.charAt(0).toUpperCase() + bebida.nombre.slice(1).toLowerCase();
            capsulaTipoSelect.appendChild(option);
        });
    };
    
    const renderizarTablaCapsulas = () => {
        capsulasTableBody.innerHTML = '';
        if (inventarioCapsulas.length === 0) {
             capsulasTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Aún no hay cápsulas en el inventario visual.</td></tr>';
        }
        inventarioCapsulas.forEach(capsula => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${capsula.ubicacion}</td><td>${capsula.tipo}</td><td>${capsula.cantidad}</td>`;
            capsulasTableBody.appendChild(tr);
        });
    };

    const manejarSubmitCapsula = (e) => {
        e.preventDefault();
        if (!capsulaCafeteraSelect.value) {
            alert('Error: Por favor, seleccione una cafetera primero.');
            return;
        }
        const selectedOption = capsulaCafeteraSelect.options[capsulaCafeteraSelect.selectedIndex];
        const nuevaCapsula = {
            ubicacion: selectedOption.dataset.ubicacion,
            tipo: document.getElementById('capsulaTipo').value,
            cantidad: parseInt(document.getElementById('capsulaCantidad').value, 10)
        };
        inventarioCapsulas.push(nuevaCapsula);
        renderizarTablaCapsulas();
        formCapsulas.reset();
    };

    // --- EVENT LISTENERS ---
    document.getElementById('btnAnadirCafetera').addEventListener('click', () => { modalTitle.textContent = 'Añadir Nueva Cafetera'; formCafetera.reset(); cafeteraIdInput.value = ''; });
    cafeterasTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id; if (!id) return;
        if (e.target.classList.contains('btn-eliminar')) { eliminarCafetera(id); }
        else if (e.target.classList.contains('btn-editar')) {
            const response = await fetch(`${API_URL}/cafeteras/${id}`); const cafetera = await response.json();
            modalTitle.textContent = 'Editar Cafetera'; cafeteraIdInput.value = cafetera.id;
            document.getElementById('cafeteraNombre').value = cafetera.nombre; document.getElementById('cafeteraUbicacion').value = cafetera.ubicacion; document.getElementById('cafeteraIp').value = cafetera.ip_address;
            modal.show();
        }
    });
    formCafetera.addEventListener('submit', manejarSubmitCafetera);
    formCapsulas.addEventListener('submit', manejarSubmitCapsula);
    formBebida.addEventListener('submit', anadirBebida);
    bebidasList.addEventListener('click', (e) => { if (e.target.closest('.btn-eliminar-bebida')) { const id = e.target.closest('.btn-eliminar-bebida').dataset.id; eliminarBebida(id); } });

    // --- Carga Inicial ---
    cargarCafeteras();
    cargarBebidas();
    renderizarTablaCapsulas();
});