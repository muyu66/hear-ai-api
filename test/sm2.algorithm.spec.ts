import { Test, TestingModule } from '@nestjs/testing';
import dayjs from 'dayjs';
import { RememberModel } from '../src/interface/remember-model';
import { SM2AlgorithmService } from '../src/tool/algorithm/sm2.algorithm';

describe('SM2AlgorithmService (with currHintCount semantics)', () => {
  let service: SM2AlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SM2AlgorithmService],
    }).compile();

    service = module.get<SM2AlgorithmService>(SM2AlgorithmService);
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

  describe('Successful recall (currHintCount < 3)', () => {
    it('should set interval=1 on first success (repetition=1)', () => {
      const model = createBaseModel({ currHintCount: 0 });
      const result = service.handle(model);

      expect(result!.repetitionZeroHintCount).toBe(1);
      expect(dayjs(result!.rememberedAt).diff(model.rememberedAt, 'day')).toBe(
        1,
      );
    });

    it('should set interval=6 on second success (repetition=2)', () => {
      const model = createBaseModel({
        currHintCount: 1,
        repetitionZeroHintCount: 1,
        rememberedAt: new Date('2024-06-02'), // after first review
      });
      const result = service.handle(model);

      expect(result!.repetitionZeroHintCount).toBe(2);
      expect(dayjs(result!.rememberedAt).diff(model.rememberedAt, 'day')).toBe(
        6,
      );
    });

    it('should use interval = lastInterval * EF on third+ success', () => {
      // Simulate: last review was 6 days ago (interval=6)
      const model = createBaseModel({
        currHintCount: 0,
        repetitionZeroHintCount: 2,
        lastRememberedAt: new Date('2024-06-01'),
        rememberedAt: new Date('2024-06-07'), // 6 days later
        easeFactor: 2.0,
      });

      const result = service.handle(model);
      const expectedInterval = Math.round(6 * 2.0); // 12 days
      const expectedNextReview = dayjs(model.rememberedAt)
        .add(expectedInterval, 'day')
        .toDate();

      expect(result!.rememberedAt.getTime()).toBe(expectedNextReview.getTime());
      expect(result!.repetitionZeroHintCount).toBe(3);
    });

    it('should increase EF when currHintCount=0', () => {
      const model = createBaseModel({ currHintCount: 0, easeFactor: 2.5 });
      const result = service.handle(model);
      // ΔEF = 0.1 - 0*(...) = +0.1 → 2.6
      expect(result!.easeFactor).toBeCloseTo(2.6, 2);
    });

    it('should keep EF unchanged when currHintCount=1', () => {
      const model = createBaseModel({ currHintCount: 1, easeFactor: 2.5 });
      const result = service.handle(model);
      // ΔEF = 0.1 - 1*(0.08+0.02) = 0
      expect(result!.easeFactor).toBeCloseTo(2.5, 2);
    });

    it('should decrease EF when currHintCount=2', () => {
      const model = createBaseModel({ currHintCount: 2, easeFactor: 2.5 });
      const result = service.handle(model);
      // ΔEF = 0.1 - 2*(0.08 + 0.04) = 0.1 - 0.24 = -0.14 → 2.36
      expect(result!.easeFactor).toBeCloseTo(2.36, 2);
    });

    it('should clamp EF to minimum 1.3', () => {
      const model = createBaseModel({ currHintCount: 5, easeFactor: 1.3 });
      const result = service.handle(model);
      // ΔEF = 0.1 - 5*(0.08+0.10) = 0.1 - 0.9 = -0.8 → 1.3 - 0.8 = 0.5 → clamped to 1.3
      expect(result!.easeFactor).toBe(1.3);
    });
  });

  describe('Failed recall (currHintCount >= 3)', () => {
    it('should reset repetitionZeroHintCount to 0', () => {
      const model = createBaseModel({
        currHintCount: 3,
        repetitionZeroHintCount: 2,
      });
      const result = service.handle(model);
      expect(result!.repetitionZeroHintCount).toBe(0);
    });

    it('should schedule next review in 1 day', () => {
      const model = createBaseModel({ currHintCount: 4 });
      const result = service.handle(model);
      expect(dayjs(result!.rememberedAt).diff(model.rememberedAt, 'day')).toBe(
        1,
      );
    });

    it('should NOT update easeFactor on failure', () => {
      const originalEF = 2.5;
      const model = createBaseModel({
        currHintCount: 5,
        easeFactor: originalEF,
      });
      const result = service.handle(model);
      expect(result!.easeFactor).toBe(originalEF); // unchanged
    });
  });
});

describe('SM2AlgorithmService', () => {
  let service: SM2AlgorithmService;

  beforeEach(() => {
    service = new SM2AlgorithmService();
  });

  it('should handle review failure (currHintCount >= 3)', () => {
    const now = new Date();
    const model: RememberModel = {
      rememberedCount: 1,
      rememberedAt: now,
      lastRememberedAt: now,
      currHintCount: 3,
      hintCount: 3,
      repetitionZeroHintCount: 2,
      easeFactor: 2.5,
      createdAt: now,
    };

    const updated = service.handle(model);
    expect(updated!.repetitionZeroHintCount).toBe(0);
    expect(dayjs(updated!.rememberedAt).diff(now, 'day')).toBe(1);
    expect(updated!.easeFactor).toBe(2.5); // EF 不变
  });

  it('should handle first successful review (repetitionZeroHintCount = 0 -> 1)', () => {
    const now = new Date();
    const model: RememberModel = {
      rememberedCount: 1,
      rememberedAt: now,
      lastRememberedAt: now,
      currHintCount: 1,
      hintCount: 1,
      repetitionZeroHintCount: 0,
      easeFactor: 2.5,
      createdAt: now,
    };

    const updated = service.handle(model);
    expect(updated!.repetitionZeroHintCount).toBe(1);
    expect(dayjs(updated!.rememberedAt).diff(now, 'day')).toBe(1);

    // EF 应该更新
    expect(updated!.easeFactor).toBeGreaterThan(1.3);
  });

  it('should handle second successful review (repetitionZeroHintCount = 2)', () => {
    const now = new Date();
    const model: RememberModel = {
      rememberedCount: 1,
      rememberedAt: now,
      lastRememberedAt: now,
      currHintCount: 1,
      hintCount: 1,
      repetitionZeroHintCount: 1,
      easeFactor: 2.5,
      createdAt: now,
    };

    const updated = service.handle(model);
    expect(updated!.repetitionZeroHintCount).toBe(2);
    expect(dayjs(updated!.rememberedAt).diff(now, 'day')).toBe(6);

    // EF 更新
    expect(updated!.easeFactor).toBeGreaterThan(1.3);
  });

  it('should handle subsequent successful review (repetitionZeroHintCount > 2)', () => {
    const now = new Date();
    const lastReview = dayjs(now).subtract(5, 'day').toDate();
    const model: RememberModel = {
      rememberedCount: 1,
      rememberedAt: now,
      lastRememberedAt: lastReview,
      currHintCount: 2,
      hintCount: 2,
      repetitionZeroHintCount: 3,
      easeFactor: 2.5,
      createdAt: now,
    };

    const updated = service.handle(model);
    expect(updated!.repetitionZeroHintCount).toBe(4);

    // interval = (now - lastRememberedAt) * EF
    const expectedInterval = Math.round(
      dayjs(now).diff(lastReview, 'day') * 2.5,
    );
    const actualInterval = dayjs(updated!.rememberedAt).diff(now, 'day');
    expect(actualInterval).toBe(expectedInterval);

    expect(updated!.easeFactor).toBeGreaterThan(1.3);
  });

  it('should cap EF to minimum 1.3', () => {
    const now = new Date();
    const model: RememberModel = {
      rememberedCount: 1,
      rememberedAt: now,
      lastRememberedAt: now,
      currHintCount: 5,
      hintCount: 5,
      repetitionZeroHintCount: 0,
      easeFactor: 1.3,
      createdAt: now,
    };

    const updated = service.handle(model);
    expect(updated!.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
