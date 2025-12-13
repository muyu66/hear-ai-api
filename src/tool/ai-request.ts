import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { ConfigService } from 'src/service/config.service';

const promptDictMaker = (words: string[], lang: Lang) => {
  let phonetic = '';
  switch (lang) {
    case Lang.EN:
      phonetic = '英文发音（数组形式，美式在前，英式在后）';
      break;
    case Lang.ZH_CN:
      phonetic = '汉语拼音（数组形式）';
      break;
    case Lang.JA:
      phonetic =
        '日语发音（数组形式，罗马拼音在第一个，片假名在第二个，平假名在第三个）';
      break;
    default:
      throw new Error('Invalid lang');
  }

  return `你是一个英汉日词典助手。给定一个单词列表 (${words.join(' , ')})，返回一个 JSON 数组。  
对每个单词，提供如下信息：
{
  "word": 单词,
  "phonetic": "${phonetic}",
  "enTranslation": 简明英文释义,
  "zhCnTranslation": 简体中文释义，按词性分组，每个词性内用逗号分隔，不重复，不同词性之间换行 \n，不包括例句或领域说明,
  "jaTranslation": 日文释义，规则同中文
}
注意事项：
1. 输出内容严格为 JSON 数组，不要包含其他文字说明。
2. 每个字段都必须填写，不可缺失。
3. 中文、日文释义按词性合并，不重复，不提供例句和领域备注。
4. phonetic 字段罗马拼音部分必须按照音节分开，片假名保持原样。
5. 中文、英文、日文释义均必须使用英文词性缩写（n, v, adj, adv, pron, prep, conj, interj, misc）。
6. 不允许使用 <br>、/n 或其他符号。
7. phonetic 必须是 JSON 数组，数组内每个元素必须是字符串，用双引号包裹。例如：["snoʊz", "snəʊz"] 不能出现没有引号的符号或裸字符。
  `;
};

type PromptConfigItem = {
  rules: string[];
  temperature: number;
  topP: number;
};

const promptConfig: Record<Lang, Record<WordsLevel, PromptConfigItem>> = {
  [Lang.ZH_CN]: {} as Record<WordsLevel, PromptConfigItem>, // 占位
  [Lang.EN]: {
    [WordsLevel.EASIEST]: {
      rules: [
        '只使用 1–2 个词的短词组或短句',
        '动词尽量用一般现在时，名词和形容词为基础词汇',
        '禁止从句、被动语态、非谓语结构、抽象词',
        '所有词必须来自 CEFR A0 或基础高频词',
        '主题仅限：日常物品、人物称呼、简单动作或天气',
        '句子尽量互不重复，禁止模板化',
      ],
      temperature: 0.8,
      topP: 0.9,
    },
    [WordsLevel.VERY_EASY]: {
      rules: [
        '句子最多 4 个词，只能用一般现在时或一般过去时',
        '结构只能是 SVO 或 be 动词句',
        '禁止从句、并列句（and/but）、被动语态、非谓语（to do / doing / done）、抽象词',
        '所有词必须来自 CEFR A1 高频词',
        '句子需互不相同，尽量避免重复用词',
        '主题仅限：日常行为、人物、物品、简单动作、天气、兴趣',
        '禁止模板化句式或文学化表达',
      ],
      temperature: 0.9,
      topP: 0.9,
    },
    [WordsLevel.EASY]: {
      rules: [
        '句子最多 7 词',
        '允许简单并列句（and/but 连接两个短句）',
        '允许基础 to-do 不定式（如 I went to buy food）',
        '禁止定语从句（who/which/that）、复杂状语从句（although/while/because 等）、复杂被动语态、复杂名词短语',
        '词汇必须来自 CEFR A1–A2 高频词',
        '主题限：日常生活、学校、工作、购物、活动、旅行基础情境',
        '句子互不重复，尽量避免重复词汇，禁止模板化与抽象主题',
      ],
      temperature: 0.9,
      topP: 0.9,
    },
    [WordsLevel.NORMAL]: {
      rules: [
        '句子最多 10 词',
        '可以使用简单定语从句（who/that/which）、常见状语从句（because/when/if/after/before）、一般完成时（have done）、简单被动语态',
        '禁止复杂从句嵌套、虚拟语气、文学化比喻',
        '词汇必须来自 CEFR A1–B1 高频词（前 3000–3500 个）',
        '主题限：兴趣、学习、计划、简单观点、旅行经历、工作情境',
        '句子互不重复，尽量避免重复词汇，禁止模板化',
      ],
      temperature: 1.0,
      topP: 0.9,
    },
    [WordsLevel.HARD]: {
      rules: [
        '句子最多 14 词',
        '可以使用复杂状语从句（although, whereas, as soon as）、虚拟语气（If I were …）、被动语态及情态动词完成时（might have done）、非谓语动词复杂用法（Having done..., To be done）',
        '禁止诗意修辞及学术写作风格，保持自然口语',
        '词汇必须来自 CEFR A1–B2 高频词（前 4500 个）',
        '主题限：观点表达、抽象概念、科技、社会现象、情绪描述等',
        '句子互不重复，尽量避免重复词汇，禁止模板化',
      ],
      temperature: 1.1,
      topP: 0.95,
    },
    [WordsLevel.VERY_HARD]: {
      rules: [
        '句子最多 18 词',
        '允许所有语法结构，包括复杂嵌套、倒装、强调、虚拟、非谓语链式结构',
        '允许文学化、哲学、抽象或隐喻表达',
        '词汇不受限制，可使用学术、专业、技术、文学词汇',
        '句子互不重复，禁止模板化',
      ],
      temperature: 1.2,
      topP: 0.95,
    },
  },
  [Lang.JA]: {
    [WordsLevel.EASIEST]: {
      rules: [
        '只使用 1–2 个词的短词组或短句',
        '使用常用名词、动词、形容词',
        '结构简单，可用 SVO 或 “は/が + 动词/形容词” 句型',
        '禁止从句、被动语态、非谓语结构、抽象词',
        '词汇必须来自 JLPT N5 高频词汇',
        '主题仅限：日常物品、人物、简单动作或天气',
        '句子互不重复，禁止模板化',
      ],
      temperature: 0.8,
      topP: 0.9,
    },
    [WordsLevel.VERY_EASY]: {
      rules: [
        '句子最多 4 个词，使用常用动词、名词或形容词',
        '结构简单，可使用 SVO 或 “は/が + 动词/形容词” 句型',
        '禁止从句、并列句、被动语态、非谓语结构、抽象词',
        '所有词汇必须是 JLPT N5 高频词汇',
        '主题仅限：日常行为、人物、物品、简单动作、天气、兴趣',
        '禁止模板化句式或文学化表达',
      ],
      temperature: 0.9,
      topP: 0.9,
    },
    [WordsLevel.EASY]: {
      rules: [
        '句子最多 7 词',
        '允许简单并列句（使用「そして」「でも」等连接两个短句）',
        '允许基础非谓语不定式（如 ～に行く / ～するために）',
        '禁止复杂从句、复杂被动语态、复杂名词短语',
        '词汇必须来自 JLPT N5-N4 高频词汇',
        '主题限：日常生活、学校、工作、购物、活动、旅行基础情境',
        '句子互不重复，禁止模板化与抽象主题',
      ],
      temperature: 0.9,
      topP: 0.9,
    },
    [WordsLevel.NORMAL]: {
      rules: [
        '句子最多 10 词',
        '可以使用简单定语从句（～の/～こと/～という）、常见状语从句（～から/～とき/～ば）、简单被动语态',
        '禁止复杂从句嵌套、虚拟语气、文学化比喻',
        '词汇必须来自 JLPT N5-N3 高频词汇（约 3000-3500 个）',
        '主题限：兴趣、学习、计划、观点表达、旅行经历、工作情境',
        '句子互不重复，禁止模板化',
      ],
      temperature: 1.0,
      topP: 0.9,
    },
    [WordsLevel.HARD]: {
      rules: [
        '句子最多 14 词',
        '可以使用复杂状语从句（～ながら、～のに、～として）、虚拟语气（もし～なら）、被动语态及可能态（～られる/～できる）、非谓语结构（～している/～された）',
        '禁止诗意修辞及学术写作风格，保持自然口语',
        '词汇必须来自 JLPT N5-N2 高频词汇（约 4500 个）',
        '主题限：观点表达、抽象概念、科技、社会现象、情绪描述等',
        '句子互不重复，禁止模板化',
      ],
      temperature: 1.1,
      topP: 0.95,
    },
    [WordsLevel.VERY_HARD]: {
      rules: [
        '句子最多 18 词',
        '允许所有语法结构，包括复杂嵌套、倒装、强调、虚拟、非谓语链式结构',
        '允许文学化、哲学、抽象或隐喻表达',
        '词汇不受限制，可使用学术、专业、技术、文学词汇',
        '句子互不重复，禁止模板化',
      ],
      temperature: 1.2,
      topP: 0.95,
    },
  },
};

const generatePrompt = (num: number, lang: Lang, level: WordsLevel): string => {
  const config = promptConfig[lang][level];
  if (!config) throw new Error(`Not implemented for ${lang} ${level}`);

  const rulesText = config.rules.map((r, i) => `${i + 1}) ${r}`).join('。');

  const langLabel = lang === Lang.EN ? '英语' : '日语';
  const transLangs = lang === Lang.EN ? '中文与日语' : '中文与英文';
  const mainKey = lang === Lang.EN ? 'en' : 'ja';
  const otherKey = lang === Lang.EN ? 'ja' : 'en';

  return `生成 ${num} 条 ${langLabel}句子，并提供${transLangs}翻译。必须遵守：${rulesText}。输出为纯 JSON 数组，无多余文本，格式为:[{"${mainKey}": "...", "zhCn": "...", "${otherKey}": "..."}]`;
};

const promptWordsMaker = (
  num: number,
  level: WordsLevel,
  lang: Lang,
): { prompt: string; temperature: number; topP: number } => {
  const config = promptConfig[lang][level];
  if (!config) throw new Error(`Not implemented for ${lang} ${level}`);
  return {
    prompt: generatePrompt(num, lang, level),
    temperature: config.temperature,
    topP: config.topP,
  };
};

@Injectable()
export class AiRequest {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: this.configService.deepseekApiKey,
    });
  }

  async requestWords(
    num: number,
    level: WordsLevel,
    lang: Lang,
  ): Promise<string> {
    const { prompt, temperature, topP } = promptWordsMaker(num, level, lang);
    const completion = await this.openai.chat.completions.create({
      temperature,
      top_p: topP,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
      ],
      model: 'deepseek-chat',
      response_format: {
        type: 'json_object',
      },
    });

    return completion.choices[0].message.content || '[]';
  }

  async requestDict(words: string[], lang: Lang): Promise<string> {
    if (words.length === 0) throw new Error('words is empty');

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: promptDictMaker(words, lang),
        },
      ],
      model: 'deepseek-chat',
      response_format: {
        type: 'json_object',
      },
    });

    return completion.choices[0].message.content || '[]';
  }
}
