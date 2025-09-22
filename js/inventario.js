document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores Globales ---
    const cafeterasTableBody = document.getElementById('cafeterasTableBody');
    const capsulasTableBody = document.getElementById('capsulasTableBody');
    const capsulaCafeteraSelect = document.getElementById('capsulaCafeteraSelect');
    const capsulaTipoSelect = document.getElementById('capsulaTipo');
    const formCafetera = document.getElementById('formCafetera');
    const formCapsulas = document.getElementById('formCapsulas');
    const modal = new bootstrap.Modal(document.getElementById('cafeteraModal'));
    const modalTitle = document.getElementById('modalTitle');
    const cafeteraIdInput = document.getElementById('cafeteraId');
    const formBebida = document.getElementById('formBebida');
    const bebidasList = document.getElementById('bebidasList');

    // Llave para guardar el inventario en la memoria del navegador
    const INVENTORY_KEY = 'capsuleInventory';

    // --- Funciones para CAFETERAS (CRUD con API) ---
    const cargarCafeteras = async () => {
        try {
            const response = await fetch(`${API_URL}/cafeteras`);
            const cafeteras = await response.json();
            cafeterasTableBody.innerHTML = '';
            capsulaCafeteraSelect.innerHTML = '<option selected disabled value="">-- Elija Cafetera --</option>';
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
                capsulaCafeteraSelect.appendChild(option);
            });
        } catch (error) { console.error('Error al cargar cafeteras:', error); }
    };

    const manejarSubmitCafetera = async (e) => {
        e.preventDefault();
        const id = cafeteraIdInput.value;
        const cafeteraData = { nombre: document.getElementById('cafeteraNombre').value, ubicacion: document.getElementById('cafeteraUbicacion').value, ip_address: document.getElementById('cafeteraIp').value };
        const esUpdate = !!id;
        const url = esUpdate ? `${API_URL}/cafeteras/${id}` : `${API_URL}/cafeteras`;
        const method = esUpdate ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cafeteraData) });
            const cafeteraGuardada = await response.json();
            if (!esUpdate) {
                const estadoInicial = { cafeteraId: cafeteraGuardada.id, power_status: false, tamano_taza: "ESTANDAR", tipo_bebida: "ESPRESSO", temperatura_setting: "caliente", brewing_status: "inactivo", brewing_progreso: 0 };
                await fetch(`${API_URL}/cafetera_status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(estadoInicial) });
            }
            modal.hide();
            cargarCafeteras();
        } catch (error) { console.error('Error al guardar cafetera:', error); alert('No se pudo guardar la cafetera.'); }
    };

    const eliminarCafetera = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar esta cafetera y sus cápsulas asociadas?')) return;
        try {
            // Limpiar cápsulas asociadas del localStorage
            let inventario = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
            const nuevoInventario = inventario.filter(capsula => capsula.cafeteraId !== id);
            localStorage.setItem(INVENTORY_KEY, JSON.stringify(nuevoInventario));

            // Eliminar de la API
            const statusResponse = await fetch(`${API_URL}/cafetera_status?cafeteraId=${id}`);
            const statusArray = await statusResponse.json();
            if (statusArray.length > 0) {
                await fetch(`${API_URL}/cafetera_status/${statusArray[0].id}`, { method: 'DELETE' });
            }
            await fetch(`${API_URL}/cafeteras/${id}`, { method: 'DELETE' });
            
            cargarCafeteras();
            cargarCapsulasDesdeStorage();
        } catch (error) {
            console.error('Error al eliminar cafetera:', error);
            alert('No se pudo eliminar la cafetera.');
        }
    };

    // --- Funciones para BEBIDAS (CRUD con API) ---
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
                li.innerHTML = `<span>${bebida.nombre} <small class="text-muted">(${bebida.porcentaje_cafe}% Café / ${bebida.porcentaje_leche}% Leche)</small></span>`;
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm btn-eliminar-bebida';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.dataset.id = bebida.id;
                li.appendChild(deleteBtn);
                bebidasList.appendChild(li);
            });
            cargarBebidasEnSelectorCapsulas(bebidas);
        } catch (error) { console.error("Error al cargar bebidas:", error); }
    };

    const anadirBebida = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('bebidaNombre').value.trim().toUpperCase();
        const porcentajeCafe = parseInt(document.getElementById('porcentajeCafe').value, 10);
        const porcentajeLeche = parseInt(document.getElementById('porcentajeLeche').value, 10);
        if (!nombre) return;
        if ((porcentajeCafe + porcentajeLeche) > 100) {
            alert("Error: La suma de los porcentajes no puede ser mayor a 100.");
            return;
        }
        const nuevaBebida = { nombre, porcentaje_cafe: porcentajeCafe, porcentaje_leche: porcentajeLeche };
        try {
            await fetch(`${API_URL}/bebidas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaBebida) });
            document.getElementById('formBebida').reset();
            cargarBebidas();
        } catch (error) { console.error("Error al añadir bebida:", error); }
    };

    const eliminarBebida = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar este tipo de bebida?')) return;
        try {
            await fetch(`${API_URL}/bebidas/${id}`, { method: 'DELETE' });
            cargarBebidas();
        } catch (error) { console.error("Error al eliminar bebida:", error); }
    };

    // --- Funciones para CÁPSULAS (con LocalStorage) ---
    const cargarBebidasEnSelectorCapsulas = (bebidas) => {
        capsulaTipoSelect.innerHTML = '';
        if (bebidas.length === 0) {
            capsulaTipoSelect.innerHTML = '<option disabled>No hay bebidas</option>';
        }
        bebidas.forEach(bebida => {
            const option = document.createElement('option');
            option.value = bebida.nombre;
            option.textContent = bebida.nombre.charAt(0).toUpperCase() + bebida.nombre.slice(1).toLowerCase();
            capsulaTipoSelect.appendChild(option);
        });
    };
    
    const cargarCapsulasDesdeStorage = () => {
        const inventario = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
        capsulasTableBody.innerHTML = '';
        if (inventario.length === 0) {
            capsulasTableBody.innerHTML = '<tr><td colspan="2" class="text-center fst-italic text-muted">Aún no hay cápsulas en el inventario.</td></tr>';
            return;
        }
        inventario.forEach(capsula => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${capsula.ubicacion}</td><td>${capsula.tipo}</td>`;
            capsulasTableBody.appendChild(tr);
        });
    };

    const manejarSubmitCapsula = (e) => {
        e.preventDefault();
        const cafeteraId = capsulaCafeteraSelect.value;
        const nombreBebida = capsulaTipoSelect.value;
        if (!cafeteraId || !nombreBebida) {
            alert('Error: Por favor, seleccione una cafetera y un tipo de bebida.');
            return;
        }
        const selectedOption = capsulaCafeteraSelect.options[capsulaCafeteraSelect.selectedIndex];
        
        const inventario = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
        
        const nuevaCapsula = {
            cafeteraId: cafeteraId,
            ubicacion: selectedOption.textContent,
            tipo: nombreBebida
        };
        
        inventario.push(nuevaCapsula);
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventario));
        cargarCapsulasDesdeStorage();
        formCapsulas.reset();
    };

    // --- Event Listeners ---
    document.getElementById('btnAnadirCafetera').addEventListener('click', () => {
        modalTitle.textContent = 'Añadir Nueva Cafetera';
        formCafetera.reset();
        cafeteraIdInput.value = '';
    });
    
    cafeterasTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id; if (!id) return;
        if (e.target.classList.contains('btn-eliminar')) {
            eliminarCafetera(id);
        } else if (e.target.classList.contains('btn-editar')) {
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
    formBebida.addEventListener('submit', anadirBebida);
    
    bebidasList.addEventListener('click', (e) => {
        const boton = e.target.closest('.btn-eliminar-bebida');
        if (boton) {
            const id = boton.dataset.id;
            eliminarBebida(id);
        }
    });

    // --- Carga Inicial ---
    cargarCafeteras();
    cargarBebidas();
    cargarCapsulasDesdeStorage();
});