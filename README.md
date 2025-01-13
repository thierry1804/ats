# ATS Resume Analyzer

Un système d'analyse de CV intelligent qui utilise l'IA pour évaluer la compatibilité entre un CV et une description de poste.

## Fonctionnalités

- 📄 Upload de CV (formats PDF, DOC, DOCX)
- 📝 Analyse de la description de poste
- 🎯 Score de correspondance ATS
- 🔍 Analyse des mots-clés :
  - Correspondances fortes
  - Mots-clés manquants
- 🤖 Analyse IA approfondie :
  - Points clés
  - Suggestions d'amélioration
  - Analyse des compétences (techniques et soft skills)
  - Analyse de l'expérience
- 📊 Génération de PDF optimisé avec recommandations

## Technologies Utilisées

- Frontend :
  - React
  - TypeScript
  - Tailwind CSS
  - Vite
- Backend :
  - Node.js
  - Express
  - TypeScript
  - Google Gemini AI
- Outils :
  - pdf-parse (extraction de texte PDF)
  - mammoth (extraction de texte DOC/DOCX)
  - natural (NLP pour l'analyse de texte)
  - PDFKit (génération de PDF)

## Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn
- Clé API Google Gemini

## Installation

1. Clonez le repository :
```bash
git clone https://github.com/thierry1804/ats.git
cd ats
```

2. Installez les dépendances du frontend :
```bash
npm install
```

3. Installez les dépendances du backend :
```bash
cd server
npm install
```

4. Créez un fichier `.env` dans le dossier `server` :
```env
GEMINI_API_KEY=votre-clé-api-gemini
PORT=3000
```

## Démarrage

1. Démarrez le backend :
```bash
cd server
npm run dev
```
Le serveur démarrera sur http://localhost:3000

2. Dans un nouveau terminal, démarrez le frontend :
```bash
npm run dev
```
L'application sera accessible sur http://localhost:5174

## Utilisation

1. Ouvrez l'application dans votre navigateur
2. Collez la description du poste dans la zone de texte
3. Uploadez votre CV (glisser-déposer ou via le bouton)
4. Cliquez sur "Analyze Resume"
5. Consultez les résultats de l'analyse
6. Optionnel : Générez un PDF optimisé avec les recommandations

## Structure du Projet

```
ats/
├── src/                    # Frontend React
│   ├── components/         # Composants React
│   ├── services/          # Services API
│   └── ...
├── server/                # Backend Node.js
│   ├── src/
│   │   ├── services/     # Services métier
│   │   └── index.ts      # Point d'entrée
│   └── uploads/          # Dossier des fichiers uploadés
└── ...
```

## API Endpoints

- `POST /api/analyze` : Analyse un CV
  - Body : FormData avec `resume` (fichier) et `jobDescription` (texte)
  - Response : Résultats de l'analyse

- `POST /api/generate-pdf` : Génère un PDF optimisé
  - Body : FormData avec `resume` (fichier) et `analysisResults` (JSON)
  - Response : Fichier PDF

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Contact

Thierry RANDRIANTIANA - thierry1804@gmail.com
Lien du projet : [https://github.com/thierry1804/ats](https://github.com/thierry1804/ats) 
