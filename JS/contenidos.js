document.addEventListener("DOMContentLoaded", async function() {
    const courseId = getCourseIdFromURL();  // Obtener el ID del curso desde la URL
    const courseResp = await fetch(`http://localhost:5000/api/courses/${courseId}`);
    const course = await courseResp.json();
    
    document.getElementById('course-name').innerText = course.title;

    // Cargar módulos del curso
    const modulesResp = await fetch(`http://localhost:5000/api/modules/by-course/${courseId}`);
    const modules = await modulesResp.json();

    const modulesList = document.getElementById('modules-list');
    modulesList.innerHTML = "";  // Limpiar la lista de módulos

    // Iterar sobre los módulos
    modules.forEach(module => {
        const moduleItem = document.createElement('li');
        moduleItem.innerHTML = `
            <button onclick="toggleAccordion('${module.id}')">${module.title}</button>
            <div class="accordion-content" id="module-${module.id}-lessons"></div>
        `;
        modulesList.appendChild(moduleItem);
    });
});

// Obtener ID del curso desde la URL
function getCourseIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Toggle el acordeón para cargar las lecciones
async function toggleAccordion(moduleId) {
    const accordionContent = document.getElementById(`module-${moduleId}-lessons`);
    
    // Si ya está visible, lo ocultamos
    if (accordionContent.style.display === "block") {
        accordionContent.style.display = "none";
        return;
    }

    // Cargar lecciones para el módulo específico
    const lessonsResp = await fetch(`http://localhost:5000/api/lessons/by-module/${moduleId}`);
    const lessons = await lessonsResp.json();
    
    accordionContent.innerHTML = "";  // Limpiar lecciones previas

    lessons.forEach(lesson => {
        const lessonButton = document.createElement('button');
        lessonButton.classList.add('lesson-btn');
        lessonButton.innerText = lesson.title;
        lessonButton.onclick = () => updateLessonContent(lesson); // Mostrar el contenido de la lección
        accordionContent.appendChild(lessonButton);
    });

    // Hacer visible el acordeón
    accordionContent.style.display = "block";
}

function updateLessonContent(lesson) {
    const contentDiv = document.getElementById('module-content');
    const videoUrl = lesson.video_url;

    // Asegurarse de que la URL esté en el formato correcto (YouTube en este caso)
    const embedUrl = videoUrl.includes("youtube.com") ? videoUrl.replace("watch?v=", "embed/") : videoUrl;

    contentDiv.innerHTML = `
        <h2>${lesson.title}</h2>
        <p>${lesson.content_html || "Contenido de la lección..."}</p>
        <div class="video">
            <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
    `;
}

