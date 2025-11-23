// Función para obtener el ID del curso desde la URL
function getCourseIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Función para obtener los detalles del curso
async function fetchCourseDetails() {
  const courseId = getCourseIdFromURL();
  const resp = await fetch(`http://localhost:5000/api/courses/${courseId}`);
  const data = await resp.json();

  if (resp.ok) {
    document.getElementById('course-title').innerText = data.title;
    document.getElementById('course-description').innerText = data.description || "Descripción no disponible";
    document.getElementById('course-image').src = data.cover_url || 'default-image.jpg';
  } else {
    alert('Curso no encontrado');
  }
}

// === MÓDULOS DINÁMICOS ===

// Función para obtener y renderizar los módulos
async function fetchAndRenderModules() {
  const courseId = getCourseIdFromURL();
  const resp = await fetch(`http://localhost:5000/api/modules/by-course/${courseId}`);
  const modules = await resp.json();

  const cont = document.getElementById('modules-container');
  cont.innerHTML = ""; // Limpiar contenedor de módulos

  if (!resp.ok || !Array.isArray(modules) || modules.length === 0) {
    cont.innerHTML = `<p>No hay módulos disponibles para este curso.</p>`;
    return;
  }

  modules.forEach((m, idx) => {
    const n = idx + 1;
    const card = document.createElement('div');
    card.className = 'module-card';

    // Botón (título del módulo)
    const btn = document.createElement('button');
    btn.className = 'module-title';
    btn.textContent = m.title || `Módulo ${n}`;
    btn.setAttribute('data-target', `module-${m.id}`);

    // Contenido (colapsable)
    const content = document.createElement('div');
    content.className = 'module-content';
    content.id = `module-${m.id}`;
    content.style.display = 'none';
    content.innerHTML = `<p>${m.duracion || `Módulo ${n}`} el contenido del módulo</p>`;

    // Toggle de apertura/cierre del acordeón
    btn.addEventListener('click', () => {
      // Cerrar todos los demás módulos
      document.querySelectorAll('.module-content').forEach(div => {
        if (div.id !== content.id) div.style.display = 'none';
      });
      // Alternar la visibilidad del contenido
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });

    card.appendChild(btn);
    card.appendChild(content);
    cont.appendChild(card);
  });
}

// === CURSOS RECOMENDADOS ===

// Función para obtener y renderizar los cursos recomendados
async function fetchAndRenderRecommendedCourses() {
  const courseId = getCourseIdFromURL();
  const resp = await fetch(`http://localhost:5000/api/courses/recommended/${courseId}`);
  const recommendedCourses = await resp.json();

  const cont = document.getElementById('recommended-courses-container');
  cont.innerHTML = ""; // Limpiar contenedor de cursos recomendados

  if (!resp.ok || !Array.isArray(recommendedCourses) || recommendedCourses.length === 0) {
    cont.innerHTML = `<p>No hay cursos recomendados disponibles.</p>`;
    return;
  }

  recommendedCourses.forEach(course => {
    const card = document.createElement('div');
    card.className = 'recommended-card';

    card.innerHTML = `
      <a href="cursos_Detalles.html?id=${course.id}">
        <img src="${course.cover_url}" alt="Imagen del curso recomendado">
        <h3>${course.title}</h3>
        <p>${course.description || "Breve descripción del curso"}</p>
      </a>
    `;

    cont.appendChild(card);
  });
}

// Función para guardar el curso en el panel de usuario (localStorage)
function saveCourseToPanel(course) {
  let savedCourses = JSON.parse(localStorage.getItem('savedCourses')) || [];

  // Verificar si el curso ya está guardado
  if (!savedCourses.some(savedCourse => savedCourse.id === course.id)) {
    savedCourses.push(course); // Añadir el curso si no existe
    localStorage.setItem('savedCourses', JSON.stringify(savedCourses));
  }
}


// Lógica para el botón "Inscríbete Ya"
document.getElementById('enroll-button').addEventListener('click', async () => {
  const courseId = getCourseIdFromURL();
  const resp = await fetch(`http://localhost:5000/api/courses/${courseId}`);
  const courseData = await resp.json();

  if (resp.ok) {
    // Obtener los enrollments
    const enrollResp = await fetch(`http://localhost:5000/api/enrollments/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 23,  // Asegúrate de que esto obtenga el ID del usuario actual
        course_id: courseData.id,
        status: 'active',
        progress_pct: 0
      })
    });

    if (enrollResp.ok) {
      saveCourseToPanel(courseData); // Guardar el curso en localStorage
      alert(`¡Te has inscrito en el curso: ${courseData.title}!`);
    } else {
      alert('Error al inscribirse en el curso.');
    }
  } else {
    alert('Error al obtener los detalles del curso.');
  }
});


// Ejecutar todo al cargar la página
(async () => {
  await fetchCourseDetails();
  await fetchAndRenderModules();
  await fetchAndRenderRecommendedCourses();  // Cargar cursos recomendados
})();


