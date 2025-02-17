export function sortByDate(tasks) {
    return [...tasks].sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA - dateB;
    });
}

export function sortByPriority(tasks) {
    const priorityWeight = {
        high: 1,
        medium: 2,
        low: 3
    };
    
    return [...tasks].sort((a, b) => {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
    });
}
