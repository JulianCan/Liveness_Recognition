document.addEventListener("DOMContentLoaded", function() {
    const savedCourses = JSON.parse(localStorage.getItem('savedCourses')) || [];

    const container = document.getElementById('saved-courses-container');
    container.innerHTML = "";  // Limpiar el contenedor antes de agregar los cursos

    savedCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';

        courseCard.innerHTML = `
            <img src="${course.cover_url}" alt="Curso" class="course-image">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            
            <!-- Barra de progreso -->
            <div class="progress-bar">
                <div class="progress" style="width: 50%;"></div> <!-- Este valor puede ser dinámico -->
            </div>
        `;

        container.appendChild(courseCard);
    });
});

