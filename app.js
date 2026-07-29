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

// LOGICA DE SEGURIDAD (Local Storage + Global)
function prepararSeguridad() {
    loader.style.display = 'none'; 
    pinSection.classList.add('active');
    
    // Verificamos si el album es público O si este celular ya tiene el PIN guardado
    const pinGuardado = localStorage.getItem(`etereo_pin_${albumId}`);
    const esPublico = datosAlbum.Datos_Generales.modo_publico === true;

    if (esPublico || pinGuardado === datosAlbum.Datos_Generales.pin_acceso) {
        // No pedimos PIN, pero requerimos que aprieten el botón para que el navegador nos deje reproducir música
        document.getElementById('pin-input').style.display = 'none';
        document.getElementById('pin-instruction').innerText = "Tu conexión con este fragmento está establecida.";
        btnDesbloquear.innerText = "Leer Memoria";
        
        // Asignamos el evento de pasar directo
        btnDesbloquear.onclick = () => desvelarMagia(true);
    } else {
        // Si necesita PIN
        btnDesbloquear.onclick = () => desvelarMagia(false);
    }
}

function desvelarMagia(saltoDirecto) {
    let accesoConcedido = saltoDirecto;

    if (!saltoDirecto) {
        const pinIngresado = document.getElementById('pin-input').value;
        if (pinIngresado === datosAlbum.Datos_Generales.pin_acceso) {
            accesoConcedido = true;
            // Guardamos el PIN en la memoria del celular del cliente para que no lo vuelva a pedir
            localStorage.setItem(`etereo_pin_${albumId}`, pinIngresado);
        } else {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]); 
            document.getElementById('error-msg').innerText = "PIN incorrecto.";
        }
    }

    if (accesoConcedido) {
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]); 
        
        // Reproducir Banda Sonora Global (si existe)
        if (datosAlbum.Datos_Generales.soundtrack) {
            bgAudio.src = datosAlbum.Datos_Generales.soundtrack;
            bgAudio.volume = 0.4; // Volumen suave para no asustar
            bgAudio.play().catch(e => console.log("El navegador bloqueó el audio"));
        }

        pinSection.classList.remove('active');
        renderizarFragmento();
    }
}

// PARA EL CLIENTE: CAMBIAR PRIVACIDAD DESDE LA PORTADA
async function alternarPrivacidadGlobal(estadoActual) {
    const nuevoEstado = !estadoActual;
    try {
        await db.collection("Albums").doc(albumId).update({
            "Datos_Generales.modo_publico": nuevoEstado
        });
        alert(nuevoEstado ? "candado abierto: Cualquiera que escanee la libreta podrá verla sin PIN." : "Candado cerrado: Se pedirá PIN a los nuevos lectores.");
        window.location.reload();
    } catch (e) {
        alert("Error al actualizar. Necesitamos ajustar las reglas de tu base de datos.");
    }
}

function renderizarFragmento() {
    const idMinuscula = capituloId.toLowerCase();
    
    // =========================================================================
    // A) COLOFÓN (La firma de Etéreo en la contraportada)
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
                    Esta libreta fue encuadernada a mano y ensamblada con tecnología de memoria activa en Guadalajara, Jalisco.<br><br>
                    Un puente entre lo táctil y lo eterno.
                </p>
            </div>
        `;
        document.querySelector('.phygital-prompt').style.display = 'none';
        contentSection.classList.add('active');
        return;
    }

    // =========================================================================
    // B) PORTADA (Prefacio y Ajustes del Cliente)
    // =========================================================================
    if (idMinuscula === 'portada') {
        tituloCapitulo.style.display = 'none'; 
        subtituloCapitulo.style.display = 'none';
        metadataContainer.innerHTML = '';
        
        const datosCapitulo = (datosAlbum.Capitulos && datosAlbum.Capitulos[capituloId]) ? datosAlbum.Capitulos[capituloId] : {};
        const tituloAlbum = datosAlbum.Datos_Generales.titulo || "Memorias en Papel y Éter";
        const mensajePortada = datosCapitulo.valor || "Este libro resguarda fragmentos de luz, sonido y palabras.";
        
        const esPublico = datosAlbum.Datos_Generales.modo_publico === true;
        const textoPrivacidad = esPublico ? "Bloquear Libreta (Requerir PIN)" : "Abrir Libreta (Quitar PIN para todos)";

        renderArea.innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
                <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #A39171; font-style: italic;">${tituloAlbum}</h2>
                <div style="width: 40px; height: 1px; background: #A39171; margin: 20px auto;"></div>
                <p class="carta-text" style="font-size: 16px; text-align: center; margin-bottom: 35px;">
                    ${mensajePortada.replace(/\n/g, '<br>')}
                </p>
                
                <div class="privacy-toggle">
                    <span>Ajustes del Propietario</span>
                    <button class="toggle-btn" onclick="alternarPrivacidadGlobal(${esPublico})">${textoPrivacidad}</button>
                </div>
            </div>
        `;
        
        document.querySelector('.phygital-prompt').style.display = 'none';
        contentSection.classList.add('active');
        return; 
    }

    // =========================================================================
    // C) CAPÍTULOS INTERNOS NORMALES
    // =========================================================================
    const datosCapitulo = datosAlbum.Capitulos[capituloId];
    
    tituloCapitulo.style.display = 'block'; 
    subtituloCapitulo.style.display = 'block';
    document.querySelector('.phygital-prompt').style.display = 'flex';

    tituloCapitulo.innerText = datosCapitulo.titulo || `Capítulo ${capituloId}`;
    subtituloCapitulo.innerText = `Fragmento ${capituloId}`;
    
    // Metadatos de Tiempo y Espacio
    if (datosCapitulo.fecha || datosCapitulo.ubicacion) {
        const metadatos = [datosCapitulo.ubicacion, datosCapitulo.fecha].filter(Boolean).join(" — ");
        metadataContainer.innerHTML = `<div class="metadata-line">${metadatos}</div>`;
    } else {
        metadataContainer.innerHTML = '';
    }
    
    switch (datosCapitulo.tipo_contenido) {
        case 'carta':
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
            renderArea.innerHTML = `
                <div style="background: #1A1A1A; padding: 25px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="#A39171"/>
                        </svg>
                        <span style="color: #A39171; font-family: 'Montserrat'; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Cápsula de Voz</span>
                    </div>
                    <audio controls style="width: 100%; height: 40px; outline: none; border-radius: 30px;" controlsList="nodownload"><source src="${datosCapitulo.valor}" type="audio/mpeg"></audio>
                </div>`;
            break;
    }

    contentSection.classList.add('active');
}

iniciar();
