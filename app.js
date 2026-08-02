// 1. INICIALIZACIÓN Y VARIABLES GLOBALES
const firebaseConfig = { projectId: "etereo-album" }; // Asegúrate de que coincida con tu proyecto
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// Referencias al DOM
const loader = document.getElementById('loader');
const pinSection = document.getElementById('pin-section');
const contentSection = document.getElementById('content-section');
const renderArea = document.getElementById('render-area');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const subtituloCapitulo = document.getElementById('subtitulo-capitulo');
const btnDesbloquear = document.getElementById('btn-desbloquear');
const globalPrompt = document.getElementById('global-prompt');

// Extracción de parámetros NFC (Ej: misitio.com/?id=andres-123&cap=cap1)
const params = new URLSearchParams(window.location.search);
const albumId = params.get('id');
const capituloId = params.get('cap'); 

let datosAlbum = null;

// ==========================================
// 2. NÚCLEO DE CARGA Y DESBLOQUEO
// ==========================================
async function iniciar() {
    if (!albumId || !capituloId) {
        loader.innerText = "Faltan coordenadas en el enlace NFC.";
        return;
    }

    try {
        const doc = await db.collection("Albums").doc(albumId).get();
        if (doc.exists) {
            datosAlbum = doc.data();
            verificarSeguridad();
        } else {
            loader.innerText = "Esta memoria no existe en los registros de Etéreo.";
        }
    } catch (error) {
        console.error("Error Firestore:", error);
        loader.innerText = "Error de sincronización con el servidor.";
    }
}

function verificarSeguridad() {
    loader.style.display = 'none'; 
    pinSection.classList.add('active');
    
    // Obtenemos el PIN desde Firebase
    const pinCorrecto = String(datosAlbum.Datos_Generales.pin_acceso || "");
    const pinGuardado = localStorage.getItem(`etereo_pin_${albumId}`);

    // Si no hay PIN configurado o el usuario ya lo ingresó antes en su navegador
    if (pinCorrecto === "" || pinGuardado === pinCorrecto) {
        if(capituloId.toLowerCase() !== 'portada'){
            // Entrar directo si ya tiene el PIN validado y está en un capítulo
            desvelarMagia(true, pinCorrecto);
        } else {
            // Si es la portada, le pedimos tocar el botón para iniciar animaciones y audio
            document.getElementById('pin-input').style.display = 'none';
            document.getElementById('pin-instruction').innerText = "Conexión establecida.";
            btnDesbloquear.innerText = "Abrir Libreta";
            btnDesbloquear.onclick = () => desvelarMagia(true, pinCorrecto);
        }
    } else {
        // Pedir PIN
        btnDesbloquear.onclick = () => desvelarMagia(false, pinCorrecto);
    }
}

function desvelarMagia(saltoDirecto, pinCorrecto) {
    let accesoConcedido = saltoDirecto;

    if (!saltoDirecto) {
        const pinIngresado = document.getElementById('pin-input').value;
        if (pinIngresado === pinCorrecto) {
            accesoConcedido = true;
            localStorage.setItem(`etereo_pin_${albumId}`, pinIngresado);
        } else {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]); 
            document.getElementById('error-msg').innerText = "PIN incorrecto.";
        }
    }

    if (accesoConcedido) {
        if(navigator.vibrate && !saltoDirecto) navigator.vibrate([30, 50, 30]); 
        pinSection.classList.remove('active');
        renderizarFragmento();
    }
}

// ==========================================
// 3. RENDERIZADO DINÁMICO POR CAPÍTULO
// ==========================================
function renderizarFragmento() {
    const idMinuscula = capituloId.toLowerCase();
    
    // --- ESCENARIO A: LA PORTADA ---
    if (idMinuscula === 'portada') {
        tituloCapitulo.style.display = 'none'; 
        subtituloCapitulo.style.display = 'none'; 
        
        const tituloAlbum = datosAlbum.Datos_Generales.titulo || "Memorias en Papel";
        const mensajePortada = datosAlbum.Capitulos.portada.valor || "Has recibido un fragmento de tiempo forjado a mano.";

        renderArea.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #A39171; font-style: italic;">${tituloAlbum}</h2>
                <div style="width: 40px; height: 1px; background: #A39171; margin: 20px auto;"></div>
                <p style="font-family: 'Cormorant Garamond', serif; font-size: 18px; line-height: 1.6;">${mensajePortada}</p>
                
                <div style="margin-top: 50px; padding: 20px; background: rgba(163, 145, 113, 0.05); border-radius: 12px; border: 1px solid rgba(163, 145, 113, 0.2);">
                    <p style="font-size: 11px; color: #A39171; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0; font-weight: 600;">Instrucciones</p>
                    <p style="font-size: 13px; color: #555; margin: 0;">Abre tu libreta y acerca tu celular al interior del <b>Capítulo 1</b> para iniciar el viaje.</p>
                </div>
            </div>
        `;
        globalPrompt.style.display = 'none'; // En la portada no se muestra el prompt general
        contentSection.classList.add('active'); 
        return; 
    }

    // --- ESCENARIO B: LOS CAPÍTULOS (1 al 4) ---
    const datosCapitulo = datosAlbum.Capitulos[capituloId];
    if (!datosCapitulo) {
        renderArea.innerHTML = "<p>Esta página de la libreta aún está en blanco.</p>";
        contentSection.classList.add('active');
        return;
    }

    // Títulos dinámicos
    tituloCapitulo.style.display = 'block'; 
    subtituloCapitulo.style.display = 'block'; 
    tituloCapitulo.innerText = datosCapitulo.titulo || `Capítulo ${capituloId.replace('cap', '')}`;
    subtituloCapitulo.innerText = "Memoria Activa";
    globalPrompt.style.display = 'flex';

    // VERIFICACIÓN DE CÁPSULA DEL TIEMPO (Capítulo 4)
    if (datosCapitulo.fecha_desbloqueo) {
        const fechaDesbloqueo = new Date(datosCapitulo.fecha_desbloqueo + 'T00:00:00').getTime();
        const ahora = new Date().getTime();

        if (ahora < fechaDesbloqueo) {
            renderArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; border: 1px dashed #A39171; border-radius: 12px; margin-top: 20px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#A39171" style="margin-bottom: 15px;"><path d="M12 17C13.1 17 14 16.1 14 15C14 13.9 13.1 13 12 13C10.9 13 10 13.9 10 15C10 16.1 10.9 17 12 17ZM18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8Z"/></svg>
                    <h3 style="font-family: 'Cormorant Garamond', serif; color: #A39171; font-size: 22px; margin: 0 0 10px 0;">Memoria Sellada</h3>
                    <p style="font-size: 13px; color: #666; line-height: 1.6;">Este fragmento pertenece al futuro. Regresa cuando el tiempo lo dicte.</p>
                    <div id="tiempo-restante" style="margin-top: 20px; font-size: 18px; font-weight: bold; color: #1A1A1A;">Calculando...</div>
                </div>
            `;
            contentSection.classList.add('active');

            const timer = setInterval(() => {
                const dist = fechaDesbloqueo - new Date().getTime();
                if (dist < 0) { clearInterval(timer); window.location.reload(); return; }
                const dias = Math.floor(dist / (1000 * 60 * 60 * 24));
                const horas = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                document.getElementById('tiempo-restante').innerText = `Faltan ${dias} días y ${horas} horas`;
            }, 1000);
            return; // Detiene el renderizado aquí para no mostrar el contenido
        }
    }

    // RENDERIZADO SEGÚN EL TIPO DE CONTENIDO ALMACENADO
    switch (datosCapitulo.tipo_contenido) {
        
        // 1. CARTA O TEXTO INVISIBLE
        case 'carta':
            let htmlCarta = `<div style="font-family: 'Cormorant Garamond', serif; font-size: 18px; line-height: 1.8; text-align: justify; color: #333; padding: 10px;">${datosCapitulo.valor.replace(/\n/g, '<br>')}</div>`;
            
            if (datosCapitulo.tinta_invisible) {
                renderArea.innerHTML = `
                    <div style="font-size: 11px; color: #A39171; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">Mantén presionado para revelar la tinta</div>
                    <div id="texto-secreto" style="filter: blur(8px); opacity: 0.5; transition: 0.5s ease; user-select: none;">${htmlCarta}</div>
                `;
                setTimeout(() => {
                    const txtObj = document.getElementById('texto-secreto');
                    const mostrar = (e) => { e.preventDefault(); txtObj.style.filter = 'blur(0)'; txtObj.style.opacity = '1'; };
                    const ocultar = (e) => { e.preventDefault(); txtObj.style.filter = 'blur(8px)'; txtObj.style.opacity = '0.5'; };
                    txtObj.addEventListener('touchstart', mostrar, {passive: false});
                    txtObj.addEventListener('touchend', ocultar);
                    txtObj.addEventListener('mousedown', mostrar);
                    txtObj.addEventListener('mouseup', ocultar);
                }, 100);
            } else {
                renderArea.innerHTML = htmlCarta;
            }
            break;

        // 2. IMAGEN DE CLOUDINARY (Efecto Polaroid)
        case 'imagen':
            renderArea.innerHTML = `
                <div class="foto-polaroid">
                    <img src="${datosCapitulo.valor}" alt="Recuerdo Etéreo">
                </div>
            `;
            break;

        // 3. AUDIO DE CLOUDINARY (Reproductor Custom)
        case 'audio':
            renderArea.innerHTML = `
                <div style="background: #FDFCFB; border: 1px solid #A39171; padding: 25px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 15px;">
                    <div style="color: #A39171; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Cápsula de Voz</div>
                    <button id="btn-play-audio" style="width: 55px; height: 55px; border-radius: 50%; background: #A39171; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 20px rgba(163, 145, 113, 0.3);">
                        <svg id="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5V19L19 12L8 5Z"/></svg>
                        <svg id="icon-pause" width="20" height="20" viewBox="0 0 24 24" fill="#FFF" style="display: none;"><path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z"/></svg>
                    </button>
                    <div id="progress-container" style="width: 100%; height: 4px; background: #EAEAEA; border-radius: 2px; margin-top: 10px; overflow: hidden;">
                        <div id="progress-bar" style="width: 0%; height: 100%; background: #A39171; transition: width 0.1s linear;"></div>
                    </div>
                    <audio id="audio-elemento" src="${datosCapitulo.valor}" crossorigin="anonymous"></audio>
                </div>
            `;

            setTimeout(() => {
                const track = document.getElementById('audio-elemento');
                const btn = document.getElementById('btn-play-audio');
                const playIco = document.getElementById('icon-play');
                const pauseIco = document.getElementById('icon-pause');
                const bar = document.getElementById('progress-bar');

                btn.onclick = () => {
                    if (track.paused) {
                        track.play(); playIco.style.display = 'none'; pauseIco.style.display = 'block';
                    } else {
                        track.pause(); playIco.style.display = 'block'; pauseIco.style.display = 'none';
                    }
                };

                track.ontimeupdate = () => { bar.style.width = `${(track.currentTime / track.duration) * 100}%`; };
                track.onended = () => { playIco.style.display = 'block'; pauseIco.style.display = 'none'; bar.style.width = '0%'; };
            }, 100);
            break;

        // 4. PLAYLIST O CANCIÓN DE SPOTIFY
        case 'spotify':
            // Lógica para convertir URL normal de Spotify a formato iFrame Embed
            let spotifyUrl = datosCapitulo.valor;
            const match = spotifyUrl.match(/(track|album|playlist)\/([a-zA-Z0-9]+)/);
            if (match) {
                spotifyUrl = `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`;
            }
            renderArea.innerHTML = `
                <iframe src="${spotifyUrl}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); margin-top: 15px;"></iframe>
            `;
            break;
    }

    contentSection.classList.add('active');
}

// Arrancar la magia al cargar la página
iniciar();
