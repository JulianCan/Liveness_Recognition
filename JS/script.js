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
async function redirectToConfirmation() {
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const institucion = document.getElementById('institucion').value;
    const telefono = document.getElementById('telefono').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validar la contraseña
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    // Enviar datos al back-end
    const response = await fetch('http://localhost:5000/api/users/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: nombre,
            email: email,
            password_hash: password, // Puedes agregar un hash aquí si lo deseas
            role: 'student' // Asignar un rol por defecto
        })
    });

    const data = await response.json();
    if (response.ok) {
        console.log('Usuario registrado', data);
        window.location.href = "cursos.html";  // Redirige a la página de cursos después del registro
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