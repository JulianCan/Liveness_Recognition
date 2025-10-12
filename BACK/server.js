const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB } = require('./pool'); // Import PostgreSQL connection
const userRoutes = require('./routes/users'); // Import your user routes (add others similarly)
const profilesRouter = require("./routes/profiles");
const submissionsRoutes = require('./routes/submissions');
const quizzesRoutes = require('./routes/quizzes');
const questionsRoutes = require('./routes/questions');
const optionsRoutes = require('./routes/options');
const modulesRoutes = require('./routes/modules');
const livenessRoutes = require('./routes/liveness_sessions');
const lessonsRoutes = require('./routes/lessons');
const faceRoutes = require('./routes/face_verifications');
const enrollmentsRoutes = require('./routes/enrollments');
const coursesRoutes = require('./routes/courses');
const attemptsRoutes = require('./routes/attempts');
const answersRoutes = require('./routes/answers');
const mediaRoutes = require('./routes/media');

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse incoming request bodies
app.use(bodyParser.json());

// Add CORS middleware
app.use(cors());  // Esto habilita CORS para todas las rutas

// Connect to PostgreSQL
connectDB();

// Define your API routes
app.use('/api/users', userRoutes);
app.use("/api/profiles", profilesRouter);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/liveness_sessions', livenessRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/face_verifications', faceRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/media', mediaRoutes);

// **AÑADIR ESTO:** Ruta básica para la raíz (/)
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the Liveness Recognition API. Access your routes via /api/..." });
});

// Export the app for Vercel to use
module.exports = app;

// If this is executed locally, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
