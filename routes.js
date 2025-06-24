import express from 'express';
import { storage } from './storage';
import { insertUserSchema, insertCafeSchema, insertUserInteractionSchema } from '../shared/schema';
import { createRecommendationEngine } from './recommendations';
import { z } from 'zod';

const recommendationEngine = createRecommendationEngine();

const router = express.Router();

// User routes
router.post('/api/users', async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);
    
    // Add user to recommendation engine
    await recommendationEngine.addUser(user);
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

router.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/api/users/:id/quiz', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await storage.updateUserQuiz(id, req.body);
    
    // Update user in recommendation engine with quiz data
    await recommendationEngine.addUser(user);
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quiz responses' });
  }
});

// Cafe routes
router.get('/api/cafes', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    if (lat && lng && radius) {
      const cafes = await storage.getCafesNearLocation(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );
      res.json(cafes);
    } else {
      const cafes = await storage.getAllCafes();
      res.json(cafes);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cafes' });
  }
});

router.get('/api/cafes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cafe = await storage.getCafe(id);
    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }
    res.json(cafe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cafe' });
  }
});

router.post('/api/cafes', async (req, res) => {
  try {
    const cafeData = insertCafeSchema.parse(req.body);
    const cafe = await storage.createCafe(cafeData);
    
    // Add cafe to recommendation engine
    await recommendationEngine.addCafe(cafe);
    
    res.json(cafe);
  } catch (error) {
    res.status(400).json({ error: 'Invalid cafe data' });
  }
});

// User interaction routes
router.post('/api/interactions', async (req, res) => {
  try {
    const interactionData = insertUserInteractionSchema.parse(req.body);
    const interaction = await storage.saveUserInteraction(interactionData);
    
    // Add interaction to recommendation engine for learning
    await recommendationEngine.addInteraction(interaction);
    
    res.json(interaction);
  } catch (error) {
    res.status(400).json({ error: 'Invalid interaction data' });
  }
});

router.get('/api/users/:id/interactions', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const interactions = await storage.getUserInteractions(userId);
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// Saved cafes routes
router.post('/api/users/:userId/saved-cafes/:cafeId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const cafeId = parseInt(req.params.cafeId);
    const savedCafe = await storage.saveCafe(userId, cafeId);
    res.json(savedCafe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save cafe' });
  }
});

router.delete('/api/users/:userId/saved-cafes/:cafeId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const cafeId = parseInt(req.params.cafeId);
    await storage.unsaveCafe(userId, cafeId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsave cafe' });
  }
});

router.get('/api/users/:id/saved-cafes', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const savedCafes = await storage.getUserSavedCafes(userId);
    res.json(savedCafes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved cafes' });
  }
});

// Personalized recommendations endpoint
router.get('/api/users/:id/recommendations', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const count = parseInt(req.query.count as string) || 10;
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get AI recommendations
    let recommendedCafeIds = await recommendationEngine.getRecommendations(userId, count);

    // If no AI recommendations, use fallback
    if (recommendedCafeIds.length === 0 && user.quizResponses) {
      const allCafes = await storage.getAllCafes();
      recommendedCafeIds = recommendationEngine.getFallbackRecommendations(
        user.quizResponses,
        allCafes
      );
    }

    // Get full cafe details
    const recommendedCafes = [];
    for (const cafeId of recommendedCafeIds) {
      const cafe = await storage.getCafe(cafeId);
      if (cafe) recommendedCafes.push(cafe);
    }

    res.json(recommendedCafes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Initialize recommendation engine on startup
(async () => {
  try {
    await recommendationEngine.initialize();
    
    // Sync existing data with recommendation engine
    const allCafes = await storage.getAllCafes();
    for (const cafe of allCafes) {
      await recommendationEngine.addCafe(cafe);
    }
    
    console.log('Recommendation engine ready with', allCafes.length, 'cafes');
  } catch (error) {
    console.error('Failed to initialize recommendation engine:', error);
  }
})();

export default router;
