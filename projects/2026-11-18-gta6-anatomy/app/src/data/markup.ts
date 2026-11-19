/**
 * Разбор разметки озвучки: «[показать|произнести]».
 * Используется и Node-скриптами (озвучка/таймлайн), и Remotion.
 * Только «стираемый» TypeScript, без импортов.
 */

export type DisplayToken = {
  /** как слово выглядит в субтитрах */
  display: string;
  /** нормализованная форма для поиска cue */
  norm: string;
  /** индексы произносимых слов [start, end] включительно */
  spokenStart: number;
  spokenEnd: number;
};

export type ParsedText = {
  /** текст без разметки ударений (по нему считаются тайминги) */
  spoken: string;
  /** текст для TTS: с ударениями «+» перед ударной гласной */
  ttsText: string;
  /** произносимые слова с позициями символов в spoken */
  spokenWords: {text: string; charStart: number; charEnd: number}[];
  tokens: DisplayToken[];
};

const WORDLIKE = /[\p{L}\p{N}]/u;
/** теги эмоций в тексте сценария: {excited}, {dramatic pause} */
const EMO_TAG = /\{([a-z][a-z ]*)\}/g;
/** теги в тексте для TTS: [excited] (вместе с пробелами после) */
export const TTS_TAG = /\[[a-z][a-z ]*\]\s*/g;
export const stripTags = (s: string) => s.replace(TTS_TAG, '');
const DROP_PUNCT = /^[—–-]+$/;

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[-‐–]/g, ' ')
    .replace(/[^\p{L}\p{N}\s$]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export function parseMarkup(text: string): ParsedText {
  const re = /\[([^|\]]+)\|([^\]]+)\]/g;
  type Seg = {plain: true; text: string} | {plain: false; display: string; spoken: string};
  const segs: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({plain: true, text: text.slice(last, m.index)});
    segs.push({plain: false, display: m[1], spoken: m[2]});
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({plain: true, text: text.slice(last)});

  // ttsText — для синтеза: ударения «+» и теги эмоций {excited} → [excited] (eleven_v3);
  // spoken — чистый текст без тегов и «+», по нему считаются тайминги и субтитры
  const ttsText = segs.map((s) => (s.plain ? s.text : s.spoken)).join('').replace(EMO_TAG, (_, t) => `[${t}]`);
  const spoken = stripTags(ttsText).replace(/\+/g, '');

  const spokenWords: ParsedText['spokenWords'] = [];
  const wre = /\S+/g;
  let w: RegExpExecArray | null;
  while ((w = wre.exec(spoken))) {
    if (!WORDLIKE.test(w[0])) continue;
    spokenWords.push({text: w[0], charStart: w.index, charEnd: w.index + w[0].length - 1});
  }

  const tokens: DisplayToken[] = [];
  let spokenIdx = 0;
  const countWords = (s: string) => s.split(/\s+/).filter((x) => WORDLIKE.test(x)).length;

  for (const seg of segs) {
    if (seg.plain) {
      seg.text = seg.text.replace(/\{[a-z][a-z ]*\}\s*/g, '');
      // посимвольно: пунктуация, прилипшая к предыдущему токену (напр. "]."), присоединяется к нему
      const parts = seg.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p || /^\s+$/.test(p)) continue;
        if (!WORDLIKE.test(p)) {
          if (DROP_PUNCT.test(p) || tokens.length === 0) continue;
          tokens[tokens.length - 1].display += p;
          continue;
        }
        const d = p.replace(/\+/g, '');
        tokens.push({display: d, norm: normalize(d), spokenStart: spokenIdx, spokenEnd: spokenIdx});
        spokenIdx++;
      }
    } else {
      const n = Math.max(1, countWords(seg.spoken));
      tokens.push({
        display: seg.display,
        norm: normalize(seg.display),
        spokenStart: spokenIdx,
        spokenEnd: spokenIdx + n - 1,
      });
      spokenIdx += n;
    }
  }

  if (spokenIdx !== spokenWords.length) {
    throw new Error(
      `parseMarkup: рассинхрон слов (${spokenIdx} в токенах vs ${spokenWords.length} в тексте): ${text.slice(0, 60)}…`,
    );
  }
  return {spoken, ttsText, spokenWords, tokens};
}

/** Найти индекс токена, с которого начинается фраза cue, начиная с from */
export function findCue(tokens: DisplayToken[], cue: string, from = 0): number {
  const target = normalize(cue);
  for (let i = from; i < tokens.length; i++) {
    let s = '';
    for (let j = i; j < tokens.length; j++) {
      s = s ? `${s} ${tokens[j].norm}` : tokens[j].norm;
      if (s === target || s.startsWith(`${target} `)) return i;
      if (s.length >= target.length) break;
    }
  }
  return -1;
}
