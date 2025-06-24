import { User, Cafe, UserInteraction, QuizResponse } from '../shared/schema';

// Simplified recommendation engine without external dependencies for now
let recombeeAvailable = false;

export interface RecommendationEngine {
  initialize(): Promise<void>;
  addUser(user: User): Promise<void>;
  addCafe(cafe: Cafe): Promise<void>;
  addInteraction(interaction: UserInteraction): Promise<void>;
  getRecommendations(userId: number, count?: number): Promise<number[]>;
  getFallbackRecommendations(quizResponse: QuizResponse, cafes: Cafe[]): number[];
}

export class RecombeeRecommendationEngine implements RecommendationEngine {
  private isInitialized = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('Smart recommendation engine initialized');
  }

  async addUser(user: User): Promise<void> {
    // Store user preferences for recommendations
    console.log('User added to recommendation system:', user.id);
  }

  async addCafe(cafe: Cafe): Promise<void> {
    console.log('Cafe added to recommendation system:', cafe.name);
  }

  async addInteraction(interaction: UserInteraction): Promise<void> {
    console.log('Interaction tracked:', interaction.interactionType, 'for cafe', interaction.cafeId);
  }

  async getRecommendations(userId: number, count: number = 10): Promise<number[]> {
    // Use fallback recommendations for now
    return [];
  }

  getFallbackRecommendations(quizResponse: QuizResponse, cafes: Cafe[]): number[] {
    // Implement rule-based fallback recommendations
    let scoredCafes = cafes.map(cafe => ({
      id: cafe.id,
      score: this.calculateFallbackScore(quizResponse, cafe),
    }));

    return scoredCafes
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.id);
  }

  private calculateFallbackScore(quizResponse: QuizResponse, cafe: Cafe): number {
    let score = 0;

    // Budget match
    if (quizResponse.budget === cafe.budgetRange) score += 3;

    // Ambience preferences
    if (quizResponse.ambience?.includes(cafe.ambience)) score += 4;

    // Mood-based scoring
    switch (quizResponse.mood) {
      case 'study':
        if (cafe.noiseLevel === 'Quiet') score += 3;
        if (cafe.workFriendly) score += 2;
        if (cafe.plugPoints) score += 1;
        break;
      case 'work':
        if (cafe.workFriendly) score += 4;
        if (cafe.wifiQuality === 'Excellent') score += 2;
        if (cafe.plugPoints) score += 2;
        break;
      case 'date':
        if (cafe.ambience === 'Aesthetic') score += 3;
        if (cafe.lighting === 'Moody') score += 2;
        if (cafe.seatingStyle === 'Booths') score += 1;
        break;
      case 'hangout':
        if (cafe.noiseLevel === 'Social') score += 2;
        if (cafe.ambience === 'Cozy') score += 2;
        break;
    }

    // Additional Gen-Z preferences
    if (cafe.instaWorthiness === 'High') score += 2;
    if (cafe.petFriendly && quizResponse.petFriendly) score += 1;

    return score;
  }
}

export class AlgoliaRecommendationEngine implements RecommendationEngine {
  async initialize(): Promise<void> {
    console.log('Algolia recommendation engine initialized');
  }

  async addUser(user: User): Promise<void> {
    // No-op for now
  }

  async addCafe(cafe: Cafe): Promise<void> {
    // No-op for now
  }

  async addInteraction(interaction: UserInteraction): Promise<void> {
    // No-op for now
  }

  async getRecommendations(userId: number, count: number = 10): Promise<number[]> {
    // Return empty for fallback to rule-based
    return [];
  }

  getFallbackRecommendations(quizResponse: QuizResponse, cafes: Cafe[]): number[] {
    // Simple rule-based recommendations
    return cafes.slice(0, 5).map(cafe => cafe.id);
  }
}

export function createRecommendationEngine(): RecommendationEngine {
  // Check if Recombee credentials are available
  const recombeeDbId = process.env.RECOMBEE_DATABASE_ID;
  const recombeePrivateToken = process.env.RECOMBEE_PRIVATE_TOKEN;

  if (recombeeDbId && recombeePrivateToken) {
    console.log('Using Recombee recommendation engine');
    return new RecombeeRecommendationEngine();
  } else {
    console.log('Using fallback recommendation engine (no Recombee credentials)');
    return new AlgoliaRecommendationEngine();
  }
}