// ==========================================
// 1. CONFIGURACIÓN FIREBASE Y CLOUDINARY
// ==========================================
const firebaseConfig = { projectId: "etereo-album" };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/etereomx/auto/upload";
const UPLOAD_PRESET = "etereo_audios"; 

const parametrosURL = new URLSearchParams(window.location.search);
const idAlbum = parametrosURL.get('id');
const numeroCapitulo = parametrosURL.get('cap');

// ==========================================
// 2. REFERENCIAS HTML
// ==========================================
const pantallaLogin = document.getElementById('pantalla-login');
const pantallaContenido = document.getElementById('pantalla-contenido');
const btnEntrar = document.getElementById('btn-entrar');
const inputPin = document.getElementById('input-pin');
const mensajeError = document.getElementById('mensaje-error');

const imgPortada = document.getElementById('portada-capitulo');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const statusText = document.getElementById('status-text');

const contSpotify = document.getElementById('contenedor-spotify');
const iframeSpotify = document.getElementById('iframe-spotify');

const contAudio = document.getElementById('contenedor-audio');
const audioNativo = document.getElementById('native-audio');
const btnPlay = document.getElementById('custom-play-btn');
const progressBar = document.getElementById('progress-bar');

const contGrabacion = document.getElementById('contenedor-grabacion');
const btnGrabar = document.getElementById('btn-grabar');
const btnDetener = document.getElementById('btn-detener');

// ==========================================
// 3. VALIDACIÓN DE PIN Y LÓGICA DE CONTENIDO
// ==========================================
btnEntrar.addEventListener('click', async () => {
    const pinIngresado = inputPin.value;
    
    if(!idAlbum || !numeroCapitulo) {
        alert("Faltan datos del NFC.");
        return;
    }
    btnEntrar.innerText = "Verificando...";

    try {
        const documento = await db.collection("Albums").doc(idAlbum).get();

        if (documento.exists) {
            const datos = documento.data();
            if (pinIngresado === datos.Datos_Generales.pin_acceso) {
                
                // Mostrar pantalla principal
                pantallaLogin.style.display = "none";
                pantallaContenido.style.display = "block";
                
                const dataCapitulo = datos.Capitulos[numeroCapitulo];
                tituloCapitulo.innerText = dataCapitulo.titulo;

                // 1. GESTIONAR PORTADA
                if (dataCapitulo.url_portada && dataCapitulo.url_portada !== "") {
                    imgPortada.src = dataCapitulo.url_portada;
                    imgPortada.style.display = "block";
                }

                // 2. GESTIONAR CONTENIDO (Spotify, Audio o Vacío)
                if (dataCapitulo.tipo_contenido === "spotify") {
                    statusText.innerText = "Canción vinculada.";
                    iframeSpotify.src = dataCapitulo.contenido_url;
                    contSpotify.style.display = "block";
                
                } else if (dataCapitulo.tipo_contenido === "audio" && dataCapitulo.contenido_url !== "") {
                    statusText.innerText = "Memoria de voz vinculada.";
                    audioNativo.src = dataCapitulo.contenido_url;
                    contAudio.style.display = "block";
                
                } else {
                    // Está vacío, permitimos grabar
                    statusText.innerText = "Cápsula vacía. Lista para grabar tu mensaje.";
                    contGrabacion.style.display = "block";
                }

            } else {
                mensajeError.style.display = "block";
                mensajeError.innerText = "PIN incorrecto.";
                btnEntrar.innerText = "Desbloquear";
            }
        } else {
            alert("Álbum no encontrado.");
            btnEntrar.innerText = "Desbloquear";
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión.");
        btnEntrar.innerText = "Desbloquear";
    }
});

// ==========================================
// 4. CONTROLES DEL REPRODUCTOR DE AUDIO ELEGANTE
// ==========================================
let isPlaying = false;

btnPlay.addEventListener('click', () => {
    if (!isPlaying) {
        audioNativo.play();
        btnPlay.innerText = "⏸";
        isPlaying = true;
    } else {
        audioNativo.pause();
        btnPlay.innerText = "▶";
        isPlaying = false;
    }
});

audioNativo.addEventListener('timeupdate', () => {
    const progreso = (audioNativo.currentTime / audioNativo.duration) * 100;
    progressBar.style.width = progreso + "%";
});

audioNativo.addEventListener('ended', () => {
    btnPlay.innerText = "▶";
    isPlaying = false;
    progressBar.style.width = "0%";
});

// ==========================================
// 5. LÓGICA DE GRABACIÓN (Micro -> Cloudinary)
// ==========================================
let mediaRecorder;
let fragmentosDeAudio = [];

btnGrabar.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        fragmentosDeAudio = [];

        mediaRecorder.ondataavailable = e => fragmentosDeAudio.push(e.data);

        mediaRecorder.onstop = async () => {
            statusText.innerText = "Guardando memoria en la nube...";
            btnGrabar.style.display = "none";

            const audioBlob = new Blob(fragmentosDeAudio, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('upload_preset', UPLOAD_PRESET); 

            try {
                const respuesta = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                const datosCloudinary = await respuesta.json();
                const urlAudio = datosCloudinary.secure_url; 

                // Actualizar Firestore
                await db.collection("Albums").doc(idAlbum).update({
                    [`Capitulos.${numeroCapitulo}.contenido_url`]: urlAudio,
                    [`Capitulos.${numeroCapitulo}.tipo_contenido`]: "audio"
                });

                // Mostrar el reproductor elegante
                statusText.innerText = "Memoria guardada exitosamente.";
                contGrabacion.style.display = "none";
                audioNativo.src = urlAudio;
                contAudio.style.display = "block";

            } catch (error) {
                console.error(error);
                statusText.innerText = "Error al guardar.";
                btnGrabar.style.display = "block";
            }
        };

        mediaRecorder.start();
        btnGrabar.style.display = "none";
        btnDetener.style.display = "block";
        statusText.innerHTML = "<span style='color:#d63031;'>🔴 Grabando memoria...</span>";

    } catch (error) {
        alert("Habilita el micrófono para grabar.");
    }
});

btnDetener.addEventListener('click', () => {
    mediaRecorder.stop();
    btnDetener.style.display = "none";
});
