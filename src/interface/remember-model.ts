export interface RememberModel {
  /**
   * 总计复习次数
   * 第一次创建时不算复习
   */
  rememberedCount: number;

  /**
   * 下一次复习时间
   * undefined 表示第一次添加，还没有复习
   */
  nextRememberedAt: Date;

  /**
   * 上次复习时间
   */
  lastRememberedAt?: Date;

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
   * 当前思考时间
   * 单位毫秒
   * 0=不喜欢或者太熟悉
   */
  currThinkingTime: number;

  /**
   * 总计思考时间
   * 单位毫秒
   */
  thinkingTime: number;

  /**
   * 难度度
   * (FSRS算法)
   */
  fsrsDifficulty?: number;

  /**
   * 稳定值
   * (FSRS算法)
   */
  fsrsStability?: number;

  /**
   * 被遗忘或错误记忆的次数
   * (FSRS算法)
   */
  fsrsLapses?: number;

  /**
   * 当前的(重新)学习步骤
   * (FSRS算法)
   */
  fsrsLearningSteps?: number;

  /**
   * 当前状态（新卡片、学习中、复习中、重新学习中）
   * (FSRS算法)
   */
  fsrsState?: number;

  /**
   * ease factor
   *  (SM2算法)
   */
  sm2Efactor?: number;

  /**
   * 连续成功答对次数
   *  (SM2算法)
   */
  sm2SuccessRememberedCount?: number;

  /**
   * 第一次接触这个单词的时间
   * 当时没有复习
   */
  createdAt: Date;
}
