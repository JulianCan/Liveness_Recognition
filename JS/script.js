// ---- Variables ----
let videoElement = document.getElementById('video');
let startButton = document.getElementById('start-recording');
let enviarRegistroBtn = document.getElementById('enviar-registro');
let registerButton = document.getElementById('register-btn');
let registerSection = document.getElementById('register-section');
let gestureSection = document.getElementById('gesture-section');
let gestureTitle = document.querySelector('#gesture-section .form-container h2'); // 👈 el <h2> existente

let currentChallenge = 0;
// Nuevo orden de retos:
let challenges = ["Gira la cabeza 🤖", "Abre la boca 👄", "Parpadea 👁"];
let passedLiveness = false;

// ---- Mostrar la cámara ----
registerButton.addEventListener('click', () => {
    registerSection.style.display = 'none';
    gestureSection.style.display = 'flex';
    gestureTitle.textContent = "Graba tu gesto facial"; // texto inicial
});

// ---- Cambiar el texto del h2 dinámicamente ----
function showInstruction(text, color = "#333") {
    gestureTitle.style.color = color;
    gestureTitle.style.transition = "all 0.3s ease";
    gestureTitle.textContent = text;
}

// ---- Configurar MediaPipe FaceMesh ----
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

// ---- Variables de detección ----
let blinkDetected = false;
let mouthOpenDetected = false;
let headTurnDetected = false;
let headTurnStableFrames = 0; // estabilidad del giro

// ---- Procesamiento de rostro ----
faceMesh.onResults((results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    const landmarks = results.multiFaceLandmarks[0];

    // Calcular medidas básicas
    function euclid(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function aspectRatio(top, bottom, left, right) {
        const v = euclid(top, bottom);
        const h = euclid(left, right);
        return v / h;
    }

    const leftEye = [33, 159, 133, 145];
    const rightEye = [362, 386, 263, 374];
    const mouth = [13, 14, 78, 308];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const nose = landmarks[1];

    const earLeft = aspectRatio(
        landmarks[leftEye[1]],
        landmarks[leftEye[3]],
        landmarks[leftEye[0]],
        landmarks[leftEye[2]]
    );
    const earRight = aspectRatio(
        landmarks[rightEye[1]],
        landmarks[rightEye[3]],
        landmarks[rightEye[0]],
        landmarks[rightEye[2]]
    );
    const ear = (earLeft + earRight) / 2.0;
    const mouthAR = aspectRatio(
        landmarks[mouth[0]],
        landmarks[mouth[1]],
        landmarks[mouth[2]],
        landmarks[mouth[3]]
    );
    const ratio = euclid(nose, leftCheek) / euclid(nose, rightCheek);

    // ---- Desafíos secuenciales (nuevo orden) ----
    if (currentChallenge === 0) {
        showInstruction(challenges[0]);
        // Detectar giro de cabeza estable
        if (ratio > 1.18 || ratio < 0.82) {
            headTurnStableFrames++;
        } else {
            headTurnStableFrames = 0;
        }
        if (headTurnStableFrames > 8) {
            headTurnDetected = true;
            currentChallenge++;
            showInstruction("✅ Bien! Ahora: " + challenges[1], "green");
            setTimeout(() => showInstruction(challenges[1]), 1500);
        }
    } 
    else if (currentChallenge === 1) {
        if (mouthAR > 0.35) {
            mouthOpenDetected = true;
            currentChallenge++;
            showInstruction("✅ Perfecto! Ahora: " + challenges[2], "green");
            setTimeout(() => showInstruction(challenges[2]), 1500);
        }
    } 
    else if (currentChallenge === 2) {
        if (ear < 0.22) {
            blinkDetected = true;
            currentChallenge++;
            showInstruction("✅ Prueba completada con éxito 🎉", "green");
            passedLiveness = true;
            enviarRegistroBtn.disabled = false;

            // Esperar un poco antes de apagar la cámara
            setTimeout(() => {
                camera.stop();
                showInstruction("✅ Prueba completada con éxito 🎉", "green");
            }, 1000);
        }
    }
});

// ---- Iniciar cámara ----
startButton.addEventListener('click', () => {
    camera.start();
    startButton.style.display = 'none';
    showInstruction(challenges[currentChallenge]);
});

// ---- Enviar registro ----
async function redirectToConfirmation() {
    if (!passedLiveness) {
        alert("Debes completar la prueba de vida antes de continuar.");
        return;
    }

    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const institucion = document.getElementById('institucion').value;
    const telefono = document.getElementById('telefono').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    const response = await fetch('http://localhost:5000/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: nombre,
            email: email,
            password: password,
            role: 'student'
        })
    });

    const data = await response.json();
    if (response.ok) {
        alert('Usuario registrado correctamente');
        window.location.href = "cursos.html";
    } else {
        alert('Error al registrar el usuario: ' + data.error);
    }
}


// Función para manejar el login
async function redirectToCourses() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validación de campos vacíos
    if (!email || !password) {
        alert('Por favor, ingresa tu correo y contraseña.');
        return;
    }

    // Enviar los datos al back-end
    const response = await fetch('http://localhost:5000/api/users/login', {  // Cambia la ruta si es necesario
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    const data = await response.json();

    if (response.ok) {
        // Si el login es exitoso, redirige a la página de cursos
        console.log('Usuario logueado', data);
        window.location.href = "cursos.html";  // Redirige a la página de cursos
    } else {
        // Si el login falla, muestra el error
        alert('Error al iniciar sesión: ' + data.error);
    }
}