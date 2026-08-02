const firebaseConfig = { projectId: "etereo-album" }; 
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes latidoEtereo {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(163, 145, 113, 0.4); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(163, 145, 113, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(163, 145, 113, 0); }
  }
`;
document.head.appendChild(styleSheet);

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

async function mantenerPantallaActiva() {
    try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } } 
    catch (err) { console.log("Wake Lock no soportado."); }
}

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') { mantenerPantallaActiva(); }
});

async function iniciar() {
    if (!albumId || !capituloId) {
        loader.innerText = "El éter no reconoce esta memoria. Verifica el escaneo.";
        return;
    }

    const esPortada = capituloId.toLowerCase() === 'portada';
    const esColofon = capituloId.toLowerCase() === 'colofon';

    const unboxingOverlay = document.createElement('div');
    unboxingOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #1A1A1A; z-index: 9999; display: flex; align-items: center; justify-content: center; flex-direction: column; transition: opacity 1.5s ease, visibility 1.5s; padding: 20px; text-align: center; box-sizing: border-box;";
    
    const textoMagico = document.createElement('div');
    let tiempoEspera = 1500; 
    
    if (esPortada) {
        textoMagico.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="#A39171" style="margin-bottom: 15px; opacity: 0.8;"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg><br>Alguien ha forjado este instante para ti...`;
        tiempoEspera = 3500; 
    } else if (esColofon) {
        textoMagico.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#A39171" style="margin-bottom: 15px; opacity: 0.8;"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg><br>Cerrando memoria...`;
    } else {
        textoMagico.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#A39171" style="margin-bottom: 10px; opacity: 0.6;"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg><br><span style="font-size: 16px;">Sintonizando fragmento...</span>`;
    }
    
    textoMagico.style.cssText = "font-family: 'Cormorant Garamond', serif; font-size: 20px; color: #A39171; font-style: italic; opacity: 0; transition: opacity 2s ease, transform 2s ease; transform: translateY(10px);";
    
    unboxingOverlay.appendChild(textoMagico);
    document.body.appendChild(unboxingOverlay);

    setTimeout(() => {
        textoMagico.style.opacity = "1";
        textoMagico.style.transform = "translateY(0)";
        if(navigator.vibrate) navigator.vibrate(esPortada ? [15, 30, 15] : 15); 
    }, 100);

    try {
        const doc = await db.collection("Albums").doc(albumId).get();
        if (doc.exists) {
            datosAlbum = doc.data();
            if (!esPortada && !esColofon) {
                if (!datosAlbum.Capitulos || !datosAlbum.Capitulos[capituloId] || !datosAlbum.Capitulos[capituloId].valor) {
                    unboxingOverlay.remove();
                    loader.innerText = "Esta página de la libreta aún está en blanco.";
                    return;
                }
            }
            setTimeout(() => {
                unboxingOverlay.style.opacity = "0";
                unboxingOverlay.style.visibility = "hidden";
                prepararSeguridad();
                setTimeout(() => unboxingOverlay.remove(), 1500);
            }, tiempoEspera); 

        } else {
            unboxingOverlay.remove();
            loader.innerText = "El relato no existe en nuestros registros.";
        }
    } catch (error) {
        unboxingOverlay.remove();
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
        document.getElementById('pin-instruction').innerText = "Conexión establecida.";
        btnDesbloquear.innerText = "Entrar";
        if(capituloId.toLowerCase() !== 'portada' && capituloId.toLowerCase() !== 'colofon'){
            desvelarMagia(true, pinCorrecto);
        } else {
            btnDesbloquear.onclick = () => desvelarMagia(true, pinCorrecto);
        }
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
            document.getElementById('error-msg').innerText = "PIN incorrecto. Revisa la libreta.";
        }
    }

    if (accesoConcedido) {
        if(navigator.vibrate && !saltoDirecto) navigator.vibrate([30, 50, 30]); 
        
        // FADE IN DE AUDIO RESTAURADO
        if (datosAlbum.Datos_Generales.soundtrack && bgAudio.paused) {
            bgAudio.src = datosAlbum.Datos_Generales.soundtrack;
            bgAudio.volume = 0.0;
            bgAudio.play().then(() => {
                let vol = 0.0;
                const fadeInterval = setInterval(() => {
                    vol += 0.05;
                    if (vol >= 0.4) { clearInterval(fadeInterval); vol = 0.4; }
                    bgAudio.volume = vol;
                }, 200);
            }).catch(e => console.log("Auto-play requiere interacción"));
        }

        pinSection.classList.remove('active');
        mantenerPantallaActiva(); 
        renderizarFragmento();
    }
}

async function alternarPrivacidadGlobal(estadoActual) {
    const nuevoEstado = !estadoActual;
    try {
        await db.collection("Albums").doc(albumId).update({ "Datos_Generales.modo_publico": nuevoEstado });
        alert(nuevoEstado ? "CANDADO ABIERTO: Cualquiera podrá leer la libreta sin PIN." : "CANDADO CERRADO: Se requerirá el PIN original.");
        window.location.reload();
    } catch (e) { alert("Error de permisos."); }
}

function renderizarFragmento() {
    const idMinuscula = capituloId.toLowerCase();
    
    // A) COLOFÓN RESTAURADO
    if (idMinuscula === 'colofon') {
        tituloCapitulo.style.display = 'none'; subtituloCapitulo.style.display = 'none'; metadataContainer.innerHTML = '';
        renderArea.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #A39171;">Etéreo</h2>
                <div style="width: 30px; height: 1px; background: #A39171; margin: 15px auto;"></div>
                <p style="font-size: 13px; line-height: 1.8; color: #666;">Esta pieza artesanal fue ensamblada a mano integrando tecnología de memoria activa.<br><br>Un puente entre lo táctil y lo eterno.</p>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 30px; align-items: center;">
                    <a href="https://etereomx.com/?utm_source=libreta_nfc&utm_medium=colofon&coupon=MAGIA15" target="_blank" style="width: 85%; padding: 14px; background: #A39171; color: #FFF; text-decoration: none; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 6px; box-shadow: 0 4px 15px rgba(163, 145, 113, 0.3);">
                        Inmortaliza tu Historia (15% Off)
                    </a>
                    <button id="btn-share" style="background: transparent; border: none; color: #888; font-family: 'Montserrat'; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 12px;">
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
                        try { await navigator.share({ title: 'Etéreo', text: 'Descubre las libretas con memorias NFC.', url: 'https://etereomx.com' }); } catch (err) {}
                    }
                };
            }
        }, 100);
        globalPrompt.style.display = 'none'; contentSection.classList.add('active'); return;
    }

    // B) PORTADA
    if (idMinuscula === 'portada') {
        tituloCapitulo.style.display = 'none'; subtituloCapitulo.style.display = 'none'; metadataContainer.innerHTML = '';
        const datosCapitulo = (datosAlbum.Capitulos && datosAlbum.Capitulos[capituloId]) ? datosAlbum.Capitulos[capituloId] : {};
        const tituloAlbum = datosAlbum.Datos_Generales.titulo || "Memorias en Papel y Éter";
        const mensajePortada = datosCapitulo.valor || "Este libro resguarda fragmentos de luz, sonido y palabras.";
        const esPublico = datosAlbum.Datos_Generales.modo_publico === true;
        
        let htmlMensaje = '';
        mensajePortada.split('\n').filter(p => p.trim() !== '').forEach((p, i) => {
            const cls = i === 0 ? 'carta-text' : '';
            htmlMensaje += `<p class="carta-parrafo ${cls}" style="animation-delay: ${i * 0.4}s; font-family: 'Cormorant Garamond', serif; font-size: 16px; text-align: center;">${p}</p>`;
        });

        renderArea.innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #A39171; font-style: italic;">${tituloAlbum}</h2>
                <div style="width: 40px; height: 1px; background: #A39171; margin: 20px auto;"></div>
                <div style="margin-bottom: 35px;">${htmlMensaje}</div>
                
                <div style="margin-top: 45px; padding: 25px 15px; background: rgba(163, 145, 113, 0.03); border: 1px solid rgba(163, 145, 113, 0.15); border-radius: 12px;">
                    <p style="font-size: 10px; color: #A39171; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0; font-weight: 700;">El viaje comienza</p>
                    <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.5;">Abre tu libreta y acerca tu celular al interior de la <b>Página 1</b> para revelar el primer recuerdo.</p>
                    <div style="width: 12px; height: 12px; margin: 20px auto 0 auto; background: #A39171; border-radius: 50%; animation: latidoEtereo 2s infinite;"></div>
                </div>

                <div class="privacy-toggle" style="margin-top: 35px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <button onclick="alternarPrivacidadGlobal(${esPublico})" style="background: transparent; border: none; color: #CCC; font-size: 9px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">
                        ${esPublico ? "🔒 Bloquear Libreta" : "🔓 Abrir Privacidad"}
                    </button>
                </div>
            </div>
        `;
        globalPrompt.style.display = 'none'; contentSection.classList.add('active'); return; 
    }

    // C) CAPÍTULOS NORMALES
    const datosCapitulo = datosAlbum.Capitulos[capituloId];
    tituloCapitulo.style.display = 'block'; subtituloCapitulo.style.display = 'block'; globalPrompt.style.display = 'flex';
    promptText.innerText = "Acerca tu dispositivo a la siguiente página";
    tituloCapitulo.innerText = datosCapitulo.titulo || `Capítulo ${capituloId}`;
    subtituloCapitulo.innerText = `Fragmento ${capituloId}`;
    
    if (datosCapitulo.ubicacion) { 
        metadataContainer.innerHTML = `<div class="metadata-line" style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 14px; color: #8B8B8B; margin-bottom: 20px; border-bottom: 1px solid #F0F0F0; padding-bottom: 10px; display: inline-block;">${datosCapitulo.ubicacion}</div>`; 
    } else { metadataContainer.innerHTML = ''; }

    // --- EL RELOJ DE ARENA RESTAURADO ---
    if (datosCapitulo.fecha_desbloqueo) {
        const fechaDesbloqueo = new Date(datosCapitulo.fecha_desbloqueo + 'T00:00:00').getTime();
        const ahora = new Date().getTime();

        if (ahora < fechaDesbloqueo) {
            renderArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: #FDFCFB; border: 1px dashed #A39171; border-radius: 12px; margin-top: 20px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#A39171" style="margin-bottom: 15px;"><path d="M12 17C13.1 17 14 16.1 14 15C14 13.9 13.1 13 12 13C10.9 13 10 13.9 10 15C10 16.1 10.9 17 12 17ZM18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM8.9 6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8H8.9V6ZM18 20H6V10H18V20Z"/></svg>
                    <h3 style="font-family: 'Cormorant Garamond', serif; color: #A39171; font-size: 22px; margin: 0 0 10px 0;">Memoria Sellada</h3>
                    <p style="font-size: 13px; color: #666; line-height: 1.6;">Este fragmento del tiempo aún no está listo para ser revelado.</p>
                    <div id="reloj-arena" style="display: flex; justify-content: center; gap: 15px; margin-top: 25px; font-family: 'Montserrat', sans-serif;">
                        <div style="text-align: center;"><div id="tiempo-dias" style="font-size: 28px; font-weight: 700; color: #1A1A1A;">00</div><div style="font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 1px;">Días</div></div>
                        <div style="font-size: 24px; color: #A39171; font-weight: 300;">:</div>
                        <div style="text-align: center;"><div id="tiempo-horas" style="font-size: 28px; font-weight: 700; color: #1A1A1A;">00</div><div style="font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 1px;">Horas</div></div>
                        <div style="font-size: 24px; color: #A39171; font-weight: 300;">:</div>
                        <div style="text-align: center;"><div id="tiempo-minutos" style="font-size: 28px; font-weight: 700; color: #1A1A1A;">00</div><div style="font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 1px;">Min</div></div>
                        <div style="font-size: 24px; color: #A39171; font-weight: 300;">:</div>
                        <div style="text-align: center;"><div id="tiempo-segundos" style="font-size: 28px; font-weight: 700; color: #A39171;">00</div><div style="font-size: 9px; text-transform: uppercase; color: #A39171; letter-spacing: 1px;">Seg</div></div>
                    </div>
                </div>
            `;
            contentSection.classList.add('active');

            const actualizarReloj = setInterval(() => {
                const distancia = fechaDesbloqueo - new Date().getTime();
                if (distancia < 0) {
                    clearInterval(actualizarReloj);
                    document.getElementById('reloj-arena').innerHTML = "<span style='color: #2E7D32; font-weight: bold;'>¡El sello se ha roto! Abriendo memoria...</span>";
                    setTimeout(() => window.location.reload(), 2000);
                    return;
                }
                const dosDigitos = (num) => num < 10 ? '0' + num : num;
                document.getElementById('tiempo-dias').innerText = dosDigitos(Math.floor(distancia / (1000 * 60 * 60 * 24)));
                document.getElementById('tiempo-horas').innerText = dosDigitos(Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                document.getElementById('tiempo-minutos').innerText = dosDigitos(Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60)));
                document.getElementById('tiempo-segundos').innerText = dosDigitos(Math.floor((distancia % (1000 * 60)) / 1000));
            }, 1000);
            return; 
        }
    }

    // --- RENDERIZADO DEL CONTENIDO DE LA MEMORIA ---
    switch (datosCapitulo.tipo_contenido) {
        case 'carta':
            let htmlCarta = '';
            datosCapitulo.valor.split('\n').filter(p => p.trim() !== '').forEach((p, index) => {
                const cls = index === 0 ? 'carta-text' : '';
                htmlCarta += `<p class="carta-parrafo ${cls}" style="animation-delay: ${index * 0.4}s; font-family: 'Cormorant Garamond', serif; font-size: 19px; line-height: 1.8; text-align: justify; color: #333;">${p}</p>`;
            });

            if (datosCapitulo.tinta_invisible) {
                renderArea.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px; font-size: 11px; color: #A39171; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5C12.88 5 14 6.12 14 7.5V13.8L15.36 13.52C15.91 13.41 16.48 13.56 16.92 13.91L20 16.41L15.22 22.38C14.77 22.95 14.07 23.29 13.33 23.29H9.42C8.01 23.29 6.81 22.31 6.54 20.93L5.43 15.38C5.23 14.39 5.86 13.43 6.85 13.23C7.21 13.16 7.58 13.2 7.9 13.34L9 13.84V11.24ZM7.44 11.45L6.46 10.96C4.85 10.15 3.99 8.28 4.41 6.46C4.79 4.86 6.13 3.68 7.76 3.42C9.8 3.1 11.66 4.46 12.08 6.36L12.19 6.84L12.3 6.36C12.72 4.46 14.58 3.1 16.62 3.42C18.25 3.68 19.59 4.86 19.97 6.46C20.39 8.28 19.53 10.15 17.92 10.96L16.94 11.45V7.5C16.94 4.5 14.5 2 11.5 2C8.5 2 6.06 4.5 6.06 7.5V11.24L7.44 11.45Z"/></svg>
                        Mantén presionado para leer
                    </div>
                    <div id="carta-confidencial" style="filter: blur(10px); transition: filter 0.8s ease, opacity 0.8s ease; opacity: 0.5; user-select: none;">
                        ${htmlCarta}
                    </div>
                `;
                setTimeout(() => {
                    const cartaEl = document.getElementById('carta-confidencial');
                    const revelar = (e) => { e.preventDefault(); cartaEl.style.filter = 'blur(0px)'; cartaEl.style.opacity = '1'; if(navigator.vibrate) navigator.vibrate(20); };
                    const ocultar = (e) => { e.preventDefault(); cartaEl.style.filter = 'blur(10px)'; cartaEl.style.opacity = '0.5'; };

                    cartaEl.addEventListener('touchstart', revelar, {passive: false});
                    cartaEl.addEventListener('touchend', ocultar);
                    cartaEl.addEventListener('touchcancel', ocultar);
                    cartaEl.addEventListener('mousedown', revelar);
                    cartaEl.addEventListener('mouseup', ocultar);
                    cartaEl.addEventListener('mouseleave', ocultar);
                }, 100);
            } else {
                renderArea.innerHTML = htmlCarta;
            }
            break;

        case 'spotify':
            // LOGICA MEJORADA: Soporta track, album y playlist sin romperse
            let link = datosCapitulo.valor;
            const match = link.match(/(?:track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
            if (match) {
                // Obtenemos el tipo (track/playlist) y el ID de la URL que pegó el cliente
                const tipo = link.match(/(track|album|playlist|episode)/)[1];
                link = `https://open.spotify.com/embed/${tipo}/${match[1]}?utm_source=generator`;
            }
            renderArea.innerHTML = `<iframe src="${link}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"></iframe>`;
            break;

        case 'imagen':
            renderArea.innerHTML = `<div class="foto-polaroid" style="background: #FFF; padding: 12px 12px 45px 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.08); transform: rotate(-1.5deg); border-radius: 3px; margin: 20px auto; width: 90%;"><img src="${datosCapitulo.valor}" alt="Memoria visual" style="width: 100%; border-radius: 2px;"></div>`;
            break;

        case 'audio':
            let urlAudio = datosCapitulo.valor.trim();
            // LÓGICA DE CLOUDINARY: Reemplaza formato de video a .mp3 para garantizar compatibilidad
            if (urlAudio.includes("cloudinary.com")) urlAudio = urlAudio.replace(/\.[^/.]+$/, ".mp3");

            renderArea.innerHTML = `
                <div style="background: #FDFCFB; border: 1px solid #A39171; padding: 25px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 15px;">
                    <div style="color: #A39171; font-family: 'Montserrat'; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Cápsula de Voz</div>
                    <button id="custom-play-btn" style="width: 50px; height: 50px; border-radius: 50%; background: #A39171; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <svg id="icon-play" width="16" height="16" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5V19L19 12L8 5Z"/></svg>
                        <svg id="icon-pause" width="16" height="16" viewBox="0 0 24 24" fill="#FFF" style="display: none;"><path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z"/></svg>
                    </button>
                    <div id="audio-progress-bar" style="width: 80%; height: 2px; background: #EAEAEA; border-radius: 2px; margin-top: 5px;">
                        <div id="audio-progress" style="width: 0%; height: 100%; background: #A39171; transition: width 0.1s linear;"></div>
                    </div>
                    <audio id="hidden-audio" preload="auto" crossorigin="anonymous"><source src="${urlAudio}"></audio>
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
                                iconPlay.style.display = 'none'; iconPause.style.display = 'block';
                                if(navigator.vibrate) navigator.vibrate(20);
                            }).catch(error => { alert("Toca de nuevo para reproducir."); audioEl.load(); });
                        }
                    } else {
                        audioEl.pause(); iconPlay.style.display = 'block'; iconPause.style.display = 'none';
                    }
                };

                audioEl.ontimeupdate = () => {
                    if (!isNaN(audioEl.duration) && audioEl.duration > 0) {
                        progressBar.style.width = `${(audioEl.currentTime / audioEl.duration) * 100}%`;
                    }
                };

                audioEl.onended = () => { 
                    iconPlay.style.display = 'block'; iconPause.style.display = 'none'; progressBar.style.width = '0%'; 
                    if(navigator.vibrate) navigator.vibrate([10, 30, 10]); 
                };
            }, 100);
            break;
    }
    contentSection.classList.add('active');
}

iniciar();
