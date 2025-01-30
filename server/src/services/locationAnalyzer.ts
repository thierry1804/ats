export interface Location {
  city: string;
  region?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface MobilityPreferences {
  isRemoteOnly?: boolean;
  isHybridAccepted?: boolean;
  isRelocationAccepted?: boolean;
  maxCommuteDistance?: number;  // en kilomètres
  preferredLocations?: Location[];
}

export interface LocationMatch {
  candidateLocation: Location;
  jobLocation: Location;
  distance: number;  // en kilomètres
  isWithinCommutingDistance: boolean;
  matchType: 'exact' | 'same_city' | 'commutable' | 'requires_relocation';
}

export interface LocationAnalysis {
  match: LocationMatch;
  score: number;
  isViable: boolean;
  workArrangement: 'remote' | 'on_site' | 'hybrid' | 'not_viable';
  recommendations: string[];
}

class LocationAnalyzer {
  private static instance: LocationAnalyzer;

  private constructor() {}

  public static getInstance(): LocationAnalyzer {
    if (!LocationAnalyzer.instance) {
      LocationAnalyzer.instance = new LocationAnalyzer();
    }
    return LocationAnalyzer.instance;
  }

  private calculateDistance(
    location1: Location,
    location2: Location
  ): number {
    if (!location1.coordinates || !location2.coordinates) {
      // Si les coordonnées ne sont pas disponibles, utiliser une estimation basée sur la ville/région
      if (location1.city === location2.city) return 0;
      if (location1.region === location2.region) return 30;  // Estimation moyenne intra-région
      if (location1.country === location2.country) return 300;  // Estimation moyenne inter-région
      return 1000;  // Estimation pour différents pays
    }

    // Calcul de la distance avec la formule de Haversine
    const R = 6371;  // Rayon de la Terre en km
    const dLat = this.toRad(location2.coordinates.latitude - location1.coordinates.latitude);
    const dLon = this.toRad(location2.coordinates.longitude - location1.coordinates.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(location1.coordinates.latitude)) * 
      Math.cos(this.toRad(location2.coordinates.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  private determineMatchType(
    distance: number,
    maxCommuteDistance: number
  ): 'exact' | 'same_city' | 'commutable' | 'requires_relocation' {
    if (distance === 0) return 'exact';
    if (distance < 5) return 'same_city';
    if (distance <= maxCommuteDistance) return 'commutable';
    return 'requires_relocation';
  }

  public async analyzeLocation(
    candidateLocation: Location,
    candidateMobility: MobilityPreferences,
    jobLocation: Location,
    jobRequirements: {
      isRemoteAllowed: boolean;
      isHybridAllowed: boolean;
      requiredOnSiteDays?: number;
      maxAllowedCommuteDistance?: number;
    }
  ): Promise<LocationAnalysis> {
    const distance = this.calculateDistance(candidateLocation, jobLocation);
    const maxCommuteDistance = Math.min(
      candidateMobility.maxCommuteDistance || 50,
      jobRequirements.maxAllowedCommuteDistance || 50
    );

    const match: LocationMatch = {
      candidateLocation,
      jobLocation,
      distance,
      isWithinCommutingDistance: distance <= maxCommuteDistance,
      matchType: this.determineMatchType(distance, maxCommuteDistance)
    };

    let score = 100;
    const recommendations: string[] = [];

    // Analyser la viabilité du travail à distance
    let workArrangement: 'remote' | 'on_site' | 'hybrid' | 'not_viable' = 'not_viable';

    if (candidateMobility.isRemoteOnly) {
      if (!jobRequirements.isRemoteAllowed) {
        score = 0;
        recommendations.push(
          "Le candidat souhaite travailler uniquement à distance, mais le poste requiert une présence sur site."
        );
      } else {
        workArrangement = 'remote';
        score = 100;
      }
    } else if (match.matchType === 'requires_relocation') {
      if (!candidateMobility.isRelocationAccepted) {
        score = 0;
        recommendations.push(
          "Le poste nécessite une relocalisation, mais le candidat n'est pas disposé à déménager."
        );
      } else {
        workArrangement = 'on_site';
        score = 70;  // Pénalité pour la nécessité de relocalisation
        recommendations.push(
          "Une relocalisation sera nécessaire. Discuter des conditions et du support à la mobilité."
        );
      }
    } else if (match.isWithinCommutingDistance) {
      if (jobRequirements.isHybridAllowed && candidateMobility.isHybridAccepted) {
        workArrangement = 'hybrid';
        score = 90;
      } else {
        workArrangement = 'on_site';
        score = 85;
      }

      if (distance > 30) {
        recommendations.push(
          "Le temps de trajet peut être significatif. Envisager des arrangements de travail flexibles."
        );
      }
    }

    // Ajuster le score en fonction de la distance
    if (match.matchType === 'exact') {
      score = Math.min(score + 10, 100);
    } else if (match.matchType === 'same_city') {
      score = Math.min(score + 5, 100);
    } else if (match.matchType === 'commutable') {
      score = Math.max(score - (distance / maxCommuteDistance) * 20, 0);
    }

    // Vérifier les préférences de localisation
    if (candidateMobility.preferredLocations && 
        candidateMobility.preferredLocations.length > 0) {
      const isPreferredLocation = candidateMobility.preferredLocations.some(
        loc => loc.city === jobLocation.city
      );
      if (!isPreferredLocation) {
        score = Math.max(score - 10, 0);
        recommendations.push(
          "Le lieu de travail ne fait pas partie des localisations préférées du candidat."
        );
      }
    }

    return {
      match,
      score,
      isViable: score > 0,
      workArrangement,
      recommendations
    };
  }

  public suggestAlternativeArrangements(
    analysis: LocationAnalysis,
    jobRequirements: {
      isRemoteAllowed: boolean;
      isHybridAllowed: boolean;
      requiredOnSiteDays?: number;
    }
  ): string[] {
    const suggestions: string[] = [];

    if (!analysis.isViable) {
      if (jobRequirements.isRemoteAllowed) {
        suggestions.push(
          "Proposer un arrangement de travail entièrement à distance"
        );
      }
      if (jobRequirements.isHybridAllowed) {
        const daysText = jobRequirements.requiredOnSiteDays 
          ? `${jobRequirements.requiredOnSiteDays} jours par semaine`
          : "quelques jours par semaine";
        suggestions.push(
          `Proposer un arrangement hybride avec présence sur site ${daysText}`
        );
      }
      suggestions.push(
        "Discuter des possibilités d'aide à la relocalisation"
      );
    } else if (analysis.match.distance > 30) {
      suggestions.push(
        "Envisager des horaires de travail flexibles pour éviter les heures de pointe"
      );
      if (jobRequirements.isHybridAllowed) {
        suggestions.push(
          "Optimiser le planning des jours de présence sur site"
        );
      }
    }

    return suggestions;
  }
}

export default LocationAnalyzer; 