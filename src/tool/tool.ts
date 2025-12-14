import crypto, { randomInt } from 'crypto';

export function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function newRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
export function randomNonce(len = 48): string {
  return crypto.randomBytes(len).toString('base64url');
}

export function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

export function randomAB<T>(a: T, b: T, value: number) {
  return randomInt(1, 101) <= value ? b : a;
}

/**
 * 计算用户活跃度等级
 * @param logins 用户登录记录
 * @returns 活跃度等级
 */
export function calculateActiveLevel(logins: Date[]): number {
  if (!logins || logins.length === 0) return 0;

  const sorted = logins.slice().sort((a, b) => a.getTime() - b.getTime());
  const count = sorted.length;

  // 1️⃣ 计算平均间隔（小时）
  let avgIntervalHours = 0;
  if (count > 1) {
    let sum = 0;
    for (let i = 1; i < count; i++) {
      sum += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60);
    }
    avgIntervalHours = sum / (count - 1);
  } else {
    avgIntervalHours = 24 * 7; // 仅一次登录
  }

  // 2️⃣ 按区间线性映射分数
  const thresholds = [6, 24, 48, 72, 168, 24 * 14]; // 小时
  const scores = [100, 85, 70, 55, 40, 20, 0];

  let intervalScore = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (avgIntervalHours <= thresholds[i]) {
      const upper = scores[i];
      const lower = i > 0 ? scores[i - 1] : 100;
      const tLower = i > 0 ? thresholds[i - 1] : 0;
      intervalScore =
        lower +
        ((upper - lower) * (avgIntervalHours - tLower)) /
          (thresholds[i] - tLower);
      break;
    }
    if (i === thresholds.length - 1) {
      intervalScore = 0;
    }
  }

  // 3️⃣ 最近活跃加权（线性衰减）
  const now = Date.now();
  let recencyScore = 0;
  const decay = 0.9;
  let weight = 1;
  for (let i = count - 1; i >= 0; i--) {
    const hoursAgo = (now - sorted[i].getTime()) / (1000 * 60 * 60);
    const score = Math.max(0, 1 - hoursAgo / 168); // 一周内活跃贡献大
    recencyScore += score * weight;
    weight *= decay;
  }
  recencyScore = (recencyScore / count) * 100; // 转 0~100

  // 4️⃣ 权重组合
  const w1 = 0.7,
    w2 = 0.3;
  const finalScore = w1 * intervalScore + w2 * recencyScore;

  return Math.round(Math.min(100, Math.max(0, finalScore)));
}

function buildSimilarityFreqMap(words: string[]) {
  const map = new Map<string, number>();
  for (const w of words) {
    map.set(w, (map.get(w) ?? 0) + 1);
  }
  return map;
}

function calcSimilarityHitInfo(sentenceTokens: string[], myWords: string[]) {
  const sentenceMap = buildSimilarityFreqMap(sentenceTokens);

  let hitCount = 0;
  let weightedFreq = 0;

  for (const w of myWords) {
    const freq = sentenceMap.get(w);
    if (freq) {
      hitCount++;
      weightedFreq += Math.min(freq, 2);
    }
  }

  return { hitCount, weightedFreq };
}

export function calcSimilarityScore(words: string[], myWords: string[]) {
  const { hitCount, weightedFreq } = calcSimilarityHitInfo(words, myWords);

  if (hitCount === 0) return 0;

  const hitRatio = hitCount / myWords.length;
  const density = hitCount / words.length;
  const freqScore = weightedFreq / myWords.length;

  const score = 0.5 * hitRatio + 0.3 * density + 0.2 * freqScore;

  return Number(score.toFixed(4));
}

export function isEnglishWord(word: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(word);
}
