export class Project {
    constructor(name) {
        this.name = name;
        this.tasks = [];
    }

    addTask(task) {
        if (this.tasks.some(t => t.title === task.title)) {
            return;
        }
        this.tasks.push(task);
    }

    removeTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
    }
}

export class Task {
    constructor(title, description, dueDate, priority, completed = false) {
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.priority = priority;
        this.completed = completed;
    }
}

export class Storage {

    static saveProjects(projects) {
        localStorage.setItem('projects', JSON.stringify(projects));
    }

    static loadProjects() {
        const projectsData = localStorage.getItem('projects');
        if (projectsData) {
            try {
                return JSON.parse(projectsData).map(projData => {
                    const project = new Project(projData.name);
                    projData.tasks.forEach(taskData => {
                        const task = new Task(
                            taskData.title,
                            taskData.description,
                            taskData.dueDate,
                            taskData.priority,
                            taskData.completed // Ensure completed status is loaded
                        );
                        project.addTask(task);
                    });
                    return project;
                });
            } catch (error) {
                console.error('Error parsing projects data from localStorage:', error);
                return [];
            }
        } else {
            return []; 
        }
    }

    static clearProjects() {
        localStorage.removeItem('projects');
    }
}
