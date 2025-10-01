let mediaRecorder;
let recordedBlobs;
let videoElement = document.getElementById('video');
let startButton = document.getElementById('start-recording');
let stopButton = document.getElementById('stop-recording');
let registerButton = document.getElementById('register-btn');
let registerSection = document.getElementById('register-section');
let gestureSection = document.getElementById('gesture-section');

// Función para iniciar la grabación
async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    videoElement.srcObject = stream;

    mediaRecorder = new MediaRecorder(stream);
    recordedBlobs = [];

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
    
    mediaRecorder.start();
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
}

// Función para detener la grabación
function stopRecording() {
    mediaRecorder.stop();
    const stream = videoElement.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    videoElement.srcObject = null;

    stopButton.style.display = 'none';
    startButton.style.display = 'block';
}

// Función para manejar los datos grabados
function handleDataAvailable(event) {
    if (event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

// Función para manejar la parada de grabación
function handleStop() {
    const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
    const videoURL = window.URL.createObjectURL(superBuffer);
    videoElement.src = videoURL;

    // Guardar el video en el campo oculto para enviarlo al servidor
    document.getElementById('video-input').value = videoURL;
}

// Función para cambiar a la sección de grabación
registerButton.addEventListener('click', () => {
    registerSection.style.display = 'none';
    gestureSection.style.display = 'flex';
});

// Redirigir al hacer clic en "Enviar Registro"
function redirectToConfirmation() {
    // Simula que el registro se guardó y redirige a la página de confirmación
    window.location.href = "cursos.html"; // Aquí puedes cambiar a la URL que desees
}

function redirectToCourses() {
    // Redirige al usuario a la página cursos.html al hacer clic en "Iniciar Sesión"
    window.location.href = "cursos.html";  // Cambia "cursos.html" si es necesario
}
