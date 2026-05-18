

// Récupérer l'ID du projet depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const currentProjectId = urlParams.get('projectId');

function getDraftKey() {
    return `task_draft_${currentProjectId || 'global'}`;
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
    console.log('✅ Brouillon sauvegardé');
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
    console.log('📋 Brouillon restauré');
}

// Supprimer le brouillon
function deleteDraft() {
    localStorage.removeItem(getDraftKey());
    document.getElementById('draftBanner').style.display = 'none';
    console.log('🗑️ Brouillon supprimé');
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

// Charger les infos du projet
async function loadProjectInfo() {
    if (!currentProjectId) {
        console.warn('Aucun projectId dans l\'URL');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/projects/${currentProjectId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const projectNameInput = document.getElementById('projectName');
        if (projectNameInput) {
            projectNameInput.value = response.data.title;
        }
        
        const projectIdInput = document.getElementById('projectIdInput');
        if (projectIdInput) {
            projectIdInput.value = currentProjectId;
        }
        
    } catch (error) {
        console.error('Erreur chargement projet:', error);
    }
}

// Charger les membres du projet pour le menu d'assignation
async function loadMembers() {
    if (!currentProjectId) return;
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/projects/${currentProjectId}/members`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const select = document.getElementById('assignedTo');
        if (!select) return;
        response.data.forEach(member => {
            const option = document.createElement('option');
            option.value = member._id;
            option.textContent = `${member.fullName} (${member.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement membres:', error);
    }
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    loadProjectInfo();
    loadMembers(); 
    setupAutoSave();
    checkForDraft();
    
    document.getElementById('taskForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const projectId = document.getElementById('projectIdInput')?.value || currentProjectId;
        
        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            priority: document.getElementById('priority').value,
            status: document.getElementById('status').value,
            project: projectId,
            assignedTo: document.getElementById('assignedTo').value || undefined
        };
        
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/tasks', taskData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            deleteDraft();
            alert('✅ Tâche créée avec succès !');
            window.location.href = `tasks.html?projectId=${projectId}`;
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la création de la tâche');
        }
    });
});
