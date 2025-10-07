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
verifyFace('https://previews.123rf.com/images/warrengoldswain/warrengoldswain1610/warrengoldswain161000017/64945843-full-collection-of-real-funny-faces-people-making-silly-expressions.jpg');