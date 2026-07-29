// 1. CONFIGURACIÓN FIREBASE (Asegúrate de que coincida con tu proyecto)
const firebaseConfig = {
    projectId: "etereo-album" 
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// 2. REFERENCIAS A LA INTERFAZ
const loader = document.getElementById('loader');
const pinSection = document.getElementById('pin-section');
const contentSection = document.getElementById('content-section');
const btnDesbloquear = document.getElementById('btn-desbloquear');
const renderArea = document.getElementById('render-area');
const tituloCapitulo = document.getElementById('titulo-capitulo');

// 3. EXTRACCIÓN DE VARIABLES DEL CHIP NFC
const params = new URLSearchParams(window.location.search);
const albumId = params.get('id');
const capituloId = params.get('cap');

let datosAlbum = null;

// 4. INICIALIZACIÓN DE LA APLICACIÓN
async function iniciar() {
    if (!albumId || !capituloId) {
        loader.innerText = "Error: Este enlace está incompleto.";
        return;
    }

    try {
        const doc = await db.collection("Albums").doc(albumId).get();
        if (doc.exists) {
            datosAlbum = doc.data();
            loader.style.display = 'none'; // Ocultamos el cargador
            pinSection.classList.add('active'); // Mostramos el PIN
        } else {
            loader.innerText = "El libro no existe en los registros de Etéreo.";
        }
    } catch (error) {
        console.error("Error al conectar:", error);
        loader.innerText = "Error de conexión satelital.";
    }
}

// 5. VALIDACIÓN DE SEGURIDAD
btnDesbloquear.addEventListener('click', () => {
    const pinIngresado = document.getElementById('pin-input').value;
    const errorMsg = document.getElementById('error-msg');

    if (pinIngresado === datosAlbum.Datos_Generales.pin_acceso) {
        pinSection.classList.remove('active');
        renderizarContenido(); // El PIN es correcto, procedemos a renderizar
    } else {
        errorMsg.innerText = "PIN incorrecto. Intenta de nuevo.";
    }
});

// 6. EL MOTOR DE RENDERIZADO CONDICIONAL
function renderizarContenido() {
    // Apuntamos matemáticamente al capítulo correcto
    const datosCapitulo = datosAlbum.Capitulos[capituloId];

    if (!datosCapitulo) {
        contentSection.innerHTML = "<h2>Capítulo vacío o no encontrado.</h2>";
        contentSection.classList.add('active');
        return;
    }

    // Inyectamos el título
    tituloCapitulo.innerText = datosCapitulo.titulo;
    renderArea.innerHTML = ""; // Limpiamos el lienzo

    // Evaluamos la variable 'tipo_contenido' para construir la UI
    switch (datosCapitulo.tipo_contenido) {
        
        case 'carta':
            // Se inyecta un bloque div estilizado como literatura clásica
            renderArea.innerHTML = `<div class="carta-text">${datosCapitulo.valor}</div>`;
            break;
            
        case 'spotify':
            let linkOriginal = datosCapitulo.valor;
            let enlaceEmbed = linkOriginal;
            
            // Usamos Regex para extraer el ID exacto de la canción, ignorando basura o formatos 'intl-es'
            const regex = /(?:track|album|playlist|episode)\/([a-zA-Z0-9]+)/;
            const coincidencia = linkOriginal.match(regex);

            if (coincidencia && coincidencia[1]) {
                const idAudio = coincidencia[1];
                // Reconstruimos el enlace maestro autorizado por Spotify
                enlaceEmbed = `https://open.spotify.com/embed/track/${idAudio}?utm_source=generator`;
            }
            
            // Renderizamos el iframe sin errores de seguridad
            renderArea.innerHTML = `<iframe src="${enlaceEmbed}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px;"></iframe>`;
            break;
            
        case 'audio':
            // Se inyecta un reproductor de audio nativo de HTML5
            renderArea.innerHTML = `
                <div style="margin-top: 20px; padding: 20px; background: #FAFAFA; border-radius: 8px; border: 1px solid #EAEAEA;">
                    <audio controls style="width: 100%; outline: none;">
                        <source src="${datosCapitulo.valor}" type="audio/mpeg">
                        Tu navegador no soporta el audio.
                    </audio>
                </div>`;
            break;
            
        case 'mapa':
            // Se inyecta un mapa de Google interactivo. El cliente debe darte un enlace "Embed" o de "Insertar mapa" de Google Maps
            renderArea.innerHTML = `<iframe src="${datosCapitulo.valor}" width="100%" height="350" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
            break;
            
        default:
            // Comportamiento por defecto (mensajes de texto simple o bienvenidas)
            renderArea.innerHTML = `<p style="font-size: 15px; line-height: 1.6; color: #444;">${datosCapitulo.valor}</p>`;
            break;
    }

    // Finalmente, mostramos la sección ya ensamblada
    contentSection.classList.add('active');
}

// Arrancamos el flujo
iniciar();
