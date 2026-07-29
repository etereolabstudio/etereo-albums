const firebaseConfig = { projectId: "etereo-album" };
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// Referencias UI
const loader = document.getElementById('loader');
const pinSection = document.getElementById('pin-section');
const contentSection = document.getElementById('content-section');
const renderArea = document.getElementById('render-area');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const subtituloCapitulo = document.getElementById('subtitulo-capitulo');
const pageIndicator = document.getElementById('page-indicator');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// El chip NFC ahora SOLO necesita el ID del álbum (Ej. ?id=ET-001)
const params = new URLSearchParams(window.location.search);
const albumId = params.get('id');

let datosAlbum = null;
let ordenCapitulos = ['portada', '1', '2', '3', '4'];
let indiceActual = 0; // 0 = portada

async function iniciar() {
    if (!albumId) {
        loader.innerText = "Error: Falta la llave de origen (ID).";
        return;
    }
    try {
        const doc = await db.collection("Albums").doc(albumId).get();
        if (doc.exists) {
            datosAlbum = doc.data();
            loader.style.display = 'none'; 
            pinSection.classList.add('active'); 
        } else {
            loader.innerText = "El relato no existe en el éter.";
        }
    } catch (error) {
        loader.innerText = "Error de conexión satelital.";
    }
}

// Validación de Seguridad
document.getElementById('btn-desbloquear').addEventListener('click', () => {
    const pin = document.getElementById('pin-input').value;
    if (pin === datosAlbum.Datos_Generales.pin_acceso) {
        // Haptic feedback de éxito (vibra 50ms)
        if(navigator.vibrate) navigator.vibrate(50);
        
        pinSection.classList.remove('active');
        indiceActual = 0; // Siempre iniciamos en la portada
        renderizarPagina(); 
    } else {
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]); // Vibración de error
        document.getElementById('error-msg').innerText = "PIN incorrecto. Intenta de nuevo.";
    }
});

// MOTOR DE PAGINACIÓN (Libro Virtual)
function renderizarPagina() {
    // 1. Reiniciar la animación forzando un reflow del DOM
    contentSection.classList.remove('active');
    void contentSection.offsetWidth; 

    // 2. Extraer datos del capítulo actual
    const claveCapitulo = ordenCapitulos[indiceActual];
    const datosCapitulo = datosAlbum.Capitulos[claveCapitulo];

    if (!datosCapitulo || !datosCapitulo.valor) {
        renderArea.innerHTML = "<p>Esta página aún está en blanco.</p>";
    } else {
        tituloCapitulo.innerText = datosCapitulo.titulo;
        subtituloCapitulo.innerText = claveCapitulo === 'portada' ? "Prefacio" : `Capítulo ${claveCapitulo}`;
        
        // El Switch Maestro de Renderizado
        switch (datosCapitulo.tipo_contenido) {
            case 'carta':
            case 'mensaje':
                renderArea.innerHTML = `<div class="carta-text">${datosCapitulo.valor.replace(/\n/g, '<br>')}</div>`;
                break;
            case 'spotify':
                let link = datosCapitulo.valor;
                const match = link.match(/(?:track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
                if (match) link = `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator`;
                renderArea.innerHTML = `<iframe src="${link}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px;"></iframe>`;
                break;
            case 'imagen':
                renderArea.innerHTML = `<div style="padding: 10px; background: #FFF; border-radius: 6px; border: 1px solid #EAEAEA; box-shadow: 0 10px 20px rgba(0,0,0,0.05);"><img src="${datosCapitulo.valor}" style="width: 100%; border-radius: 4px; display: block; object-fit: cover;"></div>`;
                break;
            case 'audio':
                renderArea.innerHTML = `<div style="background: #1A1A1A; padding: 25px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px;"><div style="display: flex; align-items: center; gap: 10px; justify-content: center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="#A39171"/></svg><span style="color: #A39171; font-family: 'Montserrat'; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Cápsula de Voz</span></div><audio controls style="width: 100%; height: 40px; border-radius: 30px;" controlsList="nodownload"><source src="${datosCapitulo.valor}" type="audio/mpeg"></audio></div>`;
                break;
            case 'mapa':
                renderArea.innerHTML = `<iframe src="${datosCapitulo.valor}" width="100%" height="350" allowfullscreen="" loading="lazy" style="border:none; border-radius: 8px;"></iframe>`;
                break;
        }
    }

    // 3. Actualizar controles de navegación
    pageIndicator.innerText = claveCapitulo === 'portada' ? "Portada" : `Pág. ${indiceActual}`;
    btnPrev.disabled = indiceActual === 0;
    btnNext.disabled = indiceActual === (ordenCapitulos.length - 1);

    // 4. Activar animación de entrada
    contentSection.classList.add('active');
}

// Eventos de Navegación (Pasar Página)
btnNext.addEventListener('click', () => {
    if (indiceActual < ordenCapitulos.length - 1) {
        if(navigator.vibrate) navigator.vibrate(30); // Respuesta táctil
        indiceActual++;
        renderizarPagina();
    }
});

btnPrev.addEventListener('click', () => {
    if (indiceActual > 0) {
        if(navigator.vibrate) navigator.vibrate(30);
        indiceActual--;
        renderizarPagina();
    }
});

iniciar();
