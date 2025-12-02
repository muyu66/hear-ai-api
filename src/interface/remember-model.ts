export interface RememberModel {
  /**
   * 总计复习次数
   */
  rememberedCount: number;

  /**
   * 当前/计划复习时间
   */
  rememberedAt: Date;

  /**
   * 上次复习时间
   */
  lastRememberedAt: Date;

  /**
   * 最近一次提示次数
   * 0表示无提示，每提示一次数字+1
   */
  currHintCount: number;

  /**
   * 总计提示次数
   */
  hintCount: number;

  /**
   * 连续的零提示次数
   */
  repetitionZeroHintCount: number;

  /**
   * 难度因子
   */
  easeFactor: number;

  /**
   * 第一次记忆时间
   */
  createdAt: Date;
}
