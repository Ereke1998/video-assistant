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

// Тайминги фраз по раскадровке v3 (предварительные — без озвучки).
export const CHUNKS: Chunk[] = [
  {text: 'Твой ноутбук', from: 0.2, to: 0.8, scene: 'hook'},
  {text: 'прямо сейчас', from: 0.8, to: 1.4, scene: 'hook'},
  {text: 'ЗАДЫХАЕТСЯ —', from: 1.4, to: 1.95, scene: 'hook'},
  {text: 'и ты сам', from: 1.95, to: 2.45, scene: 'hook'},
  {text: 'его УБИВАЕШЬ!', from: 2.45, to: 3.0, scene: 'hook'},
  {text: 'За год внутри', from: 3.15, to: 4.6, scene: 'dust'},
  {text: 'скапливается плотный', from: 4.6, to: 5.6, scene: 'dust'},
  {text: 'слой ПЫЛИ.', from: 5.6, to: 6.6, scene: 'dust'},
  {text: 'Она работает', from: 6.6, to: 7.4, scene: 'dust'},
  {text: 'как ОДЕЯЛО —', from: 7.4, to: 8.2, scene: 'dust'},
  {text: 'горячий воздух', from: 8.2, to: 9.0, scene: 'dust'},
  {text: 'просто НЕ ВЫХОДИТ.', from: 9.0, to: 9.95, scene: 'dust'},
  {text: 'Старая ТЕРМОПАСТА', from: 10.1, to: 10.9, scene: 'thermal'},
  {text: 'превращается в КАМЕНЬ,', from: 10.9, to: 11.8, scene: 'thermal'},
  {text: 'а ТЕРМОПРОКЛАДКИ', from: 11.8, to: 12.6, scene: 'thermal'},
  {text: 'рассыпаются.', from: 12.6, to: 13.4, scene: 'thermal'},
  {text: 'Чип', from: 13.4, to: 13.8, scene: 'thermal'},
  {text: 'ПЕРЕГРЕВАЕТСЯ:', from: 13.8, to: 14.6, scene: 'thermal'},
  {text: 'ноутбук шумит,', from: 14.6, to: 15.5, scene: 'thermal'},
  {text: 'ТОРМОЗИТ', from: 15.5, to: 16.4, scene: 'thermal'},
  {text: 'и может просто', from: 16.4, to: 17.1, scene: 'thermal'},
  {text: 'СГОРЕТЬ.', from: 17.1, to: 17.95, scene: 'thermal'},
  {text: 'Профессиональная', from: 18.15, to: 18.9, scene: 'solution'},
  {text: 'ЧИСТКА,', from: 18.9, to: 19.6, scene: 'solution'},
  {text: 'свежая ТЕРМОПАСТА', from: 19.6, to: 20.6, scene: 'solution'},
  {text: 'и новые ТЕРМОПРОКЛАДКИ', from: 20.6, to: 21.8, scene: 'solution'},
  {text: 'снижают нагрев', from: 21.8, to: 22.8, scene: 'solution'},
  {text: 'на 20–30 ГРАДУСОВ.', from: 22.8, to: 24.0, scene: 'solution'},
  {text: 'Ноутбук снова', from: 24.0, to: 24.9, scene: 'solution'},
  {text: 'ТИХИЙ и БЫСТРЫЙ!', from: 24.9, to: 25.9, scene: 'solution'},
  {text: 'Не жди', from: 26.1, to: 26.6, scene: 'brand'},
  {text: 'дорогого РЕМОНТА.', from: 26.6, to: 27.3, scene: 'brand'},
  {text: 'Всё это делают', from: 27.3, to: 27.9, scene: 'brand'},
  {text: 'мастера PRIME IT —', from: 27.9, to: 28.6, scene: 'brand'},
  {text: 'БЫСТРО', from: 28.6, to: 29.0, scene: 'brand'},
  {text: 'и с ГАРАНТИЕЙ.', from: 29.0, to: 29.6, scene: 'brand'},
  {text: 'Пиши в ДИРЕКТ!', from: 29.6, to: 30.4, scene: 'brand'},
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
export const TIMINGS_ARE_PRELIMINARY = true;

// Пословные тайминги (для SRT/проверки) — генерируются `npm run timings` из CHUNKS.
// <WORDS:BEGIN>
export const WORDS: Word[] = [
  {text: "Твой", start: 12, end: 27, scene: 'hook'},
  {text: "ноутбук", start: 27, end: 48, scene: 'hook'},
  {text: "прямо", start: 48, end: 65, scene: 'hook'},
  {text: "сейчас", start: 65, end: 84, scene: 'hook'},
  {text: "ЗАДЫХАЕТСЯ", start: 84, end: 117, scene: 'hook'},
  {text: "и", start: 117, end: 125, scene: 'hook'},
  {text: "ты", start: 125, end: 135, scene: 'hook'},
  {text: "сам", start: 135, end: 147, scene: 'hook'},
  {text: "его", start: 147, end: 159, scene: 'hook'},
  {text: "УБИВАЕШЬ!", start: 159, end: 180, scene: 'hook'},
  {text: "За", start: 189, end: 211, scene: 'dust'},
  {text: "год", start: 211, end: 237, scene: 'dust'},
  {text: "внутри", start: 237, end: 276, scene: 'dust'},
  {text: "скапливается", start: 276, end: 312, scene: 'dust'},
  {text: "плотный", start: 312, end: 336, scene: 'dust'},
  {text: "слой", start: 336, end: 366, scene: 'dust'},
  {text: "ПЫЛИ.", start: 366, end: 396, scene: 'dust'},
  {text: "Она", start: 396, end: 413, scene: 'dust'},
  {text: "работает", start: 413, end: 444, scene: 'dust'},
  {text: "как", start: 444, end: 463, scene: 'dust'},
  {text: "ОДЕЯЛО", start: 463, end: 492, scene: 'dust'},
  {text: "горячий", start: 492, end: 517, scene: 'dust'},
  {text: "воздух", start: 517, end: 540, scene: 'dust'},
  {text: "просто", start: 540, end: 561, scene: 'dust'},
  {text: "НЕ", start: 561, end: 573, scene: 'dust'},
  {text: "ВЫХОДИТ.", start: 573, end: 597, scene: 'dust'},
  {text: "Старая", start: 606, end: 626, scene: 'thermal'},
  {text: "ТЕРМОПАСТА", start: 626, end: 654, scene: 'thermal'},
  {text: "превращается", start: 654, end: 683, scene: 'thermal'},
  {text: "в", start: 683, end: 691, scene: 'thermal'},
  {text: "КАМЕНЬ,", start: 691, end: 708, scene: 'thermal'},
  {text: "а", start: 708, end: 717, scene: 'thermal'},
  {text: "ТЕРМОПРОКЛАДКИ", start: 717, end: 756, scene: 'thermal'},
  {text: "рассыпаются.", start: 756, end: 804, scene: 'thermal'},
  {text: "Чип", start: 804, end: 828, scene: 'thermal'},
  {text: "ПЕРЕГРЕВАЕТСЯ:", start: 828, end: 876, scene: 'thermal'},
  {text: "ноутбук", start: 876, end: 906, scene: 'thermal'},
  {text: "шумит,", start: 906, end: 930, scene: 'thermal'},
  {text: "ТОРМОЗИТ", start: 930, end: 984, scene: 'thermal'},
  {text: "и", start: 984, end: 992, scene: 'thermal'},
  {text: "может", start: 992, end: 1008, scene: 'thermal'},
  {text: "просто", start: 1008, end: 1026, scene: 'thermal'},
  {text: "СГОРЕТЬ.", start: 1026, end: 1077, scene: 'thermal'},
  {text: "Профессиональная", start: 1089, end: 1134, scene: 'solution'},
  {text: "ЧИСТКА,", start: 1134, end: 1176, scene: 'solution'},
  {text: "свежая", start: 1176, end: 1201, scene: 'solution'},
  {text: "ТЕРМОПАСТА", start: 1201, end: 1236, scene: 'solution'},
  {text: "и", start: 1236, end: 1246, scene: 'solution'},
  {text: "новые", start: 1246, end: 1266, scene: 'solution'},
  {text: "ТЕРМОПРОКЛАДКИ", start: 1266, end: 1308, scene: 'solution'},
  {text: "снижают", start: 1308, end: 1340, scene: 'solution'},
  {text: "нагрев", start: 1340, end: 1368, scene: 'solution'},
  {text: "на", start: 1368, end: 1384, scene: 'solution'},
  {text: "20–30", start: 1384, end: 1406, scene: 'solution'},
  {text: "ГРАДУСОВ.", start: 1406, end: 1440, scene: 'solution'},
  {text: "Ноутбук", start: 1440, end: 1470, scene: 'solution'},
  {text: "снова", start: 1470, end: 1494, scene: 'solution'},
  {text: "ТИХИЙ", start: 1494, end: 1516, scene: 'solution'},
  {text: "и", start: 1516, end: 1527, scene: 'solution'},
  {text: "БЫСТРЫЙ!", start: 1527, end: 1554, scene: 'solution'},
  {text: "Не", start: 1566, end: 1580, scene: 'brand'},
  {text: "жди", start: 1580, end: 1596, scene: 'brand'},
  {text: "дорогого", start: 1596, end: 1618, scene: 'brand'},
  {text: "РЕМОНТА.", start: 1618, end: 1638, scene: 'brand'},
  {text: "Всё", start: 1638, end: 1648, scene: 'brand'},
  {text: "это", start: 1648, end: 1659, scene: 'brand'},
  {text: "делают", start: 1659, end: 1674, scene: 'brand'},
  {text: "мастера", start: 1674, end: 1692, scene: 'brand'},
  {text: "PRIME", start: 1692, end: 1707, scene: 'brand'},
  {text: "IT", start: 1707, end: 1716, scene: 'brand'},
  {text: "БЫСТРО", start: 1716, end: 1740, scene: 'brand'},
  {text: "и", start: 1740, end: 1747, scene: 'brand'},
  {text: "с", start: 1747, end: 1754, scene: 'brand'},
  {text: "ГАРАНТИЕЙ.", start: 1754, end: 1776, scene: 'brand'},
  {text: "Пиши", start: 1776, end: 1793, scene: 'brand'},
  {text: "в", start: 1793, end: 1802, scene: 'brand'},
  {text: "ДИРЕКТ!", start: 1802, end: 1824, scene: 'brand'},
];
// <WORDS:END>
