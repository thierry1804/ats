import { readFile } from 'fs/promises';
import path from 'path';

interface SkillCategory {
  name: string;
  keywords: string[];
  synonyms: { [key: string]: string[] };
}

interface SkillsDatabase {
  categories: SkillCategory[];
  allSynonyms: { [key: string]: string[] };
}

class SkillsDatabaseManager {
  private static instance: SkillsDatabaseManager;
  private database: SkillsDatabase = {
    categories: [],
    allSynonyms: {}
  };

  private constructor() {}

  public static getInstance(): SkillsDatabaseManager {
    if (!SkillsDatabaseManager.instance) {
      SkillsDatabaseManager.instance = new SkillsDatabaseManager();
    }
    return SkillsDatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Charger la base de données depuis un fichier JSON
      const dbPath = path.join(__dirname, '../data/skills_database.json');
      const data = await readFile(dbPath, 'utf-8');
      this.database = JSON.parse(data);
    } catch (error) {
      console.error('Error loading skills database:', error);
      // Initialiser avec des données par défaut si le fichier n'existe pas
      this.initializeDefaultData();
    }
  }

  private initializeDefaultData(): void {
    this.database = {
      categories: [
        {
          name: 'Programming Languages',
          keywords: ['java', 'python', 'javascript', 'typescript', 'c++', 'c#'],
          synonyms: {
            'javascript': ['js', 'ecmascript', 'node.js', 'nodejs'],
            'python': ['py', 'python3', 'python2'],
            'typescript': ['ts']
          }
        },
        {
          name: 'Web Development',
          keywords: ['react', 'angular', 'vue', 'html', 'css', 'sass'],
          synonyms: {
            'react': ['reactjs', 'react.js', 'react native'],
            'angular': ['angularjs', 'angular2+'],
            'vue': ['vuejs', 'vue.js']
          }
        },
        {
          name: 'DevOps',
          keywords: ['docker', 'kubernetes', 'aws', 'azure', 'ci/cd'],
          synonyms: {
            'kubernetes': ['k8s', 'kube'],
            'ci/cd': ['continuous integration', 'continuous deployment', 'pipeline']
          }
        }
      ],
      allSynonyms: {}
    };

    // Construire l'index global des synonymes
    this.buildSynonymsIndex();
  }

  private buildSynonymsIndex(): void {
    this.database.allSynonyms = {};
    for (const category of this.database.categories) {
      for (const [key, synonyms] of Object.entries(category.synonyms)) {
        this.database.allSynonyms[key] = synonyms;
        // Ajouter aussi les références inverses
        for (const synonym of synonyms) {
          if (!this.database.allSynonyms[synonym]) {
            this.database.allSynonyms[synonym] = [key];
          } else if (!this.database.allSynonyms[synonym].includes(key)) {
            this.database.allSynonyms[synonym].push(key);
          }
        }
      }
    }
  }

  public findSynonyms(skill: string): string[] {
    const normalizedSkill = skill.toLowerCase();
    return this.database.allSynonyms[normalizedSkill] || [];
  }

  public isSkillEquivalent(skill1: string, skill2: string): boolean {
    const normalized1 = skill1.toLowerCase();
    const normalized2 = skill2.toLowerCase();

    if (normalized1 === normalized2) return true;

    const synonyms1 = this.findSynonyms(normalized1);
    const synonyms2 = this.findSynonyms(normalized2);

    return (
      synonyms1.includes(normalized2) ||
      synonyms2.includes(normalized1) ||
      synonyms1.some(s => synonyms2.includes(s))
    );
  }

  public getCategoryForSkill(skill: string): string | null {
    const normalizedSkill = skill.toLowerCase();
    for (const category of this.database.categories) {
      if (
        category.keywords.includes(normalizedSkill) ||
        Object.entries(category.synonyms).some(([key, synonyms]) =>
          key === normalizedSkill || synonyms.includes(normalizedSkill)
        )
      ) {
        return category.name;
      }
    }
    return null;
  }

  public getAllSkillsInCategory(categoryName: string): string[] {
    const category = this.database.categories.find(c => c.name === categoryName);
    if (!category) return [];

    const skills = [...category.keywords];
    for (const [key, synonyms] of Object.entries(category.synonyms)) {
      if (!skills.includes(key)) {
        skills.push(key);
      }
      skills.push(...synonyms.filter(s => !skills.includes(s)));
    }
    return skills;
  }
}

export default SkillsDatabaseManager; 