// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = { projectId: "etereo-album" };
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// 2. REFERENCIAS AL DOM
const loader = document.getElementById('loader');
const pinSection = document.getElementById('pin-section');
const contentSection = document.getElementById('content-section');
const renderArea = document.getElementById('render-area');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const subtituloCapitulo = document.getElementById('subtitulo-capitulo');
const btnDesbloquear = document.getElementById('btn-desbloquear');
const phygitalPrompt = document.getElementById('phygital-prompt');

// 3. EXTRACCIÓN DE PARÁMETROS DEL CHIP NFC
const params = new URLSearchParams(window.location.search);
const albumId = params.get('id');
const capituloId = params.get('cap'); 

let datosAlbum = null;

// 4. INICIALIZACIÓN
async function iniciar() {
    if (!albumId || !capituloId) {
        loader.innerText = "Error: Enlace fragmentado. Asegúrate de escanear correctamente el punto físico.";
        return;
    }
    
    try {
        const doc = await db.collection("Albums").doc(albumId).get();
        
        if (doc.exists) {
            datosAlbum = doc.data();
            
            // Verificamos si este capítulo/portada en particular tiene contenido
            if (!datosAlbum.Capitulos || !datosAlbum.Capitulos[capituloId]) {
                loader.innerText = "Esta hoja de la libreta aún está en blanco.";
                return;
            }

            loader.style.display = 'none'; 
            pinSection.classList.add('active'); 
        } else {
            loader.innerText = "El relato no existe en nuestros registros.";
        }
    } catch (error) {
        console.error("Error al conectar:", error);
        loader.innerText = "Error de sincronización con el servidor.";
    }
}

// 5. VALIDACIÓN DE SEGURIDAD Y HAPTIC FEEDBACK
btnDesbloquear.addEventListener('click', () => {
    const pin = document.getElementById('pin-input').value;
    
    if (pin === datosAlbum.Datos_Generales.pin_acceso) {
        // Sutil confirmación háptica (vibra el teléfono si lo soporta)
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]); 
        
        pinSection.classList.remove('active');
        renderizarFragmento(); 
    } else {
        // Vibración de error
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        document.getElementById('error-msg').innerText = "PIN incorrecto.";
    }
});

// 6. MOTOR DE BIFURCACIÓN DE RENDERIZADO
function renderizarFragmento() {
    const datosCapitulo = datosAlbum.Capitulos[capituloId];

    // =========================================================================
    // CASO A: SI ES LA PORTADA (Ex Libris)
    // =========================================================================
    if (capituloId.toLowerCase() === 'portada') {
        
        tituloCapitulo.style.display = 'none'; 
        subtituloCapitulo.style.display = 'none';
        if (phygitalPrompt) phygitalPrompt.style.display = 'none'; // Ocultamos el prompt interno
        
        const tituloAlbum = datosAlbum.Datos_Generales.titulo || "Memorias en Papel y Éter";
        
        renderArea.innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #A39171; margin-bottom: 5px; font-style: italic;">
                    ${tituloAlbum}
                </h2>
                
                <div style="width: 40px; height: 1px; background: #A39171; margin: 20px auto;"></div>
                
                <p class="carta-text" style="font-size: 16px; text-align: center; margin-bottom: 35px;">
                    ${datosCapitulo.valor ? datosCapitulo.valor.replace(/\n/g, '<br>') : 'Este álbum resguarda fragmentos de luz, sonido y palabras. Una extensión digital de las memorias que sostienes en tus manos.'}
                </p>
                
                <div style="padding: 15px; border: 1px dashed #DCDCDC; border-radius: 8px; background: rgba(255,255,255,0.4); display: inline-block;">
                    <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin: 0; font-family: 'Montserrat', sans-serif;">
                        <strong>Guía de lectura:</strong><br><br>
                        Abre tu libreta artesanal y explora sus páginas.<br>Acerca tu dispositivo a los emblemas ocultos para desvelar cada fragmento.
                    </p>
                </div>
            </div>
        `;
        
        contentSection.classList.add('active');
        return; // Detenemos la ejecución aquí.
    }

    // =========================================================================
    // CASO B: SI ES UN CAPÍTULO INTERNO (cap=1, cap=2, etc.)
    // =========================================================================
    
    // Restauramos visibilidad
    tituloCapitulo.style.display = 'block'; 
    subtituloCapitulo.style.display = 'block';
    if (phygitalPrompt) phygitalPrompt.style.display = 'flex';

    tituloCapitulo.innerText = datosCapitulo.titulo;
    subtituloCapitulo.innerText = `Capítulo ${capituloId}`;
    
    // Motor Switch para componentes
    switch (datosCapitulo.tipo_contenido) {
        case 'carta':
        case 'mensaje':
            renderArea.innerHTML = `<div class="carta-text">${datosCapitulo.valor.replace(/\n/g, '<br>')}</div>`;
            break;
            
        case 'spotify':
            let link = datosCapitulo.valor;
            const match = link.match(/(?:track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
            if (match) {
                link = `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator`;
            }
            renderArea.innerHTML = `<iframe src="${link}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px;"></iframe>`;
            break;
            
        case 'imagen':
            renderArea.innerHTML = `
                <div style="padding: 10px; background: #FFF; border-radius: 6px; border: 1px solid #EAEAEA; box-shadow: 0 15px 35px rgba(163, 145, 113, 0.15);">
                    <img src="${datosCapitulo.valor}" style="width: 100%; border-radius: 4px; display: block; object-fit: cover;">
                </div>`;
            break;
            
        case 'audio':
            renderArea.innerHTML = `
                <div style="background: #1A1A1A; padding: 25px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="#A39171"/>
                        </svg>
                        <span style="color: #A39171; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Cápsula de Voz</span>
                    </div>
                    <audio controls style="width: 100%; height: 40px; outline: none; border-radius: 30px;" controlsList="nodownload">
                        <source src="${datosCapitulo.valor}" type="audio/mpeg">
                    </audio>
                </div>`;
            break;
            
        case 'mapa':
            renderArea.innerHTML = `<iframe src="${datosCapitulo.valor}" width="100%" height="350" allowfullscreen="" loading="lazy" style="border:none; border-radius: 8px;"></iframe>`;
            break;
            
        default:
            renderArea.innerHTML = `<p style="font-size: 15px; color: #444;">${datosCapitulo.valor}</p>`;
            break;
    }

    contentSection.classList.add('active');
}

// 7. ARRANQUE
iniciar();
