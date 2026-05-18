// Vérification de la session et initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Configuration globale d'Axios avec le token d'authentification
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;

  chargerTableauDeBord();
  configurerEcouteurs();
});

// Chargement de toutes les données du tableau de bord en un seul appel Axios
async function chargerTableauDeBord() {
  try {
    const reponse = await axios.get("http://localhost:3000/api/dashboard"");
    const donnees = reponse.data;

    // Affichage des métriques dans les cartes statistiques
    document.getElementById('compteurProjetsActifs').innerText   = donnees.projetsActifs;
    document.getElementById('compteurTachesAssignees').innerText = donnees.tachesAssignees;
    document.getElementById('compteurTachesTerminees').innerText = donnees.tachesTerminees;
    document.getElementById('compteurTachesEnRetard').innerText  = donnees.tachesEnRetard;

    // Affichage des tâches en cours triées par priorité puis par date limite
    const listeTachesEnCours = document.getElementById('listeTachesEnCours');
    if (donnees.tachesEnCours.length === 0) {
      listeTachesEnCours.innerHTML = '<li>Aucune tâche en cours.</li>';
    } else {
      listeTachesEnCours.innerHTML = donnees.tachesEnCours.map(t => `
        <li>
          <strong>${t.title}</strong> —
          Priorité : ${t.priority} —
          Projet : ${t.project?.title || 'N/A'}
          ${t.dueDate ? '— Échéance : ' + new Date(t.dueDate).toLocaleDateString('fr-FR') : ''}
        </li>
      `).join('');
    }

    // Chargement initial des listes sans filtres
    chargerTaches({});
    chargerProjets({});

  } catch (erreur) {
    console.error('Erreur lors du chargement du tableau de bord :', erreur);
  }
}

// Chargement des tâches avec filtrage dynamique
async function chargerTaches(filtres) {
  try {
    const parametres = new URLSearchParams();
    if (filtres.status)   parametres.append('status', filtres.status);
    if (filtres.priority) parametres.append('priority', filtres.priority);
    if (filtres.search)   parametres.append('search', filtres.search);

    const reponse = await axios.get(`http://localhost:3000/api/tasks?${parametres}`);
    const listeTaches = document.getElementById('listeTachesFiltrees');

    if (reponse.data.length === 0) {
      listeTaches.innerHTML = '<li>Aucune tâche trouvée.</li>';
    } else {
      listeTaches.innerHTML = reponse.data.map(t => `
        <li>
          <strong>${t.title}</strong> —
          Statut : ${t.status} —
          Priorité : ${t.priority} —
          Projet : ${t.project?.title || 'N/A'}
        </li>
      `).join('');
    }
  } catch (erreur) {
    console.error('Erreur lors du chargement des tâches :', erreur);
  }
}

// Chargement des projets avec filtrage dynamique
async function chargerProjets(filtres) {
  try {
    const parametres = new URLSearchParams();
    if (filtres.status) parametres.append('status', filtres.status);
    if (filtres.search) parametres.append('search', filtres.search);

    const reponse = await axios.get(`http://localhost:3000/api/projects?${parametres}`);
    const listeProjets = document.getElementById('listeProjets');

    if (reponse.data.projects.length === 0) {
      listeProjets.innerHTML = '<li>Aucun projet trouvé.</li>';
    } else {
      listeProjets.innerHTML = reponse.data.projects.map(p => `
        <li>
          <strong>${p.title}</strong> —
          Statut : ${p.status}
          ${p.description ? '— ' + p.description : ''}
        </li>
      `).join('');
    }
  } catch (erreur) {
    console.error('Erreur lors du chargement des projets :', erreur);
  }
}

// Configuration des écouteurs d'événements pour les contrôles de filtrage
function configurerEcouteurs() {
  // Filtrage des tâches
  document.getElementById('boutonAppliquerFiltre').addEventListener('click', () => {
    chargerTaches({
      status:   document.getElementById('filtreStatut').value,
      priority: document.getElementById('filtrePriorite').value,
      search:   document.getElementById('champRecherche').value.trim()
    });
  });

  // Réinitialisation des filtres des tâches
  document.getElementById('boutonReinitialiser').addEventListener('click', () => {
    document.getElementById('filtreStatut').value   = '';
    document.getElementById('filtrePriorite').value = '';
    document.getElementById('champRecherche').value = '';
    chargerTaches({});
  });

  // Filtrage des projets
  document.getElementById('boutonFiltrerProjets').addEventListener('click', () => {
    chargerProjets({
      status: document.getElementById('filtreStatutProjet').value,
      search: document.getElementById('rechercheProjet').value.trim()
    });
  });
}

function seDeconnecter() {
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
  window.location.href = 'index.html';
}
