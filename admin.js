/* =========================================================
   ADMIN.JS - Panel administrativo Comunidad Emprendedora
   ========================================================= */

/* ---------- UTILIDADES ---------- */

function mostrarToast(texto, esError = false) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas ${esError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${escaparHtml(texto)}</span>`;
    toast.classList.toggle('bg-red-600', esError);
    toast.classList.toggle('bg-black', !esError);
    toast.classList.remove('opacity-0', 'translate-y-4');
    clearTimeout(window.__toastTimeout);
    window.__toastTimeout = setTimeout(() => toast.classList.add('opacity-0', 'translate-y-4'), 2800);
}

function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? "";
    return div.innerHTML;
}

// Usado por los buscadores de emprendedores/comercios: saca tildes y pasa a
// minúsculas para que buscar "jose" también encuentre "José", etc.
function normalizarTexto(texto) {
    return (texto ?? "").toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function iniciales(nombre = "") {
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || "?";
}

const PALETA_AVATAR = ['#F97316', '#8B5CF6', '#0EA5E9', '#16A34A', '#DB2777', '#D97706', '#4F46E5', '#0D9488'];
function colorAvatar(texto = "") {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    return PALETA_AVATAR[Math.abs(hash) % PALETA_AVATAR.length];
}

function avatarHtml(nombre, size = 'w-12 h-12 text-sm') {
    return `<div class="avatar ${size} rounded-full" style="background:${colorAvatar(nombre || '')}">${iniciales(nombre)}</div>`;
}

/* ---------- MODALES ---------- */

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}
document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
});

/* ---------- MOSTRAR/OCULTAR CONTRASEÑA (login) ---------- */

const togglePasswordBtn = document.getElementById('toggle-password');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const input = document.getElementById('login-password');
        const esOculta = input.type === 'password';
        input.type = esOculta ? 'text' : 'password';
        togglePasswordBtn.classList.toggle('fa-eye', !esOculta);
        togglePasswordBtn.classList.toggle('fa-eye-slash', esOculta);
        togglePasswordBtn.title = esOculta ? 'Ocultar contraseña' : 'Mostrar contraseña';
    });
}

/* ---------- INSTALAR PWA ---------- */

let __deferredInstallPrompt = null;
const btnInstalarApp = document.getElementById('btn-install-app');

function appYaInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    __deferredInstallPrompt = e;
    if (btnInstalarApp && !appYaInstalada()) btnInstalarApp.classList.add('show');
});

if (btnInstalarApp) {
    btnInstalarApp.addEventListener('click', async () => {
        if (!__deferredInstallPrompt) return;
        btnInstalarApp.disabled = true;
        __deferredInstallPrompt.prompt();
        await __deferredInstallPrompt.userChoice;
        __deferredInstallPrompt = null;
        btnInstalarApp.classList.remove('show');
        btnInstalarApp.disabled = false;
    });
}

window.addEventListener('appinstalled', () => {
    if (btnInstalarApp) btnInstalarApp.classList.remove('show');
    __deferredInstallPrompt = null;
    mostrarToast('App instalada correctamente');
});

/* ---------- CONFIRMACIÓN DE BORRADO (genérica) ---------- */

let __pendingDelete = null;

function pedirConfirmacion({ titulo, texto, onConfirm }) {
    document.getElementById('confirmar-titulo').textContent = titulo;
    document.getElementById('confirmar-texto').textContent = texto;
    __pendingDelete = onConfirm;
    openModal('modal-confirmar');
}

document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    if (!__pendingDelete) return;
    const btn = document.getElementById('btn-confirmar-eliminar');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Eliminando...";
    try {
        await __pendingDelete();
        closeModal('modal-confirmar');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
        __pendingDelete = null;
    }
});

/* ---------- AUTENTICACIÓN ---------- */

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');

auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        document.getElementById('login-user-email').textContent = user.email;
        cargarFerias();
        cargarGaleria();
        cargarEmprendedores();
        cargarComercios();
        cargarPostulaciones();
    } else {
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = "Ingresando...";

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        errorEl.querySelector('span').textContent = "Email o contraseña incorrectos.";
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = "Ingresar";
    }
});

document.getElementById('btn-logout').addEventListener('click', () => auth.signOut());

/* ---------- NAVEGACIÓN ENTRE PANELES ---------- */

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.remove('active', 'text-slate-300');
            b.classList.add('text-slate-300');
        });
        btn.classList.remove('text-slate-300');
        btn.classList.add('active');

        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(btn.dataset.panel).classList.add('active');

        // En mobile, el menú se abre superpuesto en pantalla completa;
        // al elegir una sección lo cerramos para ver el contenido.
        if (typeof cerrarSidebarMobile === 'function') cerrarSidebarMobile();
    });
});

/* =========================================================
   1. FERIAS
   ========================================================= */

const formFeria = document.getElementById('form-feria');

document.getElementById('btn-nueva-feria').addEventListener('click', () => {
    resetFormFeria();
    document.getElementById('modal-feria-titulo').textContent = "Nueva feria";
    document.getElementById('btn-guardar-feria').textContent = "Guardar feria";
    openModal('modal-feria');
});

function resetFormFeria() {
    formFeria.reset();
    document.getElementById('feria-id').value = "";
    document.getElementById('f-flyerUrl').value = "";
    document.getElementById('f-flyer-preview').classList.add('hidden');
    document.getElementById('f-flyer-label').textContent = "Elegir imagen";
}

document.getElementById('f-flyer-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        document.getElementById('f-flyer-label').textContent = "Subiendo...";
        const url = await subirImagenCloudinary(file);
        document.getElementById('f-flyerUrl').value = url;
        const preview = document.getElementById('f-flyer-preview');
        preview.src = url;
        preview.classList.remove('hidden');
        document.getElementById('f-flyer-label').textContent = "Cambiar imagen";
        mostrarToast("Flyer subido");
    } catch (err) {
        document.getElementById('f-flyer-label').textContent = "Elegir imagen";
        mostrarToast("Error al subir el flyer", true);
    }
});

formFeria.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('feria-id').value;
    const activa = document.getElementById('f-activa').checked;
    const btn = document.getElementById('btn-guardar-feria');

    const data = {
        titulo: document.getElementById('f-titulo').value,
        diaSemana: document.getElementById('f-diaSemana').value,
        mes: document.getElementById('f-mes').value,
        diaNumero: document.getElementById('f-diaNumero').value,
        horario: document.getElementById('f-horario').value,
        ubicacion: document.getElementById('f-ubicacion').value,
        mapaEmbedUrl: document.getElementById('f-mapaEmbedUrl').value,
        flyerUrl: document.getElementById('f-flyerUrl').value,
        activa
    };

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        // Ahora se pueden tener varias ferias activas al mismo tiempo (por
        // ejemplo la de este fin de semana y la siguiente), así que ya no
        // desactivamos las demás automáticamente.
        if (id) {
            await db.collection('ferias').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('ferias').add(data);
        }

        mostrarToast("Feria guardada");
        closeModal('modal-feria');
        cargarFerias(false);
    } catch (err) {
        console.error(err);
        mostrarToast("Error al guardar la feria", true);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar feria";
    }
});

// Cache en memoria del último listado que trajo Firestore. Se usa para que
// abrir "Editar" sea instantáneo (sin esperar un nuevo viaje a la base de
// datos): los datos ya los tenemos acá porque se acaban de listar.
let __feriasDocs = [];

async function cargarFerias(mostrarSkeleton = true) {
    const lista = document.getElementById('lista-ferias');
    const stats = document.getElementById('stats-ferias');
    if (mostrarSkeleton) {
        lista.innerHTML = `<div class="skeleton h-24"></div><div class="skeleton h-24"></div>`;
    }
    try {
        const snap = await db.collection('ferias').orderBy('createdAt', 'desc').get();
        __feriasDocs = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        const total = snap.size;
        const activas = snap.docs.filter(d => d.data().activa);

        stats.innerHTML = `
            ${statChip('fa-calendar-days', total, total === 1 ? 'feria cargada' : 'ferias cargadas')}
            ${activas.length
                ? statChip('fa-circle-check', activas.length, activas.length === 1 ? 'feria visible en la web' : 'ferias visibles en la web', 'text-green-600')
                : statChip('fa-triangle-exclamation', 'Ninguna', 'feria visible en la web', 'text-amber-600')}
        `;

        if (snap.empty) {
            lista.innerHTML = estadoVacio('fa-calendar-days', 'Todavía no cargaste ninguna feria', 'Creá la primera para que aparezca acá.');
            return;
        }
        lista.innerHTML = snap.docs.map(doc => {
            const f = doc.data();
            return `
            <div class="card p-5 flex items-center gap-4 ${f.activa ? 'ring-2 ring-yellow-comunidad' : ''}">
                ${f.flyerUrl
                    ? `<img src="${escaparHtml(f.flyerUrl)}" class="w-16 h-16 rounded-xl object-cover bg-slate-100 flex-shrink-0">`
                    : `<div class="w-16 h-16 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center flex-shrink-0 text-xl"><i class="fas fa-image"></i></div>`}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-bold">${escaparHtml(f.titulo)}</p>
                        ${f.activa ? `<span class="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Visible en la web</span>` : ''}
                    </div>
                    <p class="text-slate-400 text-xs mt-1 flex items-center gap-3 flex-wrap">
                        <span><i class="fas fa-calendar w-3"></i> ${escaparHtml(f.diaSemana)} ${escaparHtml(f.diaNumero)} de ${escaparHtml(f.mes)}</span>
                        <span><i class="fas fa-clock w-3"></i> ${escaparHtml(f.horario)}</span>
                        <span><i class="fas fa-location-dot w-3"></i> ${escaparHtml(f.ubicacion)}</span>
                    </p>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button data-editar-feria="${doc.id}" class="btn-icon bg-slate-100 hover:bg-slate-200"><i class="fas fa-pen text-xs"></i></button>
                    <button data-eliminar-feria="${doc.id}" data-titulo="${escaparHtml(f.titulo)}" class="btn-icon bg-red-50 hover:bg-red-100 text-red-500"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </div>`;
        }).join('');

        lista.querySelectorAll('[data-editar-feria]').forEach(b => b.addEventListener('click', () => editarFeria(b.dataset.editarFeria, b)));
        lista.querySelectorAll('[data-eliminar-feria]').forEach(b => b.addEventListener('click', () => {
            pedirConfirmacion({
                titulo: `¿Eliminar "${b.dataset.titulo}"?`,
                texto: "Esta feria se va a borrar de forma permanente.",
                onConfirm: () => eliminarFeria(b.dataset.eliminarFeria)
            });
        }));
    } catch (err) {
        console.error(err);
        lista.innerHTML = `<p class="text-red-500 text-sm">Error al cargar las ferias.</p>`;
    }
}

async function editarFeria(id, btn) {
    // Ya tenemos los datos en __feriasDocs porque se acaban de listar, así
    // que evitamos un viaje extra a Firestore y el modal abre al instante.
    // Si por algo no está en la cache (caso raro), lo buscamos y mientras
    // tanto mostramos un loader en el botón para que quede claro qué pasa.
    let f = __feriasDocs.find(d => d.id === id)?.data;
    const iconoOriginal = btn ? btn.innerHTML : null;

    if (!f) {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs"></i>'; }
        try {
            const doc = await db.collection('ferias').doc(id).get();
            f = doc.data();
        } catch (err) {
            mostrarToast("Error al abrir la feria", true);
            if (btn) { btn.disabled = false; btn.innerHTML = iconoOriginal; }
            return;
        }
        if (btn) { btn.disabled = false; btn.innerHTML = iconoOriginal; }
    }

    document.getElementById('feria-id').value = id;
    document.getElementById('f-titulo').value = f.titulo || '';
    document.getElementById('f-diaSemana').value = f.diaSemana || '';
    document.getElementById('f-mes').value = f.mes || '';
    document.getElementById('f-diaNumero').value = f.diaNumero || '';
    document.getElementById('f-horario').value = f.horario || '';
    document.getElementById('f-ubicacion').value = f.ubicacion || '';
    document.getElementById('f-mapaEmbedUrl').value = f.mapaEmbedUrl || '';
    document.getElementById('f-flyerUrl').value = f.flyerUrl || '';
    document.getElementById('f-activa').checked = !!f.activa;

    const preview = document.getElementById('f-flyer-preview');
    preview.classList.add('hidden');
    document.getElementById('f-flyer-label').textContent = "Elegir imagen";
    if (f.flyerUrl) {
        preview.src = f.flyerUrl;
        preview.classList.remove('hidden');
        document.getElementById('f-flyer-label').textContent = "Cambiar imagen";
    }

    document.getElementById('modal-feria-titulo').textContent = "Editar feria";
    document.getElementById('btn-guardar-feria').textContent = "Guardar cambios";
    openModal('modal-feria');
}

async function eliminarFeria(id) {
    try {
        await db.collection('ferias').doc(id).delete();
        mostrarToast("Feria eliminada");
        cargarFerias(false);
    } catch (err) {
        mostrarToast("Error al eliminar", true);
    }
}

/* =========================================================
   2. GALERÍA DE FOTOS
   ========================================================= */

document.getElementById('g-file').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const indicador = document.getElementById('g-subiendo');
    const texto = document.getElementById('g-subiendo-texto');
    indicador.classList.remove('hidden');

    try {
        let i = 0;
        for (const file of files) {
            i++;
            texto.textContent = `Subiendo imagen ${i} de ${files.length}...`;
            const url = await subirImagenCloudinary(file);
            await db.collection('galeria').add({
                url,
                orden: Date.now(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        mostrarToast(files.length > 1 ? "Fotos subidas" : "Foto subida");
        cargarGaleria(false);
    } catch (err) {
        console.error(err);
        mostrarToast("Error al subir alguna foto", true);
    } finally {
        indicador.classList.add('hidden');
        e.target.value = "";
    }
});

async function cargarGaleria(mostrarSkeleton = true) {
    const lista = document.getElementById('lista-galeria');
    if (mostrarSkeleton) {
        lista.innerHTML = `<div class="skeleton h-32"></div><div class="skeleton h-32"></div><div class="skeleton h-32"></div><div class="skeleton h-32"></div>`;
    }
    try {
        const snap = await db.collection('galeria').orderBy('orden', 'asc').get();
        if (snap.empty) {
            lista.innerHTML = estadoVacio('fa-images', 'Todavía no subiste fotos', 'Las imágenes que subas van a aparecer en esta grilla.', 'col-span-full');
            return;
        }
        lista.innerHTML = snap.docs.map(doc => {
            const g = doc.data();
            return `
            <div class="relative group rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                <img src="${escaparHtml(g.url)}" class="w-full h-32 object-cover">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition"></div>
                <button data-eliminar-foto="${doc.id}" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>`;
        }).join('');

        lista.querySelectorAll('[data-eliminar-foto]').forEach(b => b.addEventListener('click', () => {
            pedirConfirmacion({
                titulo: "¿Eliminar esta foto?",
                texto: "La foto se va a quitar de la galería pública.",
                onConfirm: () => eliminarFoto(b.dataset.eliminarFoto)
            });
        }));
    } catch (err) {
        console.error(err);
        lista.innerHTML = `<p class="text-red-500 text-sm col-span-full">Error al cargar la galería.</p>`;
    }
}

async function eliminarFoto(id) {
    try {
        await db.collection('galeria').doc(id).delete();
        mostrarToast("Foto eliminada");
        cargarGaleria(false);
    } catch (err) {
        mostrarToast("Error al eliminar", true);
    }
}

/* =========================================================
   3. EMPRENDEDORES
   ========================================================= */

const formEmprendedor = document.getElementById('form-emprendedor');

document.getElementById('btn-nuevo-emprendedor').addEventListener('click', () => {
    resetFormEmprendedor();
    document.getElementById('modal-emprendedor-titulo').textContent = "Nuevo emprendedor";
    document.getElementById('btn-guardar-emprendedor').textContent = "Guardar emprendedor";
    openModal('modal-emprendedor');
});

function resetFormEmprendedor() {
    formEmprendedor.reset();
    document.getElementById('e-id').value = "";
    document.getElementById('e-logoUrl').value = "";
    document.getElementById('e-logo-link').value = "";
    document.getElementById('e-logo-preview').classList.add('hidden');
    document.getElementById('e-logo-label').textContent = "Elegir imagen";
}

document.getElementById('e-logo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        document.getElementById('e-logo-label').textContent = "Subiendo...";
        const url = await subirImagenCloudinary(file);
        document.getElementById('e-logoUrl').value = url;
        document.getElementById('e-logo-link').value = "";
        const preview = document.getElementById('e-logo-preview');
        preview.src = url;
        preview.classList.remove('hidden');
        document.getElementById('e-logo-label').textContent = "Cambiar imagen";
        mostrarToast("Logo subido");
    } catch (err) {
        document.getElementById('e-logo-label').textContent = "Elegir imagen";
        mostrarToast("Error al subir el logo", true);
    }
});

// Alternativa a subir un archivo: pegar directamente el link de una imagen
// ya alojada en otro lado (por ejemplo Instagram, Drive, u otra web).
document.getElementById('e-logo-link').addEventListener('change', (e) => {
    const url = e.target.value.trim();
    if (!url) return;
    document.getElementById('e-logoUrl').value = url;
    const preview = document.getElementById('e-logo-preview');
    preview.src = url;
    preview.classList.remove('hidden');
    document.getElementById('e-logo-label').textContent = "Elegir imagen";
});

formEmprendedor.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('e-id').value;
    const btn = document.getElementById('btn-guardar-emprendedor');
    const data = {
        nombre: document.getElementById('e-nombre').value,
        categoria: document.getElementById('e-categoria').value,
        orden: Number(document.getElementById('e-orden').value) || 0,
        testimonio: document.getElementById('e-testimonio').value.trim(),
        instagram: document.getElementById('e-instagram').value.trim(),
        whatsapp: document.getElementById('e-whatsapp').value.trim(),
        web: document.getElementById('e-web').value.trim(),
        logoUrl: document.getElementById('e-logoUrl').value
    };

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        if (id) {
            await db.collection('emprendedores').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('emprendedores').add(data);
        }
        mostrarToast("Emprendedor guardado");
        closeModal('modal-emprendedor');
        cargarEmprendedores(false);
    } catch (err) {
        console.error(err);
        mostrarToast("Error al guardar", true);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar emprendedor";
    }
});

// Guardamos acá el último listado que trajo Firestore para poder filtrarlo
// al instante mientras se escribe en el buscador, sin tener que volver a
// consultar la base de datos en cada letra.
let __emprendedoresDocs = [];

async function cargarEmprendedores(mostrarSkeleton = true) {
    const lista = document.getElementById('lista-emprendedores');
    const stats = document.getElementById('stats-emprendedores');
    if (mostrarSkeleton) {
        lista.innerHTML = `<div class="skeleton h-28"></div><div class="skeleton h-28"></div>`;
    }
    try {
        const snap = await db.collection('emprendedores').orderBy('orden', 'asc').get();
        const conTestimonio = snap.docs.filter(d => (d.data().testimonio || '').trim()).length;

        stats.innerHTML = `
            ${statChip('fa-store', snap.size, snap.size === 1 ? 'emprendedor cargado' : 'emprendedores cargados')}
            ${statChip('fa-quote-left', conTestimonio, 'con testimonio publicado')}
        `;

        __emprendedoresDocs = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        renderListaEmprendedores();
    } catch (err) {
        console.error(err);
        lista.innerHTML = `<p class="text-red-500 text-sm">Error al cargar los emprendedores.</p>`;
    }
}

// Pinta la lista de emprendedores aplicando el filtro del buscador (si hay
// uno cargado) sobre lo que ya tenemos en memoria (__emprendedoresDocs).
function renderListaEmprendedores() {
    const lista = document.getElementById('lista-emprendedores');
    const inputBuscar = document.getElementById('buscar-emprendedores');
    const termino = normalizarTexto(inputBuscar ? inputBuscar.value : '');

    if (!__emprendedoresDocs.length) {
        lista.innerHTML = estadoVacio('fa-store', 'Todavía no cargaste emprendedores', 'Sumá el primero para que aparezca en el sitio.', 'md:col-span-2');
        return;
    }

    const filtrados = termino
        ? __emprendedoresDocs.filter(({ data: e }) =>
            normalizarTexto(e.nombre).includes(termino) || normalizarTexto(e.categoria).includes(termino))
        : __emprendedoresDocs;

    if (!filtrados.length) {
        lista.innerHTML = estadoVacio('fa-magnifying-glass', 'Sin resultados', `No encontramos ningún emprendedor para "${escaparHtml(inputBuscar.value)}".`, 'md:col-span-2');
        return;
    }

    lista.innerHTML = filtrados.map(({ id, data: e }) => {
        return `
        <div class="card p-5 flex items-start gap-4">
            ${e.logoUrl
                ? `<img src="${escaparHtml(e.logoUrl)}" class="w-12 h-12 rounded-full object-cover bg-slate-100 flex-shrink-0">`
                : avatarHtml(e.nombre)}
            <div class="flex-1 min-w-0">
                <p class="font-bold">${escaparHtml(e.nombre)}</p>
                ${e.categoria ? `<p class="text-slate-400 text-xs uppercase tracking-widest mt-0.5">${escaparHtml(e.categoria)}</p>` : ''}
                ${e.testimonio ? `<p class="text-slate-500 text-xs italic mt-2 line-clamp-2"><i class="fas fa-quote-left text-[10px] mr-1"></i>${escaparHtml(e.testimonio)}</p>` : ''}
                ${(e.instagram || e.whatsapp || e.web) ? `<p class="text-slate-400 text-xs mt-2 flex items-center gap-1"><i class="fas fa-link"></i> Contacto cargado</p>` : ''}
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button data-editar-emprendedor="${id}" class="btn-icon bg-slate-100 hover:bg-slate-200"><i class="fas fa-pen text-xs"></i></button>
                <button data-eliminar-emprendedor="${id}" data-nombre="${escaparHtml(e.nombre)}" class="btn-icon bg-red-50 hover:bg-red-100 text-red-500"><i class="fas fa-trash text-xs"></i></button>
            </div>
        </div>`;
    }).join('');

    lista.querySelectorAll('[data-editar-emprendedor]').forEach(b => b.addEventListener('click', () => editarEmprendedor(b.dataset.editarEmprendedor, b)));
    lista.querySelectorAll('[data-eliminar-emprendedor]').forEach(b => b.addEventListener('click', () => {
        pedirConfirmacion({
            titulo: `¿Eliminar "${b.dataset.nombre}"?`,
            texto: "Este emprendedor se va a borrar de forma permanente.",
            onConfirm: () => eliminarEmprendedor(b.dataset.eliminarEmprendedor)
        });
    }));
}

document.getElementById('buscar-emprendedores').addEventListener('input', renderListaEmprendedores);

async function editarEmprendedor(id, btn) {
    // Ya tenemos los datos en __emprendedoresDocs porque se acaban de
    // listar, así que evitamos un viaje extra a Firestore y el modal abre
    // al instante. Si por algo no está en la cache, lo buscamos y mientras
    // tanto mostramos un loader en el botón para que quede claro qué pasa.
    let e = __emprendedoresDocs.find(d => d.id === id)?.data;
    const iconoOriginal = btn ? btn.innerHTML : null;

    if (!e) {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs"></i>'; }
        try {
            const doc = await db.collection('emprendedores').doc(id).get();
            e = doc.data();
        } catch (err) {
            mostrarToast("Error al abrir el emprendedor", true);
            if (btn) { btn.disabled = false; btn.innerHTML = iconoOriginal; }
            return;
        }
        if (btn) { btn.disabled = false; btn.innerHTML = iconoOriginal; }
    }

    document.getElementById('e-id').value = id;
    document.getElementById('e-nombre').value = e.nombre || '';
    document.getElementById('e-categoria').value = e.categoria || '';
    document.getElementById('e-orden').value = e.orden || 0;
    document.getElementById('e-testimonio').value = e.testimonio || '';
    document.getElementById('e-instagram').value = e.instagram || '';
    document.getElementById('e-whatsapp').value = e.whatsapp || '';
    document.getElementById('e-web').value = e.web || '';
    document.getElementById('e-logoUrl').value = e.logoUrl || '';
    document.getElementById('e-logo-link').value = e.logoUrl || '';

    const preview = document.getElementById('e-logo-preview');
    preview.classList.add('hidden');
    document.getElementById('e-logo-label').textContent = "Elegir imagen";
    if (e.logoUrl) {
        preview.src = e.logoUrl;
        preview.classList.remove('hidden');
        document.getElementById('e-logo-label').textContent = "Cambiar imagen";
    }

    document.getElementById('modal-emprendedor-titulo').textContent = "Editar emprendedor";
    document.getElementById('btn-guardar-emprendedor').textContent = "Guardar cambios";
    openModal('modal-emprendedor');
}

async function eliminarEmprendedor(id) {
    try {
        await db.collection('emprendedores').doc(id).delete();
        mostrarToast("Emprendedor eliminado");
        cargarEmprendedores(false);
    } catch (err) {
        mostrarToast("Error al eliminar", true);
    }
}

/* =========================================================
   3.5 COMERCIOS
   (Igual que emprendedores, pero sin testimonio: los comercios
   están adheridos y no participan directamente de la feria.)
   ========================================================= */

const formComercio = document.getElementById('form-comercio');

document.getElementById('btn-nuevo-comercio').addEventListener('click', () => {
    resetFormComercio();
    document.getElementById('modal-comercio-titulo').textContent = "Nuevo comercio";
    document.getElementById('btn-guardar-comercio').textContent = "Guardar comercio";
    openModal('modal-comercio');
});

function resetFormComercio() {
    formComercio.reset();
    document.getElementById('c-id').value = "";
    document.getElementById('c-ubicacion').value = "";
    document.getElementById('c-descuento').value = "";
    document.getElementById('c-logoUrl').value = "";
    document.getElementById('c-logo-link').value = "";
    document.getElementById('c-logo-preview').classList.add('hidden');
    document.getElementById('c-logo-label').textContent = "Elegir imagen";
}

document.getElementById('c-logo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        document.getElementById('c-logo-label').textContent = "Subiendo...";
        const url = await subirImagenCloudinary(file);
        document.getElementById('c-logoUrl').value = url;
        document.getElementById('c-logo-link').value = "";
        const preview = document.getElementById('c-logo-preview');
        preview.src = url;
        preview.classList.remove('hidden');
        document.getElementById('c-logo-label').textContent = "Cambiar imagen";
        mostrarToast("Logo subido");
    } catch (err) {
        document.getElementById('c-logo-label').textContent = "Elegir imagen";
        mostrarToast("Error al subir el logo", true);
    }
});

// Alternativa a subir un archivo: pegar directamente el link de una imagen
// ya alojada en otro lado (por ejemplo Instagram, Drive, u otra web).
document.getElementById('c-logo-link').addEventListener('change', (e) => {
    const url = e.target.value.trim();
    if (!url) return;
    document.getElementById('c-logoUrl').value = url;
    const preview = document.getElementById('c-logo-preview');
    preview.src = url;
    preview.classList.remove('hidden');
    document.getElementById('c-logo-label').textContent = "Elegir imagen";
});

formComercio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('c-id').value;
    const btn = document.getElementById('btn-guardar-comercio');
    const data = {
        nombre: document.getElementById('c-nombre').value,
        categoria: document.getElementById('c-categoria').value,
        orden: Number(document.getElementById('c-orden').value) || 0,
        ubicacion: document.getElementById('c-ubicacion').value.trim(),
        descuento: document.getElementById('c-descuento').value,
        instagram: document.getElementById('c-instagram').value.trim(),
        whatsapp: document.getElementById('c-whatsapp').value.trim(),
        logoUrl: document.getElementById('c-logoUrl').value
    };

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        if (id) {
            await db.collection('comercios').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('comercios').add(data);
        }
        mostrarToast("Comercio guardado");
        closeModal('modal-comercio');
        cargarComercios(false);
    } catch (err) {
        console.error(err);
        mostrarToast("Error al guardar", true);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar comercio";
    }
});

// Igual que __emprendedoresDocs: cache en memoria para filtrar al instante.
let __comerciosDocs = [];

async function cargarComercios(mostrarSkeleton = true) {
    const lista = document.getElementById('lista-comercios');
    const stats = document.getElementById('stats-comercios');
    if (mostrarSkeleton) {
        lista.innerHTML = `<div class="skeleton h-28"></div><div class="skeleton h-28"></div>`;
    }
    try {
        const snap = await db.collection('comercios').orderBy('orden', 'asc').get();

        stats.innerHTML = `
            ${statChip('fa-shop', snap.size, snap.size === 1 ? 'comercio cargado' : 'comercios cargados')}
        `;

        __comerciosDocs = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        renderListaComercios();
    } catch (err) {
        console.error(err);
        lista.innerHTML = `<p class="text-red-500 text-sm">Error al cargar los comercios.</p>`;
    }
}

// Pinta la lista de comercios aplicando el filtro del buscador (si hay uno
// cargado) sobre lo que ya tenemos en memoria (__comerciosDocs).
function renderListaComercios() {
    const lista = document.getElementById('lista-comercios');
    const inputBuscar = document.getElementById('buscar-comercios');
    const termino = normalizarTexto(inputBuscar ? inputBuscar.value : '');

    if (!__comerciosDocs.length) {
        lista.innerHTML = estadoVacio('fa-shop', 'Todavía no cargaste comercios', 'Sumá el primero para que aparezca en el sitio.', 'md:col-span-2');
        return;
    }

    const filtrados = termino
        ? __comerciosDocs.filter(({ data: c }) =>
            normalizarTexto(c.nombre).includes(termino) || normalizarTexto(c.categoria).includes(termino))
        : __comerciosDocs;

    if (!filtrados.length) {
        lista.innerHTML = estadoVacio('fa-magnifying-glass', 'Sin resultados', `No encontramos ningún comercio para "${escaparHtml(inputBuscar.value)}".`, 'md:col-span-2');
        return;
    }

    lista.innerHTML = filtrados.map(({ id, data: c }) => {
        return `
        <div class="card p-5 flex items-start gap-4">
            ${c.logoUrl
                ? `<img src="${escaparHtml(c.logoUrl)}" class="w-12 h-12 rounded-full object-cover bg-slate-100 flex-shrink-0">`
                : avatarHtml(c.nombre)}
            <div class="flex-1 min-w-0">
                <p class="font-bold">${escaparHtml(c.nombre)}</p>
                ${c.categoria ? `<p class="text-slate-400 text-xs uppercase tracking-widest mt-0.5">${escaparHtml(c.categoria)}</p>` : ''}
                ${c.descuento ? `<p class="text-green-600 text-xs mt-1 flex items-center gap-1"><i class="fas fa-tag"></i> Descuento cargado</p>` : ''}
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button data-editar-comercio="${id}" class="btn-icon bg-slate-100 hover:bg-slate-200"><i class="fas fa-pen text-xs"></i></button>
                <button data-eliminar-comercio="${id}" data-nombre="${escaparHtml(c.nombre)}" class="btn-icon bg-red-50 hover:bg-red-100 text-red-500"><i class="fas fa-trash text-xs"></i></button>
            </div>
        </div>`;
    }).join('');

    lista.querySelectorAll('[data-editar-comercio]').forEach(b => b.addEventListener('click', () => editarComercio(b.dataset.editarComercio, b)));
    lista.querySelectorAll('[data-eliminar-comercio]').forEach(b => b.addEventListener('click', () => {
        pedirConfirmacion({
            titulo: `¿Eliminar "${b.dataset.nombre}"?`,
            texto: "Este comercio se va a borrar de forma permanente.",
            onConfirm: () => eliminarComercio(b.dataset.eliminarComercio)
        });
    }));
}

document.getElementById('buscar-comercios').addEventListener('input', renderListaComercios);

async function editarComercio(id, btn) {
    // Ya tenemos los datos en __comerciosDocs porque se acaban de listar,
    // así que evitamos un viaje extra a Firestore y el modal abre al
    // instante. Si por algo no está en la cache, lo buscamos y mientras
    // tanto mostramos un loader en el botón para que quede claro qué pasa.
    let c = __comerciosDocs.find(d => d.id === id)?.data;
    const iconoOriginal = btn ? btn.innerHTML : null;

    if (!c) {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs"></i>'; }
        try {
            const doc = await db.collection('comercios').doc(id).get();
            c = doc.data();
        } catch (err) {
            mostrarToast("Error al abrir el comercio", true);
            if (btn) { btn.disabled = false; btn.innerHTML = iconoOriginal; }
            return;
        }
        if (btn) { btn.disabled = false; btn.innerHTML = iconoOriginal; }
    }

    document.getElementById('c-id').value = id;
    document.getElementById('c-nombre').value = c.nombre || '';
    document.getElementById('c-categoria').value = c.categoria || '';
    document.getElementById('c-orden').value = c.orden || 0;
    document.getElementById('c-ubicacion').value = c.ubicacion || '';
    document.getElementById('c-descuento').value = c.descuento || '';
    document.getElementById('c-instagram').value = c.instagram || '';
    document.getElementById('c-whatsapp').value = c.whatsapp || '';
    document.getElementById('c-logoUrl').value = c.logoUrl || '';
    document.getElementById('c-logo-link').value = c.logoUrl || '';

    const preview = document.getElementById('c-logo-preview');
    preview.classList.add('hidden');
    document.getElementById('c-logo-label').textContent = "Elegir imagen";
    if (c.logoUrl) {
        preview.src = c.logoUrl;
        preview.classList.remove('hidden');
        document.getElementById('c-logo-label').textContent = "Cambiar imagen";
    }

    document.getElementById('modal-comercio-titulo').textContent = "Editar comercio";
    document.getElementById('btn-guardar-comercio').textContent = "Guardar cambios";
    openModal('modal-comercio');
}

async function eliminarComercio(id) {
    try {
        await db.collection('comercios').doc(id).delete();
        mostrarToast("Comercio eliminado");
        cargarComercios(false);
    } catch (err) {
        mostrarToast("Error al eliminar", true);
    }
}

/* =========================================================
   4. POSTULACIONES
   ========================================================= */

const ESTADO_ESTILOS = {
    pendiente: "bg-amber-100 text-amber-700",
    aceptado: "bg-green-100 text-green-700",
    rechazado: "bg-red-100 text-red-700"
};
const ESTADO_LABEL = { pendiente: "Pendiente", aceptado: "Aceptado", rechazado: "Rechazado" };

let __postulacionesCache = [];
let __filtroPostulaciones = 'todas';

async function cargarPostulaciones(mostrarSkeleton = true) {
    const lista = document.getElementById('lista-postulaciones');
    if (mostrarSkeleton) {
        lista.innerHTML = `<div class="skeleton h-24"></div><div class="skeleton h-24"></div>`;
    }
    try {
        const snap = await db.collection('postulaciones').orderBy('createdAt', 'desc').get();
        __postulacionesCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const pendientes = __postulacionesCache.filter(p => (p.estado || 'pendiente') === 'pendiente').length;
        const badge = document.getElementById('badge-postulaciones');
        if (pendientes > 0) {
            badge.textContent = pendientes;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        renderFiltrosPostulaciones();
        renderPostulaciones();
    } catch (err) {
        console.error(err);
        lista.innerHTML = `<p class="text-red-500 text-sm">Error al cargar las postulaciones.</p>`;
    }
}

function renderFiltrosPostulaciones() {
    const cont = document.getElementById('filtros-postulaciones');
    const contar = (estado) => estado === 'todas'
        ? __postulacionesCache.length
        : __postulacionesCache.filter(p => (p.estado || 'pendiente') === estado).length;

    const filtros = [
        { key: 'todas', label: 'Todas' },
        { key: 'pendiente', label: 'Pendientes' },
        { key: 'aceptado', label: 'Aceptadas' },
        { key: 'rechazado', label: 'Rechazadas' },
    ];

    cont.innerHTML = filtros.map(f => `
        <button data-filtro="${f.key}" class="filter-chip ${__filtroPostulaciones === f.key ? 'active' : ''}">
            ${f.label} <span class="opacity-60">${contar(f.key)}</span>
        </button>
    `).join('');

    cont.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
        __filtroPostulaciones = b.dataset.filtro;
        renderFiltrosPostulaciones();
        renderPostulaciones();
    }));
}

function renderPostulaciones() {
    const lista = document.getElementById('lista-postulaciones');
    const datos = __filtroPostulaciones === 'todas'
        ? __postulacionesCache
        : __postulacionesCache.filter(p => (p.estado || 'pendiente') === __filtroPostulaciones);

    if (!datos.length) {
        lista.innerHTML = estadoVacio(
            'fa-clipboard-list',
            __filtroPostulaciones === 'todas' ? 'Todavía no hay postulaciones' : 'No hay postulaciones en este filtro',
            __filtroPostulaciones === 'todas' ? 'Cuando alguien se postule desde la web, va a aparecer acá.' : 'Probá con otro filtro.'
        );
        return;
    }

    lista.innerHTML = datos.map(p => {
        const estado = p.estado || 'pendiente';
        const fecha = p.createdAt ? p.createdAt.toDate().toLocaleDateString('es-AR') : '';
        return `
        <div class="card p-5">
            <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="flex items-start gap-4 min-w-0">
                    ${avatarHtml(p.nombre, 'w-11 h-11 text-sm mt-0.5')}
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <p class="font-bold">${escaparHtml(p.nombre)}</p>
                            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${ESTADO_ESTILOS[estado]}">${ESTADO_LABEL[estado]}</span>
                        </div>
                        <p class="text-slate-500 text-sm">${escaparHtml(p.emprendimiento)}</p>
                        <p class="text-slate-400 text-xs mt-1.5 flex items-center gap-3 flex-wrap">
                            ${p.celular ? `<span><i class="fab fa-whatsapp"></i> ${escaparHtml(p.celular)}</span>` : ''}
                            ${p.instagram ? `<span><i class="fab fa-instagram"></i> ${escaparHtml(p.instagram)}</span>` : ''}
                            <span>${fecha}</span>
                        </p>
                        ${p.productos ? `<p class="text-slate-600 text-sm mt-2">${escaparHtml(p.productos)}</p>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <select data-cambiar-estado="${p.id}" class="field !w-auto !py-2 text-xs font-bold">
                        <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="aceptado" ${estado === 'aceptado' ? 'selected' : ''}>Aceptado</option>
                        <option value="rechazado" ${estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                    </select>
                    <button data-eliminar-postulacion="${p.id}" data-nombre="${escaparHtml(p.nombre)}" class="btn-icon bg-red-50 hover:bg-red-100 text-red-500" title="Eliminar postulación">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    lista.querySelectorAll('[data-cambiar-estado]').forEach(sel => {
        sel.addEventListener('change', () => cambiarEstadoPostulacion(sel.dataset.cambiarEstado, sel.value));
    });
    lista.querySelectorAll('[data-eliminar-postulacion]').forEach(b => {
        b.addEventListener('click', () => {
            pedirConfirmacion({
                titulo: `¿Eliminar la postulación de "${b.dataset.nombre}"?`,
                texto: "Esta postulación se va a borrar de forma permanente.",
                onConfirm: () => eliminarPostulacion(b.dataset.eliminarPostulacion)
            });
        });
    });
}

async function cambiarEstadoPostulacion(id, estado) {
    try {
        await db.collection('postulaciones').doc(id).update({ estado });
        mostrarToast("Estado actualizado");
        cargarPostulaciones(false);
    } catch (err) {
        mostrarToast("Error al actualizar", true);
    }
}

async function eliminarPostulacion(id) {
    try {
        await db.collection('postulaciones').doc(id).delete();
        mostrarToast("Postulación eliminada");
        cargarPostulaciones(false);
    } catch (err) {
        mostrarToast("Error al eliminar", true);
    }
}

/* ---------- HELPERS DE UI ---------- */

function statChip(icono, valor, etiqueta, colorClase = 'text-slate-700') {
    return `
    <div class="stat-chip px-4 py-3 flex items-center gap-3">
        <i class="fas ${icono} ${colorClase}"></i>
        <div>
            <p class="font-black text-sm leading-none ${colorClase}">${valor}</p>
            <p class="text-slate-400 text-[11px] mt-1">${etiqueta}</p>
        </div>
    </div>`;
}

function estadoVacio(icono, titulo, texto, claseExtra = '') {
    return `
    <div class="card p-10 text-center ${claseExtra}">
        <div class="w-14 h-14 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-4 text-xl">
            <i class="fas ${icono}"></i>
        </div>
        <p class="font-bold text-sm">${titulo}</p>
        <p class="text-slate-400 text-xs mt-1">${texto}</p>
    </div>`;
}
