import { 
  users, 
  cafes, 
  userInteractions, 
  userSavedCafes,
  type User, 
  type InsertUser,
  type Cafe,
  type InsertCafe,
  type UserInteraction,
  type InsertUserInteraction,
  type UserSavedCafe,
  type InsertUserSavedCafe
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserQuiz(id: number, quizResponses: any): Promise<User>;

  // Cafe operations
  getAllCafes(): Promise<Cafe[]>;
  getCafe(id: number): Promise<Cafe | undefined>;
  getCafesNearLocation(lat: number, lng: number, radiusKm: number): Promise<Cafe[]>;
  createCafe(insertCafe: InsertCafe): Promise<Cafe>;

  // User interactions
  saveUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteractions(userId: number): Promise<UserInteraction[]>;

  // Saved cafes
  saveCafe(userId: number, cafeId: number): Promise<UserSavedCafe>;
  unsaveCafe(userId: number, cafeId: number): Promise<void>;
  getUserSavedCafes(userId: number): Promise<Cafe[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserQuiz(id: number, quizResponses: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ quizResponses })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllCafes(): Promise<Cafe[]> {
    return await db.select().from(cafes);
  }

  async getCafe(id: number): Promise<Cafe | undefined> {
    const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id));
    return cafe || undefined;
  }

  async getCafesNearLocation(lat: number, lng: number, radiusKm: number): Promise<Cafe[]> {
    // Simple distance calculation using Haversine formula
    return await db
      .select()
      .from(cafes)
      .where(
        sql`(
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(${cafes.latitude})) * 
            cos(radians(${cafes.longitude}) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(${cafes.latitude}))
          )
        ) <= ${radiusKm}`
      );
  }

  async createCafe(insertCafe: InsertCafe): Promise<Cafe> {
    const [cafe] = await db
      .insert(cafes)
      .values(insertCafe)
      .returning();
    return cafe;
  }

  async saveUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    const [savedInteraction] = await db
      .insert(userInteractions)
      .values(interaction)
      .returning();
    return savedInteraction;
  }

  async getUserInteractions(userId: number): Promise<UserInteraction[]> {
    return await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .orderBy(desc(userInteractions.timestamp));
  }

  async saveCafe(userId: number, cafeId: number): Promise<UserSavedCafe> {
    const [savedCafe] = await db
      .insert(userSavedCafes)
      .values({ userId, cafeId })
      .returning();
    return savedCafe;
  }

  async unsaveCafe(userId: number, cafeId: number): Promise<void> {
    await db
      .delete(userSavedCafes)
      .where(
        and(
          eq(userSavedCafes.userId, userId),
          eq(userSavedCafes.cafeId, cafeId)
        )
      );
  }

  async getUserSavedCafes(userId: number): Promise<Cafe[]> {
    const result = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        address: cafes.address,
        latitude: cafes.latitude,
        longitude: cafes.longitude,
        photos: cafes.photos,
        budgetRange: cafes.budgetRange,
        cuisineTags: cafes.cuisineTags,
        ambience: cafes.ambience,
        noiseLevel: cafes.noiseLevel,
        lighting: cafes.lighting,
        seatingStyle: cafes.seatingStyle,
        musicStyle: cafes.musicStyle,
        busyLevel: cafes.busyLevel,
        plugPoints: cafes.plugPoints,
        petFriendly: cafes.petFriendly,
        instaWorthiness: cafes.instaWorthiness,
        workFriendly: cafes.workFriendly,
        wifiQuality: cafes.wifiQuality,
        createdAt: cafes.createdAt,
      })
      .from(userSavedCafes)
      .innerJoin(cafes, eq(userSavedCafes.cafeId, cafes.id))
      .where(eq(userSavedCafes.userId, userId));

    return result;
  }
}

export const storage = new DatabaseStorage();