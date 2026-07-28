// =========================================================================
// 1. CONFIGURACIÓN EN LA NUBE (Firebase y Cloudinary)
// =========================================================================
const firebaseConfig = {
    projectId: "etereo-album" 
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/etereomx/auto/upload";
const UPLOAD_PRESET = "etereo_audios"; 

// Extraer parámetros de la URL (Ej: /?id=ALB-TEST&cap=1)
const parametrosURL = new URLSearchParams(window.location.search);
const idAlbum = parametrosURL.get('id');
const numeroCapitulo = parametrosURL.get('cap');

// =========================================================================
// 2. REFERENCIAS AL DOM (Interfaz de usuario)
// =========================================================================
const pantallaLogin = document.getElementById('pantalla-login');
const pantallaGrabacion = document.getElementById('pantalla-grabacion');
const btnEntrar = document.getElementById('btn-entrar');
const inputPin = document.getElementById('input-pin');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const mensajeError = document.getElementById('mensaje-error');
const statusText = document.getElementById('status-text');

// Botones de grabación
const btnGrabar = document.getElementById('btn-grabar');
const btnDetener = document.getElementById('btn-detener');

// Elementos del Reproductor Soundwave
const waveformWrapper = document.getElementById('waveform-wrapper');
const audioEl = document.getElementById('native-audio');
const btnPlay = document.getElementById('custom-play-btn');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const canvasBase = document.getElementById('canvas-base');
const canvasProgress = document.getElementById('canvas-progress');
const ctxBase = canvasBase.getContext('2d');
const ctxProgress = canvasProgress.getContext('2d');

// =========================================================================
// 3. LÓGICA DE VALIDACIÓN DEL PIN
// =========================================================================
btnEntrar.addEventListener('click', async () => {
    const pinIngresado = inputPin.value;
    
    if(!idAlbum || !numeroCapitulo) {
        alert("NFC no válido. Faltan datos del álbum o capítulo.");
        return;
    }

    btnEntrar.innerText = "Verificando...";

    try {
        const docRef = db.collection("Albums").doc(idAlbum);
        const documento = await docRef.get();

        if (documento.exists) {
            const datos = documento.data();
            const pinCorrecto = datos.Datos_Generales.pin_acceso;

            if (pinIngresado === pinCorrecto) {
                // Éxito: Mostrar pantalla principal
                pantallaLogin.style.display = "none";
                pantallaGrabacion.style.display = "flex";
                
                const dataCapitulo = datos.Capitulos[numeroCapitulo];
                tituloCapitulo.innerText = dataCapitulo.titulo;
                
                // Evaluar si ya hay contenido
                if (dataCapitulo.contenido_url && dataCapitulo.contenido_url !== "") {
                    // Ocultamos botones de grabación y mostramos reproductor
                    btnGrabar.style.display = "none";
                    waveformWrapper.style.display = "block";
                    iniciarProcesamientoAudio(dataCapitulo.contenido_url);
                } else {
                    statusText.innerText = "Cápsula vacía. Lista para grabar.";
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
        console.error("Error consultando Firebase:", error);
        alert("Error de conexión.");
        btnEntrar.innerText = "Desbloquear";
    }
});

// =========================================================================
// 4. LÓGICA DE GRABACIÓN DE AUDIO (Micro -> Cloudinary -> Firestore)
// =========================================================================
let mediaRecorder;
let fragmentosDeAudio = [];

btnGrabar.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        fragmentosDeAudio = [];

        mediaRecorder.ondataavailable = evento => fragmentosDeAudio.push(evento.data);

        mediaRecorder.onstop = async () => {
            statusText.innerText = "Materializando memoria en la nube...";
            btnGrabar.style.display = "none";

            const audioBlob = new Blob(fragmentosDeAudio, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('upload_preset', UPLOAD_PRESET); 

            try {
                // Subir a Cloudinary
                const respuesta = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                const datosCloudinary = await respuesta.json();
                const urlAudio = datosCloudinary.secure_url; 

                // Actualizar Firestore
                await db.collection("Albums").doc(idAlbum).update({
                    [`Capitulos.${numeroCapitulo}.contenido_url`]: urlAudio,
                    [`Capitulos.${numeroCapitulo}.tipo_contenido`]: "audio"
                });

                statusText.innerText = "Memoria guardada.";
                waveformWrapper.style.display = "block";
                iniciarProcesamientoAudio(urlAudio);

            } catch (error) {
                console.error("Error al subir:", error);
                statusText.innerText = "Error al guardar. Intenta de nuevo.";
                btnGrabar.style.display = "inline-block";
            }
        };

        mediaRecorder.start();
        btnGrabar.style.display = "none";
        btnDetener.style.display = "inline-block";
        statusText.innerHTML = "<span style='color:#d63031;'>🔴 Grabando memoria...</span>";

    } catch (error) {
        alert("Necesitas permitir el uso del micrófono.");
    }
});

btnDetener.addEventListener('click', () => {
    mediaRecorder.stop();
    btnDetener.style.display = "none";
});

// =========================================================================
// 5. MOTOR DE RENDERIZADO SOUNDWAVE (Tu matemática de señales)
// =========================================================================
let animationFrame;
let peaks = [];
let isPlaying = false;
const colorBase = "#EAEAEA"; 
const colorProgress = "#A39171"; 

function iniciarProcesamientoAudio(url) {
    statusText.innerText = "Analizando señal acústica...";
    audioEl.src = url;
    
    // Al usar fetch en lugar de cargar directo en el tag audio, evitamos 
    // problemas de CORS al decodificar la data del canvas
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            return audioCtx.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
            processAudioData(audioBuffer);
            statusText.innerHTML = "<span style='color:#A39171; font-style:italic;'>Memoria lista.</span>";
        })
        .catch(err => {
            console.error("Error procesando audio para el canvas:", err);
            statusText.innerText = "Memoria lista (Modo Básico).";
            // Si falla el procesamiento avanzado, mostramos controles nativos como respaldo
            audioEl.style.display = "block";
            audioEl.controls = true;
            waveformWrapper.style.display = "none";
        });
}

function processAudioData(audioBuffer) {
    const rawData = audioBuffer.getChannelData(0); 
    const numSamples = 200; 
    const blockSize = Math.floor(rawData.length / numSamples);
    let maxPeak = 0;
    peaks = [];
    
    for (let i = 0; i < numSamples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
        }
        let peak = sum / blockSize;
        peaks.push(peak);
        if (peak > maxPeak) maxPeak = peak;
    }

    peaks = peaks.map(p => (p / maxPeak) * 0.8 + 0.05); 
    prepareCanvases();
}

function prepareCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const rect = waveformWrapper.getBoundingClientRect();
    
    [canvasBase, canvasProgress].forEach(c => {
        c.width = rect.width * dpr;
        c.height = rect.height * dpr;
        c.getContext('2d').scale(dpr, dpr);
    });

    drawPolygon(ctxBase, canvasBase.width / dpr, canvasBase.height / dpr, colorBase);
    updateProgress(); 
}

function drawPolygon(ctx, width, height, color) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.beginPath();
    
    const centerY = height / 2;
    const step = width / (peaks.length - 1);
    
    ctx.moveTo(0, centerY);
    for (let i = 0; i < peaks.length; i++) {
        let amp = peaks[i] * height;
        ctx.lineTo(i * step, centerY - (amp / 2));
    }
    for (let i = peaks.length - 1; i >= 0; i--) {
        let amp = peaks[i] * height;
        ctx.lineTo(i * step, centerY + (amp / 2));
    }
    
    ctx.closePath();
    ctx.fill();
}

function updateProgress() {
    if (!peaks.length) return;
    
    const rect = canvasProgress.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const currentP = (audioEl.currentTime / (audioEl.duration || 1));
    const fillWidth = width * currentP;

    ctxProgress.clearRect(0, 0, width, height);
    ctxProgress.save();
    ctxProgress.beginPath();
    ctxProgress.rect(0, 0, fillWidth, height);
    ctxProgress.clip();
    drawPolygon(ctxProgress, width, height, colorProgress);
    ctxProgress.restore();

    if (isPlaying) {
        animationFrame = requestAnimationFrame(updateProgress);
    }
}

btnPlay.addEventListener('click', () => {
    if (!isPlaying) {
        isPlaying = true;
        iconPlay.style.display = "none";
        iconPause.style.display = "block";
        audioEl.play();
        statusText.innerHTML = "<span style='color:#A39171; font-style:italic;'>Reproduciendo memoria...</span>";
        updateProgress();
    } else {
        isPlaying = false;
        iconPlay.style.display = "block";
        iconPause.style.display = "none";
        statusText.innerHTML = "Pausado.<br><span style='color:#A39171; font-style:italic;'>Presiona reproducir.</span>";
        audioEl.pause();
        cancelAnimationFrame(animationFrame);
    }
});

audioEl.onended = () => {
    isPlaying = false;
    iconPlay.style.display = "block";
    iconPause.style.display = "none";
    statusText.innerHTML = "Memoria finalizada.<br><span style='color:#A39171; font-style:italic;'>Vuelve a reproducir.</span>";
    audioEl.currentTime = 0; 
    cancelAnimationFrame(animationFrame);
    updateProgress(); 
};

// Reajustar el canvas si rotan el celular
window.addEventListener('resize', () => {
    if (waveformWrapper.style.display === "block" && peaks.length > 0) {
        prepareCanvases();
    }
});
