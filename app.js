// 1. CONFIGURACIÓN DIRECTA DE FIREBASE
const firebaseConfig = {
    apiKey: "835280694390", // <-- Opcional: Reemplaza esto con tu clave "AIza..." si la copiaste
    projectId: "etereo-album"        // Tu ID real y correcto
};

// Inicializamos Firebase (¡Solo una vez!)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. CONFIGURACIÓN DE CLOUDINARY
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/etereomx/auto/upload";
const UPLOAD_PRESET = "etereo_audios"; 

// 3. LEER LA URL (Ej: /?id=ALB-TEST&cap=1)
const parametrosURL = new URLSearchParams(window.location.search);
const idAlbum = parametrosURL.get('id');
const numeroCapitulo = parametrosURL.get('cap');

// 4. REFERENCIAS A LOS ELEMENTOS VISUALES (HTML)
const pantallaLogin = document.getElementById('pantalla-login');
const pantallaGrabacion = document.getElementById('pantalla-grabacion');
const btnEntrar = document.getElementById('btn-entrar');
const inputPin = document.getElementById('input-pin');
const tituloCapitulo = document.getElementById('titulo-capitulo');
const mensajeError = document.getElementById('mensaje-error');

// -------------------------------------------------------------------------
// LÓGICA DE VALIDACIÓN DEL PIN
// -------------------------------------------------------------------------
btnEntrar.addEventListener('click', async () => {
    const pinIngresado = inputPin.value;
    
    // Validación de seguridad: Verificar que el NFC mandó bien la información
    if(!idAlbum || !numeroCapitulo) {
        alert("Error: NFC no válido. Faltan datos del álbum o capítulo.");
        return;
    }

    try {
        // Buscamos el documento en la base de datos de Firestore
        const docRef = db.collection("Albums").doc(idAlbum);
        const documento = await docRef.get();

        if (documento.exists) {
            const datos = documento.data();
            
            // Extraemos el PIN correcto de la base de datos
            const pinCorrecto = datos.Datos_Generales.pin_acceso;

            if (pinIngresado === pinCorrecto) {
                // PIN correcto: Ocultamos login y mostramos grabación
                pantallaLogin.style.display = "none";
                pantallaGrabacion.style.display = "block";
                
                // Colocamos el título del capítulo correspondiente
                tituloCapitulo.innerText = datos.Capitulos[numeroCapitulo].titulo;
                
                // Lógica adicional: Si este capítulo ya tenía un audio grabado antes, lo mostramos
                if (datos.Capitulos[numeroCapitulo].contenido_url !== "") {
                    mostrarReproductor(datos.Capitulos[numeroCapitulo].contenido_url);
                }
            } else {
                // PIN incorrecto: Mostramos el mensaje de error rojo
                mensajeError.style.display = "block";
                mensajeError.innerText = "PIN incorrecto. Intenta de nuevo.";
            }
        } else {
            alert("El álbum no existe en la base de datos.");
        }
    } catch (error) {
        console.error("Error consultando Firebase:", error);
        alert("Error de conexión. Revisa la consola para más detalles.");
    }
});

// Función para mostrar el reproductor de audio y ocultar el botón de grabar
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

        // 2. Mientras graba: Guardar los paquetes de datos
        mediaRecorder.ondataavailable = evento => {
            fragmentosDeAudio.push(evento.data);
        };

        // 3. Al detenerse: Unir los paquetes, crear archivo y subir a Cloudinary
        mediaRecorder.onstop = async () => {
            estadoGrabacion.innerText = "Subiendo audio, por favor espera... ⏳";
            estadoGrabacion.style.color = "#0056b3"; 
            btnGrabar.style.display = "none";

            const audioBlob = new Blob(fragmentosDeAudio, { type: 'audio/webm' });
            
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('upload_preset', UPLOAD_PRESET); 

            try {
                const respuesta = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData
                });
                
                const datosCloudinary = await respuesta.json();
                const urlAudio = datosCloudinary.secure_url; 

                mostrarReproductor(urlAudio);
                estadoGrabacion.innerText = "¡Audio guardado exitosamente! ✨";
                estadoGrabacion.style.color = "green";

                // 4. Actualizamos Firestore con la nueva URL
                const docRef = db.collection("Albums").doc(idAlbum);
                
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

        mediaRecorder.start();
        
        btnGrabar.style.display = "none";
        btnDetener.style.display = "inline-block";
        estadoGrabacion.innerText = "🔴 Grabando tu mensaje...";
        estadoGrabacion.style.color = "red";

    } catch (error) {
        alert("Para grabar tu recuerdo, necesitas permitir el uso del micrófono.");
        console.error("Permiso denegado al micrófono:", error);
    }
});

btnDetener.addEventListener('click', () => {
    mediaRecorder.stop();
    btnDetener.style.display = "none";
});
