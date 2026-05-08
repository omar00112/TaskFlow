

let currentProjectId = 'projet_demo';

function getDraftKey() {
    return 'task_draft_' + currentProjectId;
}

// Sauvegarde automatique
function saveDraft() {
    var draft = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value,
        status: document.getElementById('status').value,
        savedAt: new Date().toISOString()
    };
    
    if (draft.title === '' && draft.description === '') {
        return;
    }
    
    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    console.log(' Brouillon sauvegardé');
}

// Restaurer le brouillon
function restoreDraft() {
    var saved = localStorage.getItem(getDraftKey());
    if (!saved) return;
    
    var draft = JSON.parse(saved);
    document.getElementById('title').value = draft.title;
    document.getElementById('description').value = draft.description;
    document.getElementById('priority').value = draft.priority;
    document.getElementById('status').value = draft.status;
    
    document.getElementById('draftBanner').style.display = 'none';
    console.log(' Brouillon restauré');
}

// Supprimer le brouillon
function deleteDraft() {
    localStorage.removeItem(getDraftKey());
    document.getElementById('draftBanner').style.display = 'none';
    console.log(' Brouillon supprimé');
}

// Vérifier si un brouillon existe
function checkForDraft() {
    if (localStorage.getItem(getDraftKey())) {
        document.getElementById('draftBanner').style.display = 'block';
    }
}

// Activer l'auto-save sur tous les champs
function setupAutoSave() {
    var fields = ['title', 'description', 'priority', 'status'];
    for (var i = 0; i < fields.length; i++) {
        var el = document.getElementById(fields[i]);
        if (el) {
            el.addEventListener('input', saveDraft);
            el.addEventListener('change', saveDraft);
        }
    }
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    setupAutoSave();
    checkForDraft();
    
    document.getElementById('taskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Tâche créée avec succès !');
        deleteDraft();
    });
});