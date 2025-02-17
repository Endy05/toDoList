import './style.css';
import { Project, Task, Storage } from './modules/classes';
import DOM from './modules/dom';
import todoList from './todoList.json';
console.log(todoList);

let projects = Storage.loadProjects();

if (projects.length === 0) {
    console.log('No projects found in localStorage. Loading from todoList.json...');

    projects = todoList.projects.map(projData => {
        const project = new Project(projData.name);
        projData.tasks.forEach(taskData => {
            project.addTask(new Task(
                taskData.title,
                taskData.description,
                taskData.dueDate,
                taskData.priority,
                taskData.notes ?? "",
                taskData.checklist ?? [],
                taskData.completed ?? false
            ));
        });
        return project;
    });

    Storage.saveProjects(projects);
}

DOM.renderProjects(projects);
DOM.initializeCreateProjectButton(projects);

document.querySelector('.newtodo').addEventListener('click', () => {
    document.querySelector('.overlay-new').classList.add('active');
});

document.querySelectorAll('.create-new__option-items').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.create-new__option-items').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

document.querySelector('.create-new__close').addEventListener('click', () => {
    document.querySelector('.overlay-new').classList.remove('active');
});

// Add sort select event listener
const sortSelect = document.getElementById('sort-select');
if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        // Re-render current view
        const currentView = document.querySelector('.main-header').textContent;
        if (currentView === 'Inbox') {
            DOM.renderAllTasks(projects);
        } else if (currentView === 'Today') {
            DOM.renderTodayTasks(projects);
        } else if (currentView === 'Week') {
            DOM.renderWeekTasks(projects);
        } else {
            // Project view
            const project = projects.find(p => p.name === currentView);
            if (project) {
                DOM.renderTasks(project.tasks, project.name);
            }
        }
    });
}

// Add filter buttons functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Toggle active state
        const wasActive = btn.classList.contains('active');
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (!wasActive) {
            btn.classList.add('active');
        }

        // Re-render current view
        const currentView = document.querySelector('.main-header').textContent;
        const projects = Storage.loadProjects();
        
        switch(currentView) {
            case 'Inbox':
                DOM.renderAllTasks();
                break;
            case 'Today':
                DOM.renderTodayTasks(projects);
                break;
            case 'Week':
                DOM.renderWeekTasks(projects);
                break;
            default:
                const project = projects.find(p => p.name === currentView);
                if (project) {
                    DOM.renderTasks(project.tasks, currentView);
                }
        }
    });
});

// --- Added code for header time display ---
function updateHeaderTime() {
    const header = document.querySelector('#header');
    if (!header) return;
    let timeElem = document.getElementById('header-time');
    // Create the time element if it doesn't exist
    if (!timeElem) {
        timeElem = document.createElement('div');
        timeElem.id = 'header-time';
        header.appendChild(timeElem);
    }
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    timeElem.textContent = `${hours}:${minutes} | ${day}.${month}.${year}`;
}
updateHeaderTime();
setInterval(updateHeaderTime, 10000);
