const { detectFace } = require('./face_recognition');

async function verifyFace(imageUrl) {
    try {
        const faceData = await detectFace(imageUrl);
        console.log('Datos de la cara detectada:', faceData);
        // AquÃ­ puedes procesar los datos de la cara, como almacenarlos o hacer validaciones.
    } catch (error) {
        console.error('Error en la verificaciÃ³n facial:', error);
    }
}

// Llamada de ejemplo:
verifyFace('https://example.com/path/to/image.jpg');