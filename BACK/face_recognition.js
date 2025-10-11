const axios = require('axios');
require('dotenv').config();

const faceAPIKey = process.env.FACE_APIKEY;
const faceAPIEndpoint = process.env.FACE_ENDPOINT;

async function detectFace(imageUrl) {
    try {
        const response = await axios.post(`${faceAPIEndpoint}/face/v1.0/detect`, {
            url: imageUrl
        }, {
            headers: {
                'Ocp-Apim-Subscription-Key': faceAPIKey,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error detectando la cara:', error);
        throw error;
    }
}

module.exports = { detectFace };