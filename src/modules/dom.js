import { Storage } from './classes';
import { sortByDate, sortByPriority } from './sort';

// Add isTaskOverdue helper function at the top
function isTaskOverdue(task) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && !task.completed; // Don't mark completed tasks as overdue
}

function validateTaskForm(title, date) {
    const errors = [];
    
    if (!title || title.trim().length === 0) {
        errors.push("Title is required");
    }
    
    if (!date) {
        errors.push("Due date is required");
    } else {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            errors.push("Due date cannot be in the past");
        }
    }
    
    return errors;
}

function filterTasks(tasks, filterType) {
    switch (filterType) {
        case 'completed':
            return tasks.filter(task => task.completed);
        case 'overdue':
            return tasks.filter(task => isTaskOverdue(task));
        case 'active':
            return tasks.filter(task => !task.completed && !isTaskOverdue(task));
        default:
            return tasks;
    }
}

function createTaskElement(task, projectName, context) {
    const taskElement = document.createElement('div');
    taskElement.classList.add('task');
    if (task.completed) {
        taskElement.classList.add('completed');
    }

    // Add overdue styling
    if (isTaskOverdue(task) && !task.completed) {
        taskElement.classList.add('overdue');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('task-checkbox');
    checkbox.checked = task.completed;

    const titleGroup = document.createElement('div');
    titleGroup.classList.add('task-title-group');

    const title = document.createElement('h4');
    title.textContent = task.title;
    title.classList.toggle('overdue-title', isTaskOverdue(task) && !task.completed);

    titleGroup.appendChild(checkbox);
    titleGroup.appendChild(title);

    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        taskElement.classList.toggle('completed', task.completed);
        
        // Remove overdue styling when task is completed
        if (task.completed) {
            taskElement.classList.remove('overdue');
            title.classList.remove('overdue-title');
        } else if (isTaskOverdue(task)) {
            taskElement.classList.add('overdue');
            title.classList.add('overdue-title');
        }

        // Update in storage and refresh all tasks
        let projects = Storage.loadProjects();
        let tasksUpdated = false;
        
        projects = projects.map(project => {
            project.tasks = project.tasks.map(t => {
                if (t.title === task.title && t.dueDate === task.dueDate) {
                    tasksUpdated = true;
                    return { ...t, completed: task.completed };
                }
                return t;
            });
            return project;
        });

        if (tasksUpdated) {
            Storage.saveProjects(projects);
            
            // Re-render current view with fresh data
            const currentView = document.querySelector('.main-header').textContent;
            const freshProjects = Storage.loadProjects(); // Get fresh data
            
            switch (currentView) {
                case 'Inbox':
                    context.renderAllTasks();
                    break;
                case 'Today':
                    context.renderTodayTasks(freshProjects);
                    break;
                case 'Week':
                    context.renderWeekTasks(freshProjects);
                    break;
                default:
                    // Project view
                    const currentProject = freshProjects.find(p => p.name === currentView);
                    if (currentProject) {
                        context.renderTasks(currentProject.tasks, currentProject.name);
                    }
            }
        }
    });

    const dateObj = new Date(task.dueDate);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = isNaN(dateObj) ? task.dueDate : `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
    
    taskElement.appendChild(titleGroup);
    taskElement.insertAdjacentHTML('beforeend', `
        <div class="task-details-view">
            <div class="box-priority-task"> 
                <p class="priority priority-${task.priority}">${task.priority}</p>
            </div>
            <div class="box-date-task">
                <p>${formattedDate}</p>
            </div>
            <button class="details-task"></button>
            <button class="edit-task"></button>
            <button class="delete-task"></button>
        </div>
    `);

    return taskElement;
}

export default {
    renderProjects(projects) {
        const projectsContainer = document.querySelector('.project-list');
        projectsContainer.innerHTML = '';
    
        projects.forEach((project, index) => {
            const projectElement = document.createElement('div');
            projectElement.classList.add('project');
            projectElement.innerHTML = `
                <div class="project-header">
                    <div class="project-name" data-index="${index}">${project.name}</div>
                    <button class="delete-project" data-index="${index}">❌</button>
                </div>
            `;
    
            projectElement.querySelector('.project-name').addEventListener('click', () => {
                this.renderTasks(project.tasks, project.name);
            });
    
            projectElement.querySelector('.delete-project').addEventListener('click', (e) => {
                e.stopPropagation(); 
                this.deleteProject(index, projects);
            });
    
            projectsContainer.appendChild(projectElement);
        });
    
        const inboxElement = document.querySelector('.inbox');
        if (inboxElement) {
            inboxElement.addEventListener('click', () => {
                this.renderAllTasks(projects);
            });
        }

        const todayElement = document.querySelector('.today-task');
        if (todayElement) {
            todayElement.addEventListener('click', () => {
                this.renderTodayTasks(projects);
            });
        }

        const weekElement = document.querySelector('.week-task');
        if (weekElement) {
            weekElement.addEventListener('click', () => {
                this.renderWeekTasks(projects);
            });
        }


    },

    deleteProject(index, projects) {
        if (confirm('Are you sure you want to delete this project?')) {
            projects.splice(index, 1); 
            Storage.saveProjects(projects); 
            this.renderProjects(projects); 
            document.querySelector('.content').innerHTML = '<p>Select a project to view tasks.</p>';
            document.querySelector('.main-header').textContent = 'Projects';
        }
    },

    renderAllTasks() {
        let projects = Storage.loadProjects() || [];
        this.renderProjects(projects); // Add this line here
        const taskContainer = document.querySelector('.content');
        if (!taskContainer) return;
    
        document.querySelector('.main-header').textContent = 'Inbox';
        taskContainer.innerHTML = '';
    
        // Create a deep copy of tasks with their project names
        let allTasks = projects.flatMap(project => 
            project.tasks.map(task => ({
                ...JSON.parse(JSON.stringify(task)), // Deep copy to avoid reference issues
                projectName: project.name
            }))
        );

        // Apply filters if active
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter) {
            const filterType = activeFilter.id.replace('filter-', '');
            allTasks = filterTasks(allTasks, filterType);
        }
    
        if (allTasks.length === 0) {
            taskContainer.innerHTML = `<p class="notask-message">No tasks found in the Inbox.</p>`;
            return;
        }

        // Apply sorting
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            const sortType = sortSelect.value;
            if (sortType === 'date') {
                allTasks = sortByDate(allTasks);
            } else if (sortType === 'priority') {
                allTasks = sortByPriority(allTasks);
            }
        }
    
        allTasks.forEach(task => {
            const taskElement = createTaskElement(task, task.projectName, this);
            taskContainer.appendChild(taskElement);
            
            // Add event listeners
            taskElement.querySelector('.details-task').addEventListener('click', () => this.showTaskDetails(task));
            taskElement.querySelector('.edit-task').addEventListener('click', () => this.openEditTaskForm(task, task.projectName));
            taskElement.querySelector('.delete-task').addEventListener('click', () => this.deleteTask(task, task.projectName));
        });
    },

    renderTodayTasks(projects) {
        this.renderProjects(projects); // Add this line
        const taskContainer = document.querySelector('.content');
        if (!taskContainer) {
            console.error('No task container found!');
            return;
        }
    
        document.querySelector('.main-header').textContent = 'Today';
        taskContainer.innerHTML = '';
    
        // Get today's date and format it correctly
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
    
        // Create deep copies of tasks and filter for today
        let todayTasks = projects.flatMap(project =>
            project.tasks.map(task => ({
                ...JSON.parse(JSON.stringify(task)),
                projectName: project.name
            }))
        ).filter(task => task.dueDate === todayStr);

        // Apply filters if active
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter) {
            const filterType = activeFilter.id.replace('filter-', '');
            todayTasks = filterTasks(todayTasks, filterType);
        }
    
        if (todayTasks.length === 0) {
            taskContainer.innerHTML = `<p class="notask-message">No tasks found for Today.</p>`;
            return;
        }

        // Apply sorting if needed
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect && todayTasks.length > 0) {
            const sortType = sortSelect.value;
            if (sortType === 'date') {
                todayTasks = sortByDate(todayTasks);
            } else if (sortType === 'priority') {
                todayTasks = sortByPriority(todayTasks);
            }
        }
    
        todayTasks.forEach(task => {
            const taskElement = createTaskElement(task, task.projectName, this);
            taskContainer.appendChild(taskElement);
            // Add event listeners
            taskElement.querySelector('.details-task').addEventListener('click', () => this.showTaskDetails(task));
            taskElement.querySelector('.edit-task').addEventListener('click', () => this.openEditTaskForm(task, task.projectName));
            taskElement.querySelector('.delete-task').addEventListener('click', () => this.deleteTask(task, task.projectName));
        });
    },

    renderWeekTasks(projects) {
        this.renderProjects(projects); // Add this line
        const taskContainer = document.querySelector('.content');
        if (!taskContainer) {
            console.error('No task container found!');
            return;
        }

        document.querySelector('.main-header').textContent = 'Week';
        taskContainer.innerHTML = '';

        // Get today's date and week end date (7 days from now)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Gather all tasks across projects and filter tasks for the current week
        let weekTasks = projects.flatMap(project =>
            project.tasks.map(task => ({ ...task, projectName: project.name }))
        ).filter(task => {
            const taskDate = new Date(task.dueDate);
            if (isNaN(taskDate)) return false;
            // Check if taskDate is between today and weekEnd (inclusive)
            return taskDate >= today && taskDate <= weekEnd;
        });

        // Apply filters if active
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter) {
            const filterType = activeFilter.id.replace('filter-', '');
            weekTasks = filterTasks(weekTasks, filterType);
        }

        if (weekTasks.length === 0) {
            taskContainer.innerHTML = `<p class="notask-message">No tasks found for this week.</p>`;
            return;
        }

        // Add sorting before rendering tasks
        if (weekTasks.length > 0) {
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                const sortType = sortSelect.value;
                if (sortType === 'date') {
                    weekTasks = sortByDate(weekTasks);
                } else if (sortType === 'priority') {
                    weekTasks = sortByPriority(weekTasks);
                }
            }
        }

        weekTasks.forEach(task => {
            const taskElement = createTaskElement(task, task.projectName, this);
            taskContainer.appendChild(taskElement);
            // Add event listeners
            taskElement.querySelector('.details-task').addEventListener('click', () => this.showTaskDetails(task));
            taskElement.querySelector('.edit-task').addEventListener('click', () => this.openEditTaskForm(task, task.projectName));
            taskElement.querySelector('.delete-task').addEventListener('click', () => this.deleteTask(task, task.projectName));
        });
    },

    renderTasks(tasks, projectName) {
        const taskContainer = document.querySelector('.content');
        if (!taskContainer) {
            console.error('No task container found!');
            return;
        }
    
        document.querySelector('.main-header').textContent = projectName;
        taskContainer.innerHTML = '';
    
        if (!tasks || tasks.length === 0) {
            taskContainer.innerHTML = '<p>No tasks found for this project.</p>';
            return;
        }

        // Apply filters if active
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter) {
            const filterType = activeFilter.id.replace('filter-', '');
            tasks = filterTasks(tasks, filterType);
        }
    
        // Example: read selected sort type from a sort dropdown (assumes an element with id "sort-select")
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            const sortType = sortSelect.value;
            if (sortType === 'date') {
                tasks = sortByDate(tasks);
            } else if (sortType === 'priority') {
                tasks = sortByPriority(tasks);
            }
        }
    
        tasks.forEach(task => {
            const taskElement = createTaskElement(task, projectName, this);
            taskContainer.appendChild(taskElement);
            // Add event listeners
            taskElement.querySelector('.details-task').addEventListener('click', () => this.showTaskDetails(task));
            taskElement.querySelector('.edit-task').addEventListener('click', () => this.openEditTaskForm(task, projectName));
            taskElement.querySelector('.delete-task').addEventListener('click', () => this.deleteTask(task, projectName));
        });
    },  
    
    openEditTaskForm(task, projectName) {
        // Create overlay modal for editing the task
        const overlay = document.createElement('div');
        overlay.classList.add('overlay-edit');
        overlay.innerHTML = `
            <div class="edit-task-form">
                <h2>Edit Task</h2>
                <label>
                    Title:
                    <input type="text" maxlenght="50" id="edit-task-title" value="${task.title}">
                </label>
                <label>
                    Description:
                    <textarea id="edit-task-description">${task.description || ''}</textarea>
                </label>
                <label>
                    Due Date:
                    <input type="date" id="edit-task-date" value="${task.dueDate}">
                </label>
                <label>
                    Priority:
                    <select id="edit-task-priority">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </label>
                <div class="edit-task-buttons">
                    <button id="save-edit-task">Save</button>
                    <button id="cancel-edit-task">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Cancel editing
        overlay.querySelector('#cancel-edit-task').addEventListener('click', () => {
            overlay.remove();
        });

        // Save edited task
        overlay.querySelector('#save-edit-task').addEventListener('click', () => {
            const newTitle = this.sanitize(overlay.querySelector('#edit-task-title').value.trim());
            const newDate = overlay.querySelector('#edit-task-date').value;
            
            const errors = validateTaskForm(newTitle, newDate);
            
            if (errors.length > 0) {
                alert(errors.join("\n"));
                return;
            }

            const updatedTask = {
                ...task,
                title: newTitle,
                description: this.sanitize(overlay.querySelector('#edit-task-description').value.trim()),
                dueDate: newDate,
                priority: overlay.querySelector('#edit-task-priority').value,
                completed: task.completed
            };

            let projects = Storage.loadProjects() || [];
            const project = projects.find(p => p.name === projectName);
            if (project) {
                // Locate the task by using a unique identifier (here we match title and dueDate)
                const taskIndex = project.tasks.findIndex(t => t.title === task.title && t.dueDate === task.dueDate);
                if (taskIndex > -1) {
                    project.tasks[taskIndex] = updatedTask;
                    Storage.saveProjects(projects);
                    this.renderTasks(project.tasks, projectName);
                    this.renderProjects(projects);
                }
            }

            overlay.remove();
        });
    },

    addNewProject(projectName, projects) {
        const sanitizedProjectName = this.sanitize(projectName);
        const newProject = { name: sanitizedProjectName, tasks: [] };
        projects.push(newProject);
        Storage.saveProjects(projects);
        this.renderProjects(projects);
    },

    // Helper function to sanitize user input
    sanitize(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    addNewTask(projects) {
        // Use sanitize function to escape user input
        const taskTitle = this.sanitize(document.getElementById('task-title').value.trim());
        const taskDescription = this.sanitize(document.getElementById('task-description').value.trim());
        const taskDate = document.getElementById('task-date').value;
        const taskPriority = document.getElementById('task-priority').value;
        const taskProject = this.sanitize(document.getElementById('task-project').value);
        
        const errors = validateTaskForm(taskTitle, taskDate);
        
        if (errors.length > 0) {
            alert(errors.join("\n"));
            return;
        }

        if (taskTitle === '' || taskProject === '') {
            alert('Please fill in all required fields.');
            return;
        }

        const task = {
            title: taskTitle,
            description: taskDescription,
            dueDate: taskDate,
            priority: taskPriority,
            project: taskProject,
            completed: false // Ensure new tasks start as uncompleted
        };

        projects = Storage.loadProjects(); // Ensure latest state
        const selectedProject = projects.find(project => project.name === taskProject);
        if (selectedProject) {
            selectedProject.tasks.push(task);
            Storage.saveProjects(projects);
            this.renderTasks(selectedProject.tasks, selectedProject.name);
        }

        // Clear input fields
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-date').value = '';
        document.getElementById('task-priority').value = 'low';
        document.querySelector('.overlay-new').classList.remove('active');
        this.renderProjects(projects);
    },
    
    deleteTask(taskToDelete, projectName) {
        let projects = Storage.loadProjects() || [];
        const selectedProject = projects.find(project => project.name === projectName);
    
        if (!selectedProject) return;

        selectedProject.tasks = selectedProject.tasks.filter(task => task.title !== taskToDelete.title);

        Storage.saveProjects(projects);
    
        console.log("Updated projects after deletion:", Storage.loadProjects());
    
        this.renderProjects(projects);
        this.renderAllTasks();
        this.renderTasks(selectedProject.tasks, selectedProject.name);  
    },

    showTaskDetails(task) {
        // Create an overlay for task details with a separated header and body
        const overlay = document.createElement('div');
        overlay.classList.add('overlay-task-details');
        overlay.innerHTML = `
            <div class="details-modal">
                <header class="details-header">
                    <h2>Task Details</h2>
                </header>
                <div class="details-body">
                    <p><strong>Title:</strong> ${task.title}</p>
                    <p><strong>Description:</strong> ${task.description || 'No description'}</p>
                    <p><strong>Due Date:</strong> ${task.dueDate}</p>
                    <p><strong>Priority:</strong> ${task.priority}</p>
                </div>
                <button class="close-details">Close</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close when clicking outside the modal content
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close when clicking the close button
        overlay.querySelector('.close-details').addEventListener('click', () => {
            overlay.remove();
        });
    },
    
    initializeCreateProjectButton(projects) {
        const createButton = document.getElementById('create-project');
        const createTaskButton = document.getElementById('create-task');
        const projectNameInput = document.getElementById('project-name');
    
        createButton.addEventListener('click', () => {
            const projectName = projectNameInput.value.trim();
            if (projectName) {
                this.addNewProject(projectName, projects);
                projectNameInput.value = '';
                document.querySelector('.overlay-new').classList.remove('active');
            } else {
                alert('Please enter a project name.');
            }
        });
    
        createTaskButton.addEventListener('click', () => {
            this.renderProjects(projects);
            this.addNewTask(projects);
        });
    
        document.querySelectorAll('.create-new__option-items').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.create-new__option-items').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
    
                if (item.classList.contains('overlay-task')) {
                    this.showTaskForm(projects);
                } else if (item.classList.contains('project')) {
                    this.showProjectForm();
                }
            });
        });
    
        document.querySelector('.create-new__close').addEventListener('click', () => {
            document.querySelector('.overlay-new').classList.remove('active');
        });
    },

    showTaskForm(projects) {
        const taskForm = document.querySelector('.task-form');
        const projectForm = document.querySelector('.project-form');
        
        taskForm.classList.remove('hidden');
        projectForm.classList.add('hidden');
        this.populateProjectOptions(projects); 
    },

    showProjectForm() {
        const taskForm = document.querySelector('.task-form');
        const projectForm = document.querySelector('.project-form');
        
        projectForm.classList.remove('hidden');
        taskForm.classList.add('hidden');
        
        this.clearTaskForm();
    },

    clearTaskForm() {
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-date').value = '';
        document.getElementById('task-priority').value = 'low';
    },

    populateProjectOptions(projects) {
        const projectSelect = document.getElementById('task-project');
        projectSelect.innerHTML = ''; 
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.name;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    }
};
