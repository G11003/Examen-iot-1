document.addEventListener('DOMContentLoaded', () => {
    // --- Variables Globales y Selectores ---
    const cafeterasTableBody = document.getElementById('cafeterasTableBody');
    const capsulasTableBody = document.getElementById('capsulasTableBody');
    const capsulaCafeteraSelect = document.getElementById('capsulaCafeteraSelect');
    const formCafetera = document.getElementById('formCafetera');
    const formCapsulas = document.getElementById('formCapsulas');
    const modal = new bootstrap.Modal(document.getElementById('cafeteraModal'));
    const modalTitle = document.getElementById('modalTitle');
    const cafeteraIdInput = document.getElementById('cafeteraId');
    
    // Variable para el inventario de cápsulas (temporal)
    let inventarioCapsulas = [];

    // --- FUNCIONES PARA CAFETERAS (CRUD) ---

    // READ: Cargar y mostrar todas las cafeteras
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
                // Llenar tabla
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cafetera.id}</td>
                    <td>${cafetera.nombre}</td>
                    <td>${cafetera.ubicacion}</td>
                    <td>${cafetera.ip_address}</td>
                    <td>
                        <button class="btn btn-warning btn-sm btn-editar" data-id="${cafetera.id}">Editar</button>
                        <button class="btn btn-danger btn-sm btn-eliminar" data-id="${cafetera.id}">Eliminar</button>
                    </td>
                `;
                cafeterasTableBody.appendChild(tr);

                // Llenar selector en la pestaña de cápsulas
                const option = document.createElement('option');
                option.value = cafetera.id;
                option.textContent = `${cafetera.nombre} (${cafetera.ubicacion})`;
                option.dataset.nombre = cafetera.nombre; // Guardar datos adicionales
                option.dataset.ubicacion = cafetera.ubicacion;
                capsulaCafeteraSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar cafeteras:', error);
            cafeterasTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar datos.</td></tr>';
        }
    };

    // CREATE / UPDATE: Manejar el envío del formulario de cafetera
    const manejarSubmitCafetera = async (e) => {
        e.preventDefault();
        const id = cafeteraIdInput.value;
        
        const cafeteraData = {
            nombre: document.getElementById('cafeteraNombre').value,
            ubicacion: document.getElementById('cafeteraUbicacion').value,
            ip_address: document.getElementById('cafeteraIp').value
        };

        const esUpdate = !!id;
        const url = esUpdate ? `${API_URL}/cafeteras/${id}` : `${API_URL}/cafeteras`;
        const method = esUpdate ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cafeteraData)
            });
            const cafeteraGuardada = await response.json();

            // Si es una cafetera nueva (CREATE), creamos también su estado inicial
            if (!esUpdate) {
                const estadoInicial = {
                    cafeteraId: cafeteraGuardada.id,
                    power_status: false,
                    tamano_taza: "ESTANDAR",
                    tipo_bebida: "ESPRESSO",
                    temperatura_setting: "caliente",
                    brewing_status: "inactivo",
                    brewing_progreso: 0,
                };
                await fetch(`${API_URL}/cafetera_status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(estadoInicial)
                });
            }

            modal.hide();
            cargarCafeteras(); // Recargar la tabla
        } catch (error) {
            console.error('Error al guardar cafetera:', error);
            alert('No se pudo guardar la cafetera.');
        }
    };
    
    // DELETE: Eliminar una cafetera
    const eliminarCafetera = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar esta cafetera y su estado asociado?')) return;
        
        try {
            // 1. Encontrar y eliminar el estado asociado
            const statusResponse = await fetch(`${API_URL}/cafetera_status?cafeteraId=${id}`);
            const statusArray = await statusResponse.json();
            if (statusArray.length > 0) {
                const statusId = statusArray[0].id;
                await fetch(`${API_URL}/cafetera_status/${statusId}`, { method: 'DELETE' });
            }
            
            // 2. Eliminar la cafetera
            await fetch(`${API_URL}/cafeteras/${id}`, { method: 'DELETE' });
            
            cargarCafeteras(); // Recargar
        } catch (error) {
            console.error('Error al eliminar cafetera:', error);
            alert('No se pudo eliminar la cafetera.');
        }
    };

    // --- FUNCIONES PARA CÁPSULAS (VISUAL) ---
    
    // Renderizar la tabla de cápsulas desde el array local
    const renderizarTablaCapsulas = () => {
        capsulasTableBody.innerHTML = '';
        if (inventarioCapsulas.length === 0) {
             capsulasTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Aún no hay cápsulas en el inventario visual.</td></tr>';
        }
        inventarioCapsulas.forEach(capsula => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${capsula.ubicacion}</td>
                <td>${capsula.tipo}</td>
                <td>${capsula.cantidad}</td>
            `;
            capsulasTableBody.appendChild(tr);
        });
    };

    // Añadir una cápsula al array local
    const manejarSubmitCapsula = (e) => {
        e.preventDefault();
        const selectedOption = capsulaCafeteraSelect.options[capsulaCafeteraSelect.selectedIndex];
        
        const nuevaCapsula = {
            ubicacion: selectedOption.dataset.ubicacion,
            tipo: document.getElementById('capsulaTipo').value,
            cantidad: parseInt(document.getElementById('capsulaCantidad').value, 10)
        };
        
        inventarioCapsulas.push(nuevaCapsula);
        renderizarTablaCapsulas(); // Actualizar la tabla visual
        formCapsulas.reset(); // Limpiar el formulario
    };

    // --- EVENT LISTENERS ---

    // Abrir modal en modo "Añadir"
    document.getElementById('btnAnadirCafetera').addEventListener('click', () => {
        modalTitle.textContent = 'Añadir Nueva Cafetera';
        formCafetera.reset();
        cafeteraIdInput.value = '';
    });
    
    // Abrir modal en modo "Editar" o "Eliminar" (delegación de eventos)
    cafeterasTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        
        if (e.target.classList.contains('btn-eliminar')) {
            eliminarCafetera(id);
        } else if (e.target.classList.contains('btn-editar')) {
            // Cargar datos de la cafetera en el modal para editar
            const response = await fetch(`${API_URL}/cafeteras/${id}`);
            const cafetera = await response.json();
            
            modalTitle.textContent = 'Editar Cafetera';
            cafeteraIdInput.value = cafetera.id;
            document.getElementById('cafeteraNombre').value = cafetera.nombre;
            document.getElementById('cafeteraUbicacion').value = cafetera.ubicacion;
            document.getElementById('cafeteraIp').value = cafetera.ip_address;
            
            modal.show();
        }
    });

    formCafetera.addEventListener('submit', manejarSubmitCafetera);
    formCapsulas.addEventListener('submit', manejarSubmitCapsula);

    // --- Carga Inicial ---
    cargarCafeteras();
    renderizarTablaCapsulas();
});