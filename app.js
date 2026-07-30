const firebaseConfig = { projectId: "etereo-album" }; 
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

const loader = document.getElementById('loader');
const pinSection = document.getElementById('pin-section');
const contentSection = document.getElementById('content-section');
const renderArea = document.getElementById('render-area');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const subtituloCapitulo = document.getElementById('subtitulo-capitulo');
const metadataContainer = document.getElementById('metadata-container');
const btnDesbloquear = document.getElementById('btn-desbloquear');
const bgAudio = document.getElementById('bg-audio');
const globalPrompt = document.getElementById('global-prompt');
const promptText = document.getElementById('prompt-text');

const params = new URLSearchParams(window.location.search);
const albumId = params.get('id');
const capituloId = params.get('cap'); 

let datosAlbum = null;
let wakeLock = null;

// CONTROL DE HARDWARE: Mantener la pantalla encendida
async function mantenerPantallaActiva() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log("Wake Lock no soportado.");
    }
}

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        mantenerPantallaActiva();
    }
});

async function iniciar() {
    if (!albumId || !capituloId) {
        loader.innerText = "Error: Enlace fragmentado. Escanea la libreta correctamente.";
        return;
    }
    
    try {
        const doc = await db.collection("Albums").doc(albumId).get();
        if (doc.exists) {
            datosAlbum = doc.data();
            if (capituloId.toLowerCase() !== 'portada' && capituloId.toLowerCase() !== 'colofon') {
                if (!datosAlbum.Capitulos || !datosAlbum.Capitulos[capituloId] || !datosAlbum.Capitulos[capituloId].valor) {
                    loader.innerText = "Esta página de la libreta aún está en blanco.";
                    return;
                }
            }
            prepararSeguridad();
        } else {
            loader.innerText = "El relato no existe en nuestros registros.";
        }
    } catch (error) {
        loader.innerText = "Error de sincronización con el servidor.";
    }
}

function prepararSeguridad() {
    loader.style.display = 'none'; 
    pinSection.classList.add('active');
    
    const pinCorrecto = String(datosAlbum.Datos_Generales.pin_acceso || datosAlbum.Datos_Generales.pin || "");
    const esPublico = datosAlbum.Datos_Generales.modo_publico === true;
    const pinGuardado = localStorage.getItem(`etereo_pin_${albumId}`);

    if (esPublico || pinGuardado === pinCorrecto) {
        document.getElementById('pin-input').style.display = 'none';
        document.getElementById('pin-instruction').innerText = "Tu conexión con este fragmento está establecida.";
        btnDesbloquear.innerText = "Leer Memoria";
        
        btnDesbloquear.onclick = () => desvelarMagia(true, pinCorrecto);
    } else {
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
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]); 
        
        if (datosAlbum.Datos_Generales.soundtrack) {
            bgAudio.src = datosAlbum.Datos_Generales.soundtrack;
            bgAudio.volume = 0.4;
            bgAudio.play().catch(e => console.log("Audio bloqueado por el navegador"));
        }

        pinSection.classList.remove('active');
        mantenerPantallaActiva(); // Activamos el candado de pantalla
        renderizarFragmento();
    }
}

async function alternarPrivacidadGlobal(estadoActual) {
    const nuevoEstado = !estadoActual;
    try {
        await db.collection("Albums").doc(albumId).update({
            "Datos_Generales.modo_publico": nuevoEstado
        });
        alert(nuevoEstado ? "CANDADO ABIERTO: Cualquiera podrá leer la libreta sin PIN." : "CANDADO CERRADO: Se requerirá el PIN original.");
        window.location.reload();
    } catch (e) {
        alert("Error de permisos en la base de datos.");
    }
}

function renderizarFragmento() {
    const idMinuscula = capituloId.toLowerCase();
    
    // =========================================================================
    // A) COLOFÓN (La firma, Botón Etéreo y Botón de Compartir)
    // =========================================================================
    if (idMinuscula === 'colofon') {
        tituloCapitulo.style.display = 'none'; 
        subtituloCapitulo.style.display = 'none';
        metadataContainer.innerHTML = '';
        
        renderArea.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #A39171;">Etéreo</h2>
                <div style="width: 30px; height: 1px; background: #A39171; margin: 15px auto;"></div>
                <p style="font-size: 13px; line-height: 1.8; color: #666;">
                    Esta pieza artesanal fue ensamblada a mano integrando tecnología de memoria activa.<br><br>
                    Un puente entre lo táctil y lo eterno.
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 25px; align-items: center;">
                    <a href="https://etereomx.com" target="_blank" class="btn-colofon" style="width: 80%; margin: 0; box-sizing: border-box;">Descubre Nuestro Taller</a>
                    
                    <button id="btn-share" style="background: transparent; border: none; color: #888; font-family: 'Montserrat'; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.3s; padding: 10px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.66 16.42 22 18.08 22C19.74 22 21.08 20.66 21.08 19C21.08 17.34 19.74 16.08 18.08 16.08Z"/></svg>
                        Compartir Magia
                    </button>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const btnShare = document.getElementById('btn-share');
            if (btnShare) {
                btnShare.onclick = async () => {
                    if (navigator.share) {
                        try {
                            await navigator.share({
                                title: 'Etéreo | Taller de Memorias',
                                text: 'Descubre la magia de las libretas Etéreo que conectan el papel con tecnología NFC.',
                                url: 'https://etereomx.com'
                            });
                        } catch (err) { console.log('Share cancelado'); }
                    } else {
                        alert("Copia este enlace para compartir: https://etereomx.com");
                    }
                };
            }
        }, 100);

        globalPrompt.style.display = 'none';
        contentSection.classList.add('active');
        return;
    }

    // =========================================================================
    // B) PORTADA
    // =========================================================================
    if (idMinuscula === 'portada') {
        tituloCapitulo.style.display = 'none'; 
        subtituloCapitulo.style.display = 'none';
        metadataContainer.innerHTML = '';
        
        const datosCapitulo = (datosAlbum.Capitulos && datosAlbum.Capitulos[capituloId]) ? datosAlbum.Capitulos[capituloId] : {};
        const tituloAlbum = datosAlbum.Datos_Generales.titulo || "Memorias en Papel y Éter";
        const mensajePortada = datosCapitulo.valor || "Este libro resguarda fragmentos de luz, sonido y palabras.";
        const esPublico = datosAlbum.Datos_Generales.modo_publico === true;
        
        const parrafos = mensajePortada.split('\n').filter(p => p.trim() !== '');
        let htmlMensaje = '';
        parrafos.forEach((p, i) => {
            const claseAdicional = i === 0 ? 'carta-text' : '';
            htmlMensaje += `<p class="carta-parrafo ${claseAdicional}" style="animation-delay: ${i * 0.4}s; font-family: 'Cormorant Garamond', serif; font-size: 16px; text-align: center;">${p}</p>`;
        });

        renderArea.innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #A39171; font-style: italic;">${tituloAlbum}</h2>
                <div style="width: 40px; height: 1px; background: #A39171; margin: 20px auto;"></div>
                <div style="margin-bottom: 35px;">${htmlMensaje}</div>
                <div class="privacy-toggle">
                    <span>Ajustes del Propietario</span>
                    <button class="toggle-btn" onclick="alternarPrivacidadGlobal(${esPublico})">
                        ${esPublico ? "Bloquear Libreta (Requerir PIN)" : "Abrir Libreta (Quitar PIN para todos)"}
                    </button>
                </div>
            </div>
        `;
        
        globalPrompt.style.display = 'flex';
        promptText.innerText = "Abre la libreta y acerca tu dispositivo a la primera página";
        contentSection.classList.add('active');
        return; 
    }

    // =========================================================================
    // C) CAPÍTULOS INTERNOS NORMALES
    // =========================================================================
    const datosCapitulo = datosAlbum.Capitulos[capituloId];
    
    tituloCapitulo.style.display = 'block'; 
    subtituloCapitulo.style.display = 'block';
    globalPrompt.style.display = 'flex';
    promptText.innerText = "Acerca tu dispositivo al siguiente punto";

    tituloCapitulo.innerText = datosCapitulo.titulo || `Capítulo ${capituloId}`;
    subtituloCapitulo.innerText = `Fragmento ${capituloId}`;
    
    if (datosCapitulo.fecha || datosCapitulo.ubicacion) {
        const metadatos = [datosCapitulo.ubicacion, datosCapitulo.fecha].filter(Boolean).join(" — ");
        metadataContainer.innerHTML = `<div class="metadata-line">${metadatos}</div>`;
    } else {
        metadataContainer.innerHTML = '';
    }
    
    switch (datosCapitulo.tipo_contenido) {
        case 'carta':
            const parrafos = datosCapitulo.valor.split('\n').filter(p => p.trim() !== '');
            let htmlCarta = '';
            parrafos.forEach((p, index) => {
                const delay = index * 0.4;
                const claseAdicional = index === 0 ? 'carta-text' : '';
                htmlCarta += `<p class="carta-parrafo ${claseAdicional}" style="animation-delay: ${delay}s; font-family: 'Cormorant Garamond', serif; font-size: 19px; line-height: 1.8; text-align: justify; color: #333;">${p}</p>`;
            });
            renderArea.innerHTML = htmlCarta;
            break;

        case 'spotify':
            let link = datosCapitulo.valor;
            const match = link.match(/(?:track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
            if (match) link = `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator`;
            renderArea.innerHTML = `<iframe src="${link}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"></iframe>`;
            break;

        case 'imagen':
            renderArea.innerHTML = `
                <div class="foto-polaroid">
                    <img src="${datosCapitulo.valor}" alt="Memoria visual">
                </div>`;
            break;

        case 'audio':
            let urlAudio = datosCapitulo.valor.trim();
            if (urlAudio.includes("cloudinary.com")) {
                urlAudio = urlAudio.replace(/\.[^/.]+$/, ".mp3"); // Transcodificación al vuelo a MP3
            }

            renderArea.innerHTML = `
                <div style="background: #FDFCFB; border: 1px solid #A39171; padding: 25px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 15px; box-shadow: 0 10px 20px rgba(163, 145, 113, 0.05);">
                    <div style="color: #A39171; font-family: 'Montserrat'; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Cápsula de Voz</div>
                    <button id="custom-play-btn" style="width: 50px; height: 50px; border-radius: 50%; background: #A39171; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(163, 145, 113, 0.3);">
                        <svg id="icon-play" width="16" height="16" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5V19L19 12L8 5Z"/></svg>
                        <svg id="icon-pause" width="16" height="16" viewBox="0 0 24 24" fill="#FFF" style="display: none;"><path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z"/></svg>
                    </button>
                    <div id="audio-progress-bar" style="width: 80%; height: 2px; background: #EAEAEA; border-radius: 2px; overflow: hidden; margin-top: 5px;">
                        <div id="audio-progress" style="width: 0%; height: 100%; background: #A39171; transition: width 0.1s linear;"></div>
                    </div>
                    <audio id="hidden-audio" preload="auto" crossorigin="anonymous">
                        <source src="${urlAudio}">
                    </audio>
                </div>`;

            setTimeout(() => {
                const audioEl = document.getElementById('hidden-audio');
                const playBtn = document.getElementById('custom-play-btn');
                const iconPlay = document.getElementById('icon-play');
                const iconPause = document.getElementById('icon-pause');
                const progressBar = document.getElementById('audio-progress');

                audioEl.load();

                playBtn.onclick = () => {
                    if (audioEl.paused) {
                        const playPromise = audioEl.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                iconPlay.style.display = 'none';
                                iconPause.style.display = 'block';
                                playBtn.style.transform = 'scale(1.05)';
                                if(navigator.vibrate) navigator.vibrate(30);
                            }).catch(error => {
                                alert("Cargando el éter... toca reproducir nuevamente.");
                                audioEl.load(); 
                            });
                        }
                    } else {
                        audioEl.pause();
                        iconPlay.style.display = 'block';
                        iconPause.style.display = 'none';
                        playBtn.style.transform = 'scale(1)';
                    }
                };

                audioEl.ontimeupdate = () => {
                    if (!isNaN(audioEl.duration) && audioEl.duration > 0) {
                        const porcentaje = (audioEl.currentTime / audioEl.duration) * 100;
                        progressBar.style.width = `${porcentaje}%`;
                    }
                };

                audioEl.onended = () => {
                    iconPlay.style.display = 'block';
                    iconPause.style.display = 'none';
                    progressBar.style.width = '0%';
                    playBtn.style.transform = 'scale(1)';
                };
            }, 100);
            break;
    }

    contentSection.classList.add('active');
}

iniciar();
