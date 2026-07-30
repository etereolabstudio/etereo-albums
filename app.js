const firebaseConfig = { projectId: "etereo-album" }; // Tu ID de Firebase
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

// LOGICA DE SEGURIDAD RETROCOMPATIBLE
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
    // A) COLOFÓN (La firma y Bucle de Crecimiento)
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
                <a href="https://etereomx.com" target="_blank" class="btn-colofon">Descubre Nuestro Taller</a>
            </div>
        `;
        globalPrompt.style.display = 'none';
        contentSection.classList.add('active');
        return;
    }

    // =========================================================================
    // B) PORTADA (Prefacio y Puente de Acción)
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
            // 1. Limpiamos la URL de cualquier espacio o salto de línea invisible
            const urlAudio = datosCapitulo.valor.trim();

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
                    
                    <!-- 2. Forzamos la carga (preload) e incluimos el tag crossorigin -->
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

                // 3. Empujamos al navegador a leer el archivo antes de que el usuario haga clic
                audioEl.load();

                playBtn.onclick = () => {
                    if (audioEl.paused) {
                        // 4. Manejo de la "Promesa" de reproducción
                        const playPromise = audioEl.play();
                        
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                // ¡Éxito! El audio suena
                                iconPlay.style.display = 'none';
                                iconPause.style.display = 'block';
                                playBtn.style.transform = 'scale(1.05)';
                                if(navigator.vibrate) navigator.vibrate(30);
                            }).catch(error => {
                                // Si el internet es lento o iOS lo bloquea temporalmente
                                console.error("El navegador pausó la carga:", error);
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
                    // 5. Evitamos errores si la duración aún es "NaN" (Not a Number)
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
