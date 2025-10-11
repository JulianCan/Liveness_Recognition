document.addEventListener("DOMContentLoaded", function() {
  const savedCourses = JSON.parse(localStorage.getItem('savedCourses')) || [];
  const container = document.getElementById('saved-courses-container');
  container.innerHTML = "";  // Limpiar el contenedor antes de agregar los cursos

  savedCourses.forEach(course => {
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';

    // Modificar el enlace de la card para redirigir a contenidos.html
    courseCard.innerHTML = `
      <a href="contenidos.html?id=${course.id}">  <!-- Cambio aquí -->
        <img src="${course.cover_url}" alt="Curso" class="course-image">
        <h3>${course.title}</h3>
        <p>${course.description}</p>
      </a>
    `;

    container.appendChild(courseCard);
  });
});

