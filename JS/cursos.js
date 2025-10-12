document.addEventListener("DOMContentLoaded", async function() {
  // Obtener los cursos desde el backend
  const response = await fetch('http://localhost:5000/api/courses');
  const data = await response.json();

  console.log(data);  // Verifica la estructura de la respuesta

  if (response.ok) {
    // Obtener el contenedor de las tarjetas
    const coursesGrid = document.querySelector('.courses-grid');

    // Función para crear las tarjetas de cursos
    function createCourseCard(course) {
      const courseCard = document.createElement('a');
      courseCard.href = `cursos_Detalles.html?id=${course.id}`; // Redirigir a la página del curso
      courseCard.classList.add('course-card');

      // Crear el contenido de la tarjeta
      courseCard.innerHTML = `
        <section class="image-container">
          <!-- Aquí colocamos la imagen desde la base de datos -->
          <img src="${course.cover_url}" alt="Imagen del curso" />
        </section>
        <h3>${course.title}</h3>
        <p>${course.description || "Descripción no disponible"}</p>
      `;
      return courseCard;
    }

    // Mostrar todos los cursos inicialmente
    data.data.forEach(course => {
      const courseCard = createCourseCard(course);
      coursesGrid.appendChild(courseCard);
    });

    // Agregar la funcionalidad de filtrado por título (solo por la primera letra de cada palabra)
    const filterInput = document.getElementById('filter');
    filterInput.addEventListener('input', function() {
      const filterText = filterInput.value.toLowerCase();  // Convierte el filtro a minúsculas

      // Limpiar la grid de cursos antes de agregar los nuevos resultados filtrados
      coursesGrid.innerHTML = '';

      // Filtrar los cursos por el comienzo de cada palabra del título
      const filteredCourses = data.data.filter(course => {
        // Creamos una expresión regular para que busque solo al principio de cada palabra
        const regex = new RegExp(`^${filterText}`, 'i');  // 'i' es para ignorar mayúsculas/minúsculas
        return regex.test(course.title.toLowerCase());  // Solo filtra por la primera letra de cada palabra
      });

      // Mostrar los cursos filtrados
      filteredCourses.forEach(course => {
        const courseCard = createCourseCard(course);
        coursesGrid.appendChild(courseCard);
      });
    });
  } else {
    alert('Error al obtener los cursos: ' + data.error);
  }
});
