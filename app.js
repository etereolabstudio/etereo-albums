// 1. CONFIGURACIÓN DE FIREBASE (Pega aquí los datos que te dio Google)
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    // ... otros datos ...
};

// Inicializamos Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. CONFIGURACIÓN DE CLOUDINARY
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/etereomx/auto/upload";
const UPLOAD_PRESET = "etereo_audios"; 

// 3. LEER LA URL (Ej: /?id=ALB-001&cap=3)
const parametrosURL = new URLSearchParams(window.location.search);
const idAlbum = parametrosURL.get('id');
const numeroCapitulo = parametrosURL.get('cap');

// Referencias a los elementos visuales
const pantallaLogin = document.getElementById('pantalla-login');
const pantallaGrabacion = document.getElementById('pantalla-grabacion');
const btnEntrar = document.getElementById('btn-entrar');
const inputPin = document.getElementById('input-pin');
const tituloCapitulo = document.getElementById('titulo-capitulo');

// -------------------------------------------------------------------------
// LÓGICA DE VALIDACIÓN DEL PIN
// -------------------------------------------------------------------------
btnEntrar.addEventListener('click', async () => {
    const pinIngresado = inputPin.value;
    
    if(!idAlbum) {
        alert("Error: NFC no válido o falta ID del álbum.");
        return;
    }

    try {
        // Buscamos el documento en la base de datos
        const docRef = db.collection("Albums").doc(idAlbum);
        const documento = await docRef.get();

        if (documento.exists) {
            const datos = documento.data();
            const pinCorrecto = datos.Datos_Generales.pin_acceso;

            if (pinIngresado === pinCorrecto) {
                // PIN correcto: Mostrar pantalla de grabación
                pantallaLogin.style.display = "none";
                pantallaGrabacion.style.display = "block";
                tituloCapitulo.innerText = datos.Capitulos[numeroCapitulo].titulo;
                
                // Extra: Si el capítulo ya tiene audio, lo mostramos
                if (datos.Capitulos[numeroCapitulo].contenido_url !== "") {
                    mostrarReproductor(datos.Capitulos[numeroCapitulo].contenido_url);
                }
            } else {
                document.getElementById('mensaje-error').style.display = "block";
            }
        } else {
            alert("El álbum no existe en la base de datos.");
        }
    } catch (error) {
        console.error("Error consultando Firebase:", error);
    }
});

function mostrarReproductor(url) {
    const reproductor = document.getElementById('reproductor');
    reproductor.src = url;
    reproductor.style.display = "block";
    document.getElementById('btn-grabar').style.display = "none";
}

// -------------------------------------------------------------------------
// LÓGICA DE GRABACIÓN DE AUDIO Y SUBIDA A CLOUDINARY
// -------------------------------------------------------------------------
const btnGrabar = document.getElementById('btn-grabar');
const btnDetener = document.getElementById('btn-detener');
const estadoGrabacion = document.getElementById('estado-grabacion');

let mediaRecorder;
let fragmentosDeAudio = [];

btnGrabar.addEventListener('click', async () => {
    try {
        // 1. Pedir permiso al navegador/celular para usar el micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        fragmentosDeAudio = [];

        // 2. ¿Qué hacer mientras graba? Guardar los pedacitos de audio en memoria
        mediaRecorder.ondataavailable = evento => {
            fragmentosDeAudio.push(evento.data);
        };

        // 3. ¿Qué hacer al detenerse? Unir los pedazos y subir a Cloudinary
        mediaRecorder.onstop = async () => {
            estadoGrabacion.innerText = "Subiendo audio, por favor espera... ⏳";
            estadoGrabacion.style.color = "#0056b3"; // Azul
            btnGrabar.style.display = "none";

            // Unimos los pedazos en un solo archivo binario (Blob)
            const audioBlob = new Blob(fragmentosDeAudio, { type: 'audio/webm' });
            
            // Preparamos el paquete de datos para Cloudinary (como si llenáramos un formulario web)
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('upload_preset', UPLOAD_PRESET); // Tu preset: etereo_audios

            try {
                // Enviamos a Cloudinary mediante una petición HTTP (Fetch)
                const respuesta = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData
                });
                
                // Cloudinary nos responde con los datos del archivo, incluyendo el enlace seguro
                const datosCloudinary = await respuesta.json();
                const urlAudio = datosCloudinary.secure_url;

                // Mostramos el reproductor en pantalla
                mostrarReproductor(urlAudio);
                estadoGrabacion.innerText = "¡Audio guardado exitosamente! ✨";
                estadoGrabacion.style.color = "green";

                // 4. Actualizamos el documento en Firestore con el nuevo enlace
                const docRef = db.collection("Albums").doc(idAlbum);
                
                // Usamos la sintaxis de corchetes para actualizar dinámicamente un campo anidado
                await docRef.update({
                    [`Capitulos.${numeroCapitulo}.contenido_url`]: urlAudio,
                    [`Capitulos.${numeroCapitulo}.tipo_contenido`]: "audio"
                });

            } catch (error) {
                console.error("Error al subir a Cloudinary o Firebase:", error);
                estadoGrabacion.innerText = "Hubo un error al guardar. Intenta de nuevo.";
                estadoGrabacion.style.color = "red";
                btnGrabar.style.display = "inline-block";
            }
        };

        // Arrancar la grabación visualmente
        mediaRecorder.start();
        btnGrabar.style.display = "none";
        btnDetener.style.display = "inline-block";
        estadoGrabacion.innerText = "🔴 Grabando tu mensaje...";
        estadoGrabacion.style.color = "red";

    } catch (error) {
        alert("Para grabar tu recuerdo, necesitas permitir el uso del micrófono.");
        console.error("Permiso denegado:", error);
    }
});

btnDetener.addEventListener('click', () => {
    mediaRecorder.stop();
    btnDetener.style.display = "none";
});
