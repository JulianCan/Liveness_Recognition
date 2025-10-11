document.addEventListener("DOMContentLoaded", async function() {
    const courseId = getCourseIdFromURL();  // Obtén el ID del curso desde la URL
    const courseResp = await fetch(`http://localhost:5000/api/courses/${courseId}`);
    const course = await courseResp.json();
    
    document.getElementById('course-name').innerText = course.title;

    // Cargar módulos del curso
    const modulesResp = await fetch(`http://localhost:5000/api/modules/by-course/${courseId}`);
    const modules = await modulesResp.json();

    const modulesList = document.getElementById('modules-list');
    modulesList.innerHTML = "";  // Limpiar la lista de módulos

    modules.forEach(module => {
        const moduleItem = document.createElement('li');
        moduleItem.innerHTML = `
            <button onclick="loadLesson('${module.id}')">${module.title}</button>
            <div class="lesson-list" id="module-${module.id}-lessons"></div>
        `;
        modulesList.appendChild(moduleItem);
    });
});

// Obtener ID del curso desde la URL
function getCourseIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Cargar lecciones del módulo seleccionado
async function loadLesson(moduleId) {
    const lessonsResp = await fetch(`http://localhost:5000/api/lessons/by-module/${moduleId}`);
    const lessons = await lessonsResp.json();
    
    const lessonList = document.getElementById(`module-${moduleId}-lessons`);
    lessonList.innerHTML = "";  // Limpiar las lecciones previas

    lessons.forEach(lesson => {
        const lessonButton = document.createElement('button');
        lessonButton.innerText = lesson.title;
        lessonButton.onclick = () => updateLessonContent(lesson);
        lessonList.appendChild(lessonButton);
    });
}

// Mostrar contenido de la lección
function updateLessonContent(lesson) {
    const contentDiv = document.getElementById('module-content');
    contentDiv.innerHTML = `
        <h2>${lesson.title}</h2>
        <p>${lesson.content_html || "Contenido de la lección..."}</p>
        <video src="${lesson.video_url}" controls></video>
    `;
}
