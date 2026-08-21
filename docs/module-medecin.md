# Module Médecin (G2)

## Périmètre

Gestion du référentiel des médecins : CRUD complet (créer, lister, consulter, éditer, supprimer),
rattachement obligatoire à une clinique, filtrage de la liste par clinique et par spécialité
(recherche partielle, insensible à la casse).

## Choix techniques et règles métier

- **Suppression protégée** : un médecin ayant des rendez-vous rattachés ne peut pas être supprimé.
  `MedecinService.delete` vérifie `RendezVousRepository.existsByMedecinId` et lève
  `MedecinAvecRendezVousException` (400, message `error.medecinAvecRendezVous`) plutôt que de
  laisser remonter une contrainte d'intégrité SQL brute.
- **Filtrage backend** : `GET /api/medecins` accepte les paramètres optionnels `cliniqueId` et
  `specialite`. Implémenté via une requête JPQL unique (`MedecinRepository.findByFilters`) plutôt
  que par des `Specification` dynamiques, car les deux seuls critères de filtre ne le justifiaient
  pas.
- **Filtre liste médecins (J5)** : la passe d'harmonisation visuelle des barres de recherche (G6)
  avait remplacé le filtre fonctionnel de la liste médecins par une carte statique non reliée à la
  logique du composant (select clinique avec options codées en dur, champ texte sans binding).
  Rebranché sur `cliniqueFilter`/`specialiteFilter`/`onCliniqueFilterChange`/
  `onSpecialiteFilterChange` déjà existants, en conservant le style visuel harmonisé. Seul ajout :
  `resetFilters()` pour le bouton "Réinitialiser".

## Cohérence médecin ↔ clinique — constat (J5, hors périmètre de correction G2)

Vérification demandée sur toutes les pages où l'affichage médecin/clinique apparaît :

- **Module Médecin** (fiche médecin, liste médecin) : cohérent, le lien vers la clinique
  s'affiche correctement partout.
- **Fiche clinique** (module G1, `clinique-detail.html`) : n'affiche pas la liste des médecins qui
  y sont rattachés, alors que la fiche médecin affiche bien sa clinique — asymétrie à signaler à G1.
- **Détail rendez-vous** (module G5, `rendez-vous-detail.html`) : affiche l'ID brut du médecin et
  de la clinique au lieu du nom, alors que la liste des rendez-vous affiche bien `medecin.nom` /
  `clinique.nom` — incohérence entre ces deux pages, à signaler à G5.
- **Formulaire création/édition RDV** (module G5) : le select médecin n'est pas filtré par la
  clinique choisie ; un contrôle serveur existe déjà (`RendezVousService.verifierCoherenceMedecinClinique`,
  `MedecinCliniqueIncoherenteException`) mais rien ne guide l'utilisateur côté formulaire avant
  l'échec de sauvegarde.

Ces trois points concernent des fichiers appartenant aux modules Clinique (G1) et Rendez-vous (G5) ;
ils ne sont pas corrigés depuis la branche G2 pour éviter les doublons de travail et les conflits,
et sont remontés ici pour que G1/G5/G7 en aient connaissance avant la démo.

## Difficultés rencontrées

- Une exception métier définie dans la couche `service` ne doit pas dépendre de la couche `web`
  (règle ArchUnit du projet) : `MedecinAvecRendezVousException` duplique volontairement la
  constante `DEFAULT_TYPE` plutôt que de l'importer depuis `ErrorConstants`.
- Conflits JDL mineurs avec les branches des autres groupes lors des rebases sur `main`, résolus en
  regénérant uniquement l'entité `Medecin` plutôt que l'ensemble du modèle.
