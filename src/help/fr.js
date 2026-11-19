// Guide du jeu (français). Même structure que en.js.
export const HELP = {
  title: 'Guide du jeu',
  intro: 'Tout ce qu\'il faut pour ton voyage à Séoul. Touche un sujet pour l\'ouvrir.',
  sections: [
    { icon: '🚶', title: 'Se déplacer', lines: [
      'Téléphone : fais glisser le joystick en bas à gauche pour marcher. Fais glisser l\'écran pour regarder, pince pour zoomer.',
      'Ordinateur : W A S D pour marcher, Maj pour courir, glisse la souris pour regarder, molette pour zoomer. V passe en vue à la première personne.',
      'Approche-toi d\'une porte ou d\'une personne et touche le gros bouton (E ou Espace) pour entrer ou parler.',
      'Émotes : le bouton des émotes, ou les touches 1–9. Échap ferme les fenêtres.',
    ] },
    { icon: '🗺️', title: 'Carte et transports', lines: [
      '🗺️ Carte : cherche des boutiques, de la nourriture ou des produits. Touche un lieu et la marche auto t\'y emmène gratuitement.',
      '🛵 Véhicule : le vélo en libre-service est gratuit et bien plus rapide que la marche. Les magasins de vélos vendent des véhicules plus rapides.',
      '🚇 Métro : descends l\'escalier de la station et paie au portique. 🚕 Taxi : choisis un lieu sur la carte ; les amis à côté de toi partagent le prix.',
      '⛴️ Le bateau-taxi du fleuve Han entre les parcs du fleuve, et 🚡 le téléphérique qui monte à Namsan.',
    ] },
    { icon: '🪙', title: 'Gagner de l\'argent', lines: [
      '📅 Pointe chaque jour, et termine les trois missions du jour pour un bonus.',
      'Les guides des places et des centres d\'information donnent de petites missions. Fais-les puis reviens au rapport.',
      'Petits boulots : livraisons de repas pour les boutiques, un service au stand pocha, mini-jeux avec médailles, cours de cuisine.',
      'Pêche au fleuve Han et vends tes poissons au marché aux poissons.',
      'Vends les vêtements dont tu ne veux plus aux friperies, ou à d\'autres joueurs au Potato Market de Dongmyo.',
      'L\'argent est en wons virtuels, sans valeur réelle. Touche ton argent pour voir ton porte-monnaie.',
    ] },
    { icon: '🛍️', title: 'Shopping et style', lines: [
      'Entre dans une boutique pour regarder, essayer et acheter. Tes achats vont dans ton 🎒 Sac.',
      'Change de tenue depuis ton Sac. Coiffeurs, clinique de beauté et atelier de badges changent le reste.',
      '⚙️ Réglages → Traduire les enseignes affiche toutes les enseignes dans ta langue.',
    ] },
    { icon: '🏠', title: 'Ta maison', lines: [
      'Ton appartement est à Forest Lane Apartments, près de la sortie 2 de la station Seoul Forest.',
      '🛋️ Décorer : place, tourne et déplace tes meubles. Meubles, lampes, papier peint et aquariums s\'achètent dans les boutiques.',
      '🏗️ Agrandir la maison : agrandis-la étape par étape quand tu as assez économisé.',
      'Qui peut venir : Tout le monde, Amis (par défaut) ou Personne. Jusqu\'à 4 personnes à la fois.',
    ] },
    { icon: '🎣', title: 'Pêche', lines: [
      'Va dans un parc du fleuve Han et touche Aller pêcher. Lance, attends, et touche Ferrer ! dès que ça mord.',
      'Puis touche les deux boutons Mouliner à tour de rôle (touches ← →) jusqu\'à le sortir.',
      'La pêche auto est lente et n\'attrape jamais de poissons rares (★3 et plus) : ceux-là, à la main.',
      'Les nouveaux poissons vont dans ton 📖 Carnet des poissons. L\'appât du stand du grand-père dans le parc aide un peu.',
    ] },
    { icon: '👥', title: 'Amis et chat', lines: [
      '💬 Chat (T ou Entrée) : parle à tout le monde autour, à tous tes amis ou à un ami.',
      'Touche un nom dans le chat pour l\'ajouter en ami, ou ajoute-le par son nom avec 👥 dans la barre du chat.',
      'Avec des amis, tu peux partager un taxi, rouler ensemble, visiter des maisons et offrir des cadeaux. Faire des choses ensemble donne un bonus.',
    ] },
    { icon: '📔', title: 'Ton carnet', lines: [
      'Le Carnet contient tes tampons de lieux, le livre de recettes, le livre des plats, le carnet des poissons et le livre de comptes.',
      'Visite des lieux pour gagner des tampons. Complète tout le carnet pour un cadre doré sur la carte.',
      '📒 Le livre de comptes montre d\'où vient ton argent et où il est parti.',
    ] },
    { icon: '🎆', title: 'Jour, nuit et spectacles', lines: [
      'Une journée à Séoul dure 3 heures, donc la nuit revient souvent. Les spectacles sont rares exprès.',
      '20 h 10, heure de Corée, chaque jour : le défilé des lanternes de Cheonggyecheon à Jogyesa.',
      '23 h 10, heure de Corée : feu d\'artifice à Yeouido ou spectacle de drones à Ttukseom, un jour sur deux.',
      'Un avis en haut de l\'écran te prévient avant le début.',
    ] },
    { icon: '💾', title: 'Sauvegarder ta progression', lines: [
      'En invité, ta progression peut être perdue si tu effaces ce navigateur ou changes d\'appareil.',
      '⚙️ Réglages → Lier un compte Google garde ton argent, tes objets et ta maison, sur n\'importe quel appareil.',
    ] },
  ],
};
