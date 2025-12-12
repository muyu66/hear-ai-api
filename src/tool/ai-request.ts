import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { WordsLevel } from 'src/enum/words-level.enum';
import { ConfigService } from 'src/service/config.service';

const promptDictMaker = (words: string[]) => {
  return `You are an English-Chinese-Japanese dictionary assistant.
I will give you a list of words. Each word may be English, Chinese, or Japanese. For each word, provide all three languages in this format:
English: "en" = word, "enPhonetic" = pronunciation, "enTranslation" = detailed meaning.
Chinese: "zhCn" = word in Chinese, "zhCnPhonetic" = Pinyin, "zhCnTranslation" = detailed meaning grouped by part of speech, meanings per part separated by commas, lines separated by \n, no repeated labels, no examples or domain-specific meanings.
Japanese: "ja" = word in Japanese, "jaPhonetic" = Katakana, "jaTranslation" = same rules as Chinese.
Return exactly a JSON array in this format, no extra text:
[{"en": "example1", "enPhonetic": "phonetic1", "enTranslation": "translation1",
"zhCn": "example1", "zhCnPhonetic": "phonetic1", "zhCnTranslation": "translation1",
"ja": "example1", "jaPhonetic": "phonetic1", "jaTranslation": "translation1"
},{"en": "example2", "enPhonetic": "phonetic2", "enTranslation": "translation2",
"zhCn": "example2", "zhCnPhonetic": "phonetic2", "zhCnTranslation": "translation2",
"ja": "example2", "jaPhonetic": "phonetic2", "jaTranslation": "translation2"}]
The words are: ${words.join(',')}`;
};

const promptWordsMaker = (
  num: number,
  level: WordsLevel,
): {
  prompt: string;
  temperature: number;
  topP: number;
} => {
  switch (level) {
    case WordsLevel.VERY_EASY:
      return {
        prompt: `生成 ${num} 条 A1 英语短句，并提供中文和日语翻译。严格遵守：1) 句子最多 4 个词，只能用一般现在时或一般过去时。2) 结构只能是 SVO 或 be 动词句。3) 禁止从句、并列句（and/but）、被动语态、非谓语（to do / doing / done）、抽象词。4) 所有词必须来自 CEFR A1 高频词。5) 句子需互不相同，尽量避免重复用词。6) 主题仅限：日常行为、人物、物品、简单动作、天气、兴趣。7) 禁止 It is… / There is…、模板化句式、文学化表达。输出为纯 JSON 数组，无多余文本，格式为：[{ "en": "...", "zhCn": "...", "ja": "..." }]`,
        temperature: 0.9,
        topP: 0.9,
      };
    case WordsLevel.EASY:
      return {
        prompt: `生成 ${num} 条 A2 英语句子，并提供中文与日语翻译。必须遵守：1) 句子最多 7 词。2) 允许简单并列句（and/but 连接两个短句）。3) 允许基础 to-do 不定式（如 I went to buy food）。4) 禁止定语从句（who/which/that）、复杂状语从句（although/while/because 等）、复杂被动语态、复杂名词短语。5) 词汇必须来自 CEFR A1–A2 高频词。6) 主题限：日常生活、学校、工作、购物、活动、旅行基础情境。7) 所有句子必须互不相同，尽量避免重复词汇，禁止模板化与抽象主题。输出为纯 JSON 数组，无多余文本，格式必须为：[{ "en": "...", "zhCn": "...", "ja": "..." }]`,
        temperature: 0.9,
        topP: 0.9,
      };
    case WordsLevel.NORMAL:
      return {
        prompt: `生成 ${num} 条 B1 英语句子，并提供中文与日语翻译。必须遵守：1) 句子最多 10 词。2) 可以使用简单定语从句（who/that/which）、常见状语从句（because/when/if/after/before）、一般完成时（have done）、简单被动语态。3) 禁止复杂从句嵌套、虚拟语气、文学化比喻。4) 词汇必须来自 CEFR A1–B1 高频词（前 3000–3500 个）。5) 主题限：兴趣、学习、计划、简单观点、旅行经历、工作情境。6) 所有句子必须互不相同，尽量避免重复词汇，禁止模板化。7) 输出为纯 JSON 数组，无多余文本，每项格式必须为：[{ "en": "...", "zhCn": "...", "ja": "..." }]`,
        temperature: 1.0,
        topP: 0.9,
      };
    case WordsLevel.HARD:
      return {
        prompt: `生成 ${num} 条 B2 英语句子，并提供中文与日语翻译。必须遵守：1) 句子最多 14 词。2) 可以使用复杂状语从句（although, whereas, as soon as）、虚拟语气（If I were …）、被动语态及情态动词完成时（might have done）、非谓语动词复杂用法（Having done..., To be done）。3) 禁止诗意修辞及学术写作风格，保持自然口语。4) 词汇必须来自 CEFR A1–B2 高频词（前 4500 个）。5) 主题限：观点表达、抽象概念、科技、社会现象、情绪描述等。6) 所有句子必须互不相同，尽量避免重复词汇，禁止模板化。7) 输出为纯 JSON 数组，无多余文本，每项格式必须为：[{ "en": "...", "zhCn": "...", "ja": "..." }]`,
        temperature: 1.1,
        topP: 0.95,
      };
    case WordsLevel.VERY_HARD:
      return {
        prompt: `生成 ${num} 条 C2 英语句子，并提供中文与日语翻译。必须遵守：1) 句子最多 18 词。2) 允许所有语法结构，包括复杂嵌套、倒装、强调、虚拟、非谓语链式结构。3) 允许文学化、哲学、抽象或隐喻表达。4) 词汇不受限制，可使用学术、专业、技术、文学词汇。5) 所有句子必须互不相同，尽量避免重复词汇，禁止模板化。6) 输出为纯 JSON 数组，无多余文本，每项格式必须为：[{ "en": "...", "zhCn": "...", "ja": "..." }]`,
        temperature: 1.2,
        topP: 0.95,
      };
  }
};

@Injectable()
export class AiRequest {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: configService.deepseekApiKey,
    });
  }

  async requestWords(num: number, level: WordsLevel): Promise<string> {
    const { prompt, temperature, topP } = promptWordsMaker(num, level);
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

  async requestDict(words: string[]): Promise<string> {
    if (words.length === 0) throw new Error('words is empty');

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: promptDictMaker(words),
        },
      ],
      model: 'deepseek-chat',
    });

    return completion.choices[0].message.content || '[]';
  }
}
