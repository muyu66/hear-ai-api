import { RememberModel } from '../src/interface/remember-model';
import { ARSSAlgorithmService } from '../src/tool/algorithm/arss.algorithm';

describe('ARSSAlgorithmService', () => {
  let service: ARSSAlgorithmService;

  beforeEach(() => {
    service = new ARSSAlgorithmService();
  });

  describe('mapHintCountToQuality', () => {
    it('should map hint counts to correct quality scores', () => {
      expect(service.mapHintCountToQuality(0)).toBe(1.0);
      expect(service.mapHintCountToQuality(1)).toBe(0.8);
      expect(service.mapHintCountToQuality(2)).toBe(0.6);
      expect(service.mapHintCountToQuality(3)).toBe(0.3);
      expect(service.mapHintCountToQuality(5)).toBe(0.3);
    });
  });

  describe('mapHintCountToRating', () => {
    it('should map hint counts to correct rating', () => {
      expect(service.mapHintCountToRating(0)).toBe(3);
      expect(service.mapHintCountToRating(1)).toBe(2);
      expect(service.mapHintCountToRating(2)).toBe(1);
      expect(service.mapHintCountToRating(3)).toBe(0);
      expect(service.mapHintCountToRating(5)).toBe(0);
    });
  });

  describe('updateStability', () => {
    it('should correctly update stability based on R and rating', () => {
      const S = 2;
      const R = 0.8;
      const rating = 3;
      const updated = service.updateStability(S, R, rating);
      expect(updated).toBeCloseTo(S * (1 + 1.5 * (1 - R)));
    });
  });

  describe('handle', () => {
    it('should throw error for invalid targetRetention', () => {
      const model: RememberModel = {
        currHintCount: 0,
        repetitionZeroHintCount: 0,
        rememberedAt: new Date(),
        createdAt: new Date(),
        rememberedCount: 0,
        lastRememberedAt: new Date(),
        hintCount: 0,
        easeFactor: 2.5,
      };
      expect(() => service.handle(model, 0, 2)).toThrow();
      expect(() => service.handle(model, 1, 2)).toThrow();
    });

    it('should adjust rememberedAt correctly', () => {
      const now = new Date();
      const model: RememberModel = {
        currHintCount: 0,
        repetitionZeroHintCount: 0,
        rememberedAt: now,
        createdAt: now,
        rememberedCount: 0,
        lastRememberedAt: now,
        hintCount: 0,
        easeFactor: 2.5,
      };

      const result = service.handle(model, 0.9, 2);
      expect(result).not.toBeNull();
      expect(result!.rememberedAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should apply confidence bonus', () => {
      const now = new Date();
      const model: RememberModel = {
        currHintCount: 0,
        repetitionZeroHintCount: 5, // max bonus 0.3
        rememberedAt: now,
        createdAt: now,
        rememberedCount: 0,
        lastRememberedAt: now,
        hintCount: 0,
        easeFactor: 2.5,
      };

      const result = service.handle(model, 0.9, 2)!;
      const intervalDays =
        (result.rememberedAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(intervalDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe('estimateCurrentStability', () => {
    it('should return initial stability for empty history', () => {
      expect(service.train([])).toBe(1.0);
      expect(service.train([], 2)).toBe(2);
    });

    it('should estimate stability based on history', () => {
      const now = new Date();
      const history: RememberModel[] = [
        {
          currHintCount: 0,
          repetitionZeroHintCount: 0,
          createdAt: now,
          rememberedAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
          rememberedCount: 0,
          lastRememberedAt: now,
          hintCount: 0,
          easeFactor: 2.5,
        },
        {
          currHintCount: 1,
          repetitionZeroHintCount: 0,
          createdAt: now,
          rememberedAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          rememberedCount: 0,
          lastRememberedAt: now,
          hintCount: 0,
          easeFactor: 2.5,
        },
      ];

      const S = service.train(history, 1);
      expect(S).toBeGreaterThan(0);
    });
  });
});
