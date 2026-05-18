// NOTIFICATIONS


let notifications = [];
let pollingInterval = null;

//  Charger les notifications depuis le serveur 
async function loadNotifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

const response = await axios.get('http://localhost:3000/api/notifications', {
            headers: { Authorization: `Bearer ${token}` }
        });

        notifications = response.data;
        
        // Archiver dans localStorage
        localStorage.setItem('cached_notifications', JSON.stringify(notifications));
        
        // Mettre à jour l'affichage
        updateBadge();
        updateNotificationList();
        
    } catch (error) {
        console.error('Erreur chargement notifications:', error);
        const cached = localStorage.getItem('cached_notifications');
        if (cached) {
            notifications = JSON.parse(cached);
            updateBadge();
            updateNotificationList();
        }
    }
}

//  Mettre à jour le badge 
function updateBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

//  Afficher la liste des notifications 
function updateNotificationList() {
    const container = document.getElementById('notificationList');
    
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="notification-item">Aucune notification</div>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" 
             data-id="${notif._id}"
             onclick="markAsRead('${notif._id}')">
            <div>${notif.message}</div>
            <small>${formatDate(notif.createdAt)}</small>
        </div>
    `).join('');
}

//  Marquer une notification comme lue 
async function markAsRead(notificationId) {
    try {
        const token = localStorage.getItem('token');
await axios.patch(`http://localhost:3000/api/notifications/${notificationId}/read`, {}, {

            headers: { Authorization: `Bearer ${token}` }
        });
        
        const notif = notifications.find(n => n._id === notificationId);
        if (notif) notif.read = true;
        
        updateBadge();
        
        const element = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (element) {
            element.classList.remove('unread');
        }
        
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Marquer toutes comme lues 
async function markAllAsRead() {
    try {
        const token = localStorage.getItem('token');
await axios.post('http://localhost:3000/api/notifications/read-all', {}, {

            headers: { Authorization: `Bearer ${token}` }
        });
        
        notifications.forEach(n => n.read = true);
        updateBadge();
        updateNotificationList();
        
    } catch (error) {
        console.error('Erreur:', error);
    }
}

//  Polling (toutes les 30 secondes) 
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
const response = await axios.get('http://localhost:3000/api/notifications', {

                headers: { Authorization: `Bearer ${token}` }
            });
            
            const oldIds = notifications.map(n => n._id);
            const newNotifs = response.data.filter(n => !oldIds.includes(n._id));
            
            if (newNotifs.length > 0) {
                notifications = response.data;
                updateBadge();
                updateNotificationList();
                console.log(`${newNotifs.length} nouvelle(s) notification(s)`);
            }
            
        } catch (error) {
            console.error('Erreur polling:', error);
        }
    }, 30000);
}

//  Gérer l'affichage du dropdown
function setupDropdown() {
    const icon = document.getElementById('notificationIcon');
    const dropdown = document.getElementById('notificationDropdown');
    const markAllBtn = document.getElementById('markAllReadBtn');
    
    if (!icon || !dropdown) return;
    
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            loadNotifications();
        }
    });
    
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });
    
    if (markAllBtn) {
        markAllBtn.addEventListener('click', markAllAsRead);
    }
}

//  Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    return `Il y a ${diffDays} j`;
}

// Initialisation 
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    loadNotifications();
    startPolling();
    setupDropdown();
});

window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});