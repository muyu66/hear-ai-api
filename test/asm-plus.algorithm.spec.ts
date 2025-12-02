import { Test, TestingModule } from '@nestjs/testing';
import { RememberModel } from '../src/interface/remember-model';
import { ASMPlusAlgorithmService } from '../src/tool/algorithm/asm-plus.algorithm';
import dayjs from 'dayjs';

describe('ASMPlusAlgorithmService (ASM+ Algorithm)', () => {
  let service: ASMPlusAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ASMPlusAlgorithmService],
    }).compile();

    service = module.get<ASMPlusAlgorithmService>(ASMPlusAlgorithmService);
  });

  const createBaseModel = (
    overrides: Partial<RememberModel> = {},
  ): RememberModel => {
    const now = new Date('2024-06-01T10:00:00Z');
    return {
      rememberedCount: 0,
      rememberedAt: now,
      lastRememberedAt: dayjs(now).subtract(1, 'day').toDate(),
      currHintCount: 0,
      hintCount: 0,
      repetitionZeroHintCount: 0,
      easeFactor: 2.5,
      createdAt: now,
      ...overrides,
    };
  };

  describe('First-time learning (rememberedCount === 0 → 1)', () => {
    it('should set initial interval=2 days for perfect recall (currHintCount=0)', () => {
      const original = createBaseModel({
        currHintCount: 0,
        rememberedCount: 0,
      });
      const result = service.handle(original);

      expect(result!.rememberedCount).toBe(1);
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(2);
      expect(result!.easeFactor).toBeCloseTo(2.6, 2); // +0.1
    });

    it('should set initial interval=1 day for borderline success (currHintCount=2)', () => {
      const original = createBaseModel({
        currHintCount: 2,
        rememberedCount: 0,
      });
      const result = service.handle(original);

      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(1);
      expect(result!.easeFactor).toBeCloseTo(2.4, 2); // -0.1
    });
  });

  describe('Recovery after failure (repetitionZeroHintCount was 0)', () => {
    it('should schedule 1 day later on first success after failure', () => {
      const original = createBaseModel({
        currHintCount: 1,
        rememberedCount: 3,
        repetitionZeroHintCount: 0, // just failed
        rememberedAt: new Date('2024-06-05'),
      });
      const result = service.handle(original);

      expect(result!.repetitionZeroHintCount).toBe(1);
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(1);
    });
  });

  describe('Second consecutive success', () => {
    it('should schedule 7 days later for perfect recall (quality=0)', () => {
      const original = createBaseModel({
        currHintCount: 0,
        rememberedCount: 2,
        repetitionZeroHintCount: 1,
        rememberedAt: new Date('2024-06-03'),
      });
      const result = service.handle(original);

      expect(result!.repetitionZeroHintCount).toBe(2);
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(7); // 5 + (2-0)
    });

    it('should schedule 5 days later for quality=2', () => {
      const original = createBaseModel({
        currHintCount: 2,
        rememberedCount: 2,
        repetitionZeroHintCount: 1,
        rememberedAt: new Date('2024-06-03'),
      });
      const result = service.handle(original);

      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(5); // 5 + (2-2)
    });
  });

  describe('Long-term memory phase (repetitionZeroHintCount >= 2)', () => {
    it('should compute interval using baseInterval * adjustedEF with stability factor', () => {
      // Previous interval was 7 days (from day 1 to day 8)
      const original: RememberModel = {
        rememberedCount: 3,
        lastRememberedAt: new Date('2024-06-01'),
        rememberedAt: new Date('2024-06-08'), // 7 days later
        currHintCount: 0,
        hintCount: 0, // avgHintRate = 0
        repetitionZeroHintCount: 2,
        easeFactor: 2.5,
        createdAt: new Date('2024-06-01'),
      };

      const result = service.handle(original);

      const baseInterval = 7;
      const stabilityFactor = 1.0 - 0.1 * 0; // 1.0
      const adjustedEF = 2.5 * stabilityFactor;
      const expectedInterval = Math.round(baseInterval * adjustedEF); // 18

      expect(result!.repetitionZeroHintCount).toBe(3);
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(expectedInterval);
      expect(result!.easeFactor).toBeCloseTo(2.6, 2);
    });

    it('should reduce interval growth when average hint rate is high', () => {
      // BEFORE review:
      // - Already reviewed 3 times
      // - Total hints used: 5
      // - This time: currHintCount = 1
      const original: RememberModel = {
        rememberedCount: 3, // ← 已复习3次
        lastRememberedAt: new Date('2024-06-01'),
        rememberedAt: new Date('2024-06-08'), // 7 days after last
        currHintCount: 1, // 本次用了1次提示
        hintCount: 5, // 前3次共用了5次提示
        repetitionZeroHintCount: 2,
        easeFactor: 2.5,
        createdAt: new Date('2024-06-01'),
      };

      const result = service.handle(original);

      // AFTER review:
      // rememberedCount = 3 + 1 = 4
      // hintCount = 5 + 1 = 6
      // avgHintRate = 6 / 4 = 1.5
      const expectedRememberedCount = 4;
      const expectedHintCount = 6;
      const avgHintRate = expectedHintCount / expectedRememberedCount; // 1.5

      const baseInterval = 7; // from 2024-06-01 to 2024-06-08
      const stabilityFactor = 1.0 - 0.1 * avgHintRate; // 1 - 0.15 = 0.85
      const adjustedEF = 2.5 * stabilityFactor; // 2.125
      const expectedInterval = Math.round(baseInterval * adjustedEF); // 7 * 2.125 = 14.875 → 15

      expect(result!.rememberedCount).toBe(expectedRememberedCount);
      expect(result!.hintCount).toBe(expectedHintCount);
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(expectedInterval);
      expect(result!.easeFactor).toBeCloseTo(2.5, 2); // quality=1 → ΔEF = 0
    });
  });

  describe('Failure handling (currHintCount >= 3)', () => {
    it('should soft-reset repetitionZeroHintCount (minus 2, not zero)', () => {
      const original = createBaseModel({
        currHintCount: 4,
        rememberedCount: 5,
        repetitionZeroHintCount: 5, // was doing great
      });
      const result = service.handle(original);

      expect(result!.repetitionZeroHintCount).toBe(3); // 5 - 2
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(1);
      expect(result!.easeFactor).toBeCloseTo(2.5 - 0.15, 2); // 2.35
    });

    it('should not go below 0 on soft reset', () => {
      const original = createBaseModel({
        currHintCount: 3,
        repetitionZeroHintCount: 1,
      });
      const result = service.handle(original);

      expect(result!.repetitionZeroHintCount).toBe(0); // max(0, 1-2)
    });
  });

  describe('EF clamping and update logic', () => {
    it('should clamp EF to minimum 1.3', () => {
      const original = createBaseModel({
        currHintCount: 5,
        easeFactor: 1.3,
        rememberedCount: 10,
        repetitionZeroHintCount: 3,
      });
      const result = service.handle(original);

      // ΔEF = 0.1 - 0.1*5 = -0.4 → 1.3 - 0.4 = 0.9 → clamped to 1.3
      expect(result!.easeFactor).toBe(1.3);
    });

    it('should apply linear EF delta: quality=0 → +0.1, quality=2 → -0.1', () => {
      let model = createBaseModel({ currHintCount: 0, easeFactor: 2.0 });
      let result = service.handle(model);
      expect(result!.easeFactor).toBeCloseTo(2.1, 2);

      model = createBaseModel({ currHintCount: 2, easeFactor: 2.0 });
      result = service.handle(model);
      expect(result!.easeFactor).toBeCloseTo(1.9, 2);
    });
  });

  describe('Edge cases', () => {
    it('should cap maximum interval to 365 days', () => {
      const original: RememberModel = {
        rememberedCount: 10,
        lastRememberedAt: new Date('2023-01-01'),
        rememberedAt: new Date('2024-01-01'), // 366 days ago!
        currHintCount: 0,
        hintCount: 0,
        repetitionZeroHintCount: 5,
        easeFactor: 3.0,
        createdAt: new Date('2023-01-01'),
      };

      const result = service.handle(original);

      // baseInterval = 366, adjustedEF ≈ 3.0 → interval ≈ 1098 → capped to 365
      expect(
        dayjs(result!.rememberedAt).diff(original.rememberedAt, 'day'),
      ).toBe(365);
    });
  });
});
