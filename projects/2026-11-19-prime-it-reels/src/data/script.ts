// Сценарий ролика PRIME IT и тайминги субтитров.
// Блок WORDS ниже генерируется скриптом `npm run timings`
// (равномерное распределение слов внутри окна каждой сцены).
// Когда появится public/audio/voiceover.mp3 — замените WORDS на тайминги
// из Whisper/aligner (см. README) и выполните `npm run srt`.

export const FPS = 60;
export const DURATION_IN_FRAMES = 1920;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type SceneId = 'hook' | 'dust' | 'thermal' | 'solution' | 'brand';

export type SceneDef = {
  id: SceneId;
  title: string;
  /** границы сцены, секунды */
  from: number;
  to: number;
  /** окно, в котором показываются субтитры этой сцены, секунды */
  subsFrom: number;
  subsTo: number;
  text: string;
};

export const SCENES: SceneDef[] = [
  {
    id: 'hook',
    title: 'Хук',
    from: 0,
    to: 3,
    subsFrom: 0.2,
    subsTo: 3.0,
    text: 'Твой ноутбук прямо сейчас ЗАДЫХАЕТСЯ — и ты сам его УБИВАЕШЬ!',
  },
  {
    id: 'dust',
    title: 'Проблема: пыль',
    from: 3,
    to: 10,
    subsFrom: 3.15,
    subsTo: 9.9,
    text: 'За год внутри скапливается плотный слой ПЫЛИ. Она работает как ОДЕЯЛО — горячий воздух просто НЕ ВЫХОДИТ.',
  },
  {
    id: 'thermal',
    title: 'Проблема: термопаста и термопрокладки',
    from: 10,
    to: 18,
    subsFrom: 10.1,
    subsTo: 17.9,
    text: 'Старая ТЕРМОПАСТА превращается в КАМЕНЬ, а ТЕРМОПРОКЛАДКИ рассыпаются. Чип ПЕРЕГРЕВАЕТСЯ: ноутбук шумит, ТОРМОЗИТ и может просто СГОРЕТЬ.',
  },
  {
    id: 'solution',
    title: 'Решение',
    from: 18,
    to: 26,
    subsFrom: 18.15,
    subsTo: 25.9,
    text: 'Профессиональная ЧИСТКА, свежая ТЕРМОПАСТА и новые ТЕРМОПРОКЛАДКИ снижают нагрев на 20–30 ГРАДУСОВ. Ноутбук снова ТИХИЙ и БЫСТРЫЙ!',
  },
  {
    id: 'brand',
    title: 'Финал и бренд',
    from: 26,
    to: 32,
    subsFrom: 26.1,
    subsTo: 30.4,
    text: 'Не жди дорогого РЕМОНТА. Всё это делают мастера PRIME IT — БЫСТРО и с ГАРАНТИЕЙ. Пиши в ДИРЕКТ!',
  },
];

export const sceneFrames = (id: SceneId) => {
  const s = SCENES.find((x) => x.id === id)!;
  return {from: Math.round(s.from * FPS), duration: Math.round((s.to - s.from) * FPS)};
};

/** Фраза субтитров (2–3 слова на экране), секунды. Слова ЗАГЛАВНЫМИ в исходнике = акцент. */
export type Chunk = {text: string; from: number; to: number; scene: SceneId};

// Тайминги фраз — по реальной озвучке ElevenLabs (scripts/build_voiceover.py).
export const CHUNKS: Chunk[] = [
  {text: 'Твой ноутбук', from: 0.05, to: 0.61, scene: 'hook'},
  {text: 'прямо сейчас', from: 0.61, to: 1.09, scene: 'hook'},
  {text: 'ЗАДЫХАЕТСЯ —', from: 1.09, to: 1.8, scene: 'hook'},
  {text: 'и ты сам', from: 1.8, to: 2.23, scene: 'hook'},
  {text: 'его УБИВАЕШЬ!', from: 2.23, to: 3.12, scene: 'hook'},
  {text: 'За год внутри', from: 3.12, to: 3.97, scene: 'dust'},
  {text: 'скапливается плотный', from: 3.97, to: 4.95, scene: 'dust'},
  {text: 'слой ПЫЛИ.', from: 4.95, to: 5.84, scene: 'dust'},
  {text: 'Она работает', from: 5.84, to: 6.55, scene: 'dust'},
  {text: 'как ОДЕЯЛО —', from: 6.55, to: 7.44, scene: 'dust'},
  {text: 'горячий воздух', from: 7.44, to: 8.29, scene: 'dust'},
  {text: 'просто НЕ ВЫХОДИТ.', from: 8.29, to: 9.91, scene: 'dust'},
  {text: 'Старая ТЕРМОПАСТА', from: 10.02, to: 10.99, scene: 'thermal'},
  {text: 'превращается в КАМЕНЬ,', from: 10.99, to: 12.13, scene: 'thermal'},
  {text: 'а ТЕРМОПРОКЛАДКИ', from: 12.13, to: 12.86, scene: 'thermal'},
  {text: 'рассыпаются.', from: 12.86, to: 13.85, scene: 'thermal'},
  {text: 'Чип', from: 13.85, to: 14.11, scene: 'thermal'},
  {text: 'ПЕРЕГРЕВАЕТСЯ:', from: 14.11, to: 14.95, scene: 'thermal'},
  {text: 'ноутбук шумит,', from: 14.95, to: 15.92, scene: 'thermal'},
  {text: 'ТОРМОЗИТ', from: 15.92, to: 16.44, scene: 'thermal'},
  {text: 'и может просто', from: 16.44, to: 17.18, scene: 'thermal'},
  {text: 'СГОРЕТЬ.', from: 17.18, to: 18.07, scene: 'thermal'},
  {text: 'Профессиональная', from: 18.07, to: 18.77, scene: 'solution'},
  {text: 'ЧИСТКА,', from: 18.77, to: 19.33, scene: 'solution'},
  {text: 'свежая ТЕРМОПАСТА', from: 19.33, to: 20.29, scene: 'solution'},
  {text: 'и новые ТЕРМОПРОКЛАДКИ', from: 20.29, to: 21.28, scene: 'solution'},
  {text: 'снижают нагрев', from: 21.28, to: 22.05, scene: 'solution'},
  {text: 'на 20–30 ГРАДУСОВ.', from: 22.05, to: 23.82, scene: 'solution'},
  {text: 'Ноутбук снова', from: 23.82, to: 24.59, scene: 'solution'},
  {text: 'ТИХИЙ и БЫСТРЫЙ!', from: 24.59, to: 26.02, scene: 'solution'},
  {text: 'Не жди', from: 26.02, to: 26.38, scene: 'brand'},
  {text: 'дорогого РЕМОНТА.', from: 26.38, to: 27.13, scene: 'brand'},
  {text: 'Всё это делают', from: 27.13, to: 27.74, scene: 'brand'},
  {text: 'мастера PRIME IT —', from: 27.74, to: 28.82, scene: 'brand'},
  {text: 'БЫСТРО', from: 28.82, to: 29.13, scene: 'brand'},
  {text: 'и с ГАРАНТИЕЙ.', from: 29.13, to: 29.87, scene: 'brand'},
  {text: 'Пиши в ДИРЕКТ!', from: 29.87, to: 30.9, scene: 'brand'},
];

export type Word = {
  text: string;
  /** кадр появления (60 fps) */
  start: number;
  /** кадр исчезновения (не включительно) */
  end: number;
  scene: SceneId;
};

/** Предварительные тайминги: true пока слова не выровнены по реальной озвучке. */
export const TIMINGS_ARE_PRELIMINARY = false;

// Пословные тайминги (для SRT/проверки) — генерируются `npm run timings` из CHUNKS.
// <WORDS:BEGIN>
export const WORDS: Word[] = [
  {text: "Твой", start: 5, end: 18, scene: 'hook'},
  {text: "ноутбук", start: 18, end: 38, scene: 'hook'},
  {text: "прямо", start: 38, end: 50, scene: 'hook'},
  {text: "сейчас", start: 50, end: 67, scene: 'hook'},
  {text: "ЗАДЫХАЕТСЯ", start: 67, end: 110, scene: 'hook'},
  {text: "и", start: 110, end: 116, scene: 'hook'},
  {text: "ты", start: 116, end: 122, scene: 'hook'},
  {text: "сам", start: 122, end: 136, scene: 'hook'},
  {text: "его", start: 136, end: 143, scene: 'hook'},
  {text: "УБИВАЕШЬ!", start: 143, end: 199, scene: 'hook'},
  {text: "За", start: 189, end: 202, scene: 'dust'},
  {text: "год", start: 202, end: 213, scene: 'dust'},
  {text: "внутри", start: 213, end: 240, scene: 'dust'},
  {text: "скапливается", start: 240, end: 275, scene: 'dust'},
  {text: "плотный", start: 275, end: 299, scene: 'dust'},
  {text: "слой", start: 299, end: 316, scene: 'dust'},
  {text: "ПЫЛИ.", start: 316, end: 352, scene: 'dust'},
  {text: "Она", start: 352, end: 368, scene: 'dust'},
  {text: "работает", start: 368, end: 395, scene: 'dust'},
  {text: "как", start: 395, end: 405, scene: 'dust'},
  {text: "ОДЕЯЛО", start: 405, end: 448, scene: 'dust'},
  {text: "горячий", start: 448, end: 473, scene: 'dust'},
  {text: "воздух", start: 473, end: 499, scene: 'dust'},
  {text: "просто", start: 499, end: 530, scene: 'dust'},
  {text: "НЕ", start: 530, end: 536, scene: 'dust'},
  {text: "ВЫХОДИТ.", start: 536, end: 594, scene: 'dust'},
  {text: "Старая", start: 603, end: 629, scene: 'thermal'},
  {text: "ТЕРМОПАСТА", start: 629, end: 661, scene: 'thermal'},
  {text: "превращается", start: 661, end: 696, scene: 'thermal'},
  {text: "в", start: 696, end: 701, scene: 'thermal'},
  {text: "КАМЕНЬ,", start: 701, end: 730, scene: 'thermal'},
  {text: "а", start: 730, end: 736, scene: 'thermal'},
  {text: "ТЕРМОПРОКЛАДКИ", start: 736, end: 773, scene: 'thermal'},
  {text: "рассыпаются.", start: 773, end: 833, scene: 'thermal'},
  {text: "Чип", start: 833, end: 848, scene: 'thermal'},
  {text: "ПЕРЕГРЕВАЕТСЯ:", start: 848, end: 899, scene: 'thermal'},
  {text: "ноутбук", start: 899, end: 926, scene: 'thermal'},
  {text: "шумит,", start: 926, end: 957, scene: 'thermal'},
  {text: "ТОРМОЗИТ", start: 957, end: 988, scene: 'thermal'},
  {text: "и", start: 988, end: 992, scene: 'thermal'},
  {text: "может", start: 992, end: 1011, scene: 'thermal'},
  {text: "просто", start: 1011, end: 1033, scene: 'thermal'},
  {text: "СГОРЕТЬ.", start: 1033, end: 1086, scene: 'thermal'},
  {text: "Профессиональная", start: 1086, end: 1128, scene: 'solution'},
  {text: "ЧИСТКА,", start: 1128, end: 1162, scene: 'solution'},
  {text: "свежая", start: 1162, end: 1187, scene: 'solution'},
  {text: "ТЕРМОПАСТА", start: 1187, end: 1219, scene: 'solution'},
  {text: "и", start: 1219, end: 1223, scene: 'solution'},
  {text: "новые", start: 1223, end: 1237, scene: 'solution'},
  {text: "ТЕРМОПРОКЛАДКИ", start: 1237, end: 1279, scene: 'solution'},
  {text: "снижают", start: 1279, end: 1306, scene: 'solution'},
  {text: "нагрев", start: 1306, end: 1325, scene: 'solution'},
  {text: "на", start: 1325, end: 1330, scene: 'solution'},
  {text: "20–30", start: 1330, end: 1377, scene: 'solution'},
  {text: "ГРАДУСОВ.", start: 1377, end: 1431, scene: 'solution'},
  {text: "Ноутбук", start: 1431, end: 1459, scene: 'solution'},
  {text: "снова", start: 1459, end: 1477, scene: 'solution'},
  {text: "ТИХИЙ", start: 1477, end: 1499, scene: 'solution'},
  {text: "и", start: 1499, end: 1507, scene: 'solution'},
  {text: "БЫСТРЫЙ!", start: 1507, end: 1564, scene: 'solution'},
  {text: "Не", start: 1563, end: 1575, scene: 'brand'},
  {text: "жди", start: 1575, end: 1584, scene: 'brand'},
  {text: "дорогого", start: 1584, end: 1605, scene: 'brand'},
  {text: "РЕМОНТА.", start: 1605, end: 1630, scene: 'brand'},
  {text: "Всё", start: 1630, end: 1642, scene: 'brand'},
  {text: "это", start: 1642, end: 1650, scene: 'brand'},
  {text: "делают", start: 1650, end: 1666, scene: 'brand'},
  {text: "мастера", start: 1666, end: 1687, scene: 'brand'},
  {text: "PRIME", start: 1687, end: 1701, scene: 'brand'},
  {text: "IT", start: 1701, end: 1731, scene: 'brand'},
  {text: "БЫСТРО", start: 1731, end: 1750, scene: 'brand'},
  {text: "и", start: 1750, end: 1752, scene: 'brand'},
  {text: "с", start: 1752, end: 1756, scene: 'brand'},
  {text: "ГАРАНТИЕЙ.", start: 1756, end: 1794, scene: 'brand'},
  {text: "Пиши", start: 1794, end: 1811, scene: 'brand'},
  {text: "в", start: 1811, end: 1814, scene: 'brand'},
  {text: "ДИРЕКТ!", start: 1814, end: 1861, scene: 'brand'},
];
// <WORDS:END>
