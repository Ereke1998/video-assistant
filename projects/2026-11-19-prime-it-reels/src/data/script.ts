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

// <WORDS:BEGIN>
export const WORDS: Word[] = [
  {text: "Твой", start: 12, end: 27, scene: 'hook'},
  {text: "ноутбук", start: 27, end: 48, scene: 'hook'},
  {text: "прямо", start: 48, end: 65, scene: 'hook'},
  {text: "сейчас", start: 65, end: 84, scene: 'hook'},
  {text: "ЗАДЫХАЕТСЯ", start: 84, end: 112, scene: 'hook'},
  {text: "и", start: 112, end: 120, scene: 'hook'},
  {text: "ты", start: 120, end: 131, scene: 'hook'},
  {text: "сам", start: 131, end: 144, scene: 'hook'},
  {text: "его", start: 144, end: 157, scene: 'hook'},
  {text: "УБИВАЕШЬ!", start: 157, end: 180, scene: 'hook'},
  {text: "За", start: 189, end: 204, scene: 'dust'},
  {text: "год", start: 204, end: 222, scene: 'dust'},
  {text: "внутри", start: 222, end: 249, scene: 'dust'},
  {text: "скапливается", start: 249, end: 295, scene: 'dust'},
  {text: "плотный", start: 295, end: 325, scene: 'dust'},
  {text: "слой", start: 325, end: 346, scene: 'dust'},
  {text: "ПЫЛИ.", start: 346, end: 367, scene: 'dust'},
  {text: "Она", start: 367, end: 385, scene: 'dust'},
  {text: "работает", start: 385, end: 419, scene: 'dust'},
  {text: "как", start: 419, end: 437, scene: 'dust'},
  {text: "ОДЕЯЛО", start: 437, end: 464, scene: 'dust'},
  {text: "горячий", start: 464, end: 494, scene: 'dust'},
  {text: "воздух", start: 494, end: 521, scene: 'dust'},
  {text: "просто", start: 521, end: 549, scene: 'dust'},
  {text: "НЕ", start: 549, end: 564, scene: 'dust'},
  {text: "ВЫХОДИТ.", start: 564, end: 594, scene: 'dust'},
  {text: "Старая", start: 606, end: 631, scene: 'thermal'},
  {text: "ТЕРМОПАСТА", start: 631, end: 668, scene: 'thermal'},
  {text: "превращается", start: 668, end: 710, scene: 'thermal'},
  {text: "в", start: 710, end: 721, scene: 'thermal'},
  {text: "КАМЕНЬ,", start: 721, end: 746, scene: 'thermal'},
  {text: "а", start: 746, end: 757, scene: 'thermal'},
  {text: "ТЕРМОПРОКЛАДКИ", start: 757, end: 805, scene: 'thermal'},
  {text: "рассыпаются.", start: 805, end: 844, scene: 'thermal'},
  {text: "Чип", start: 844, end: 861, scene: 'thermal'},
  {text: "ПЕРЕГРЕВАЕТСЯ:", start: 861, end: 906, scene: 'thermal'},
  {text: "ноутбук", start: 906, end: 934, scene: 'thermal'},
  {text: "шумит,", start: 934, end: 956, scene: 'thermal'},
  {text: "ТОРМОЗИТ", start: 956, end: 987, scene: 'thermal'},
  {text: "и", start: 987, end: 998, scene: 'thermal'},
  {text: "может", start: 998, end: 1021, scene: 'thermal'},
  {text: "просто", start: 1021, end: 1046, scene: 'thermal'},
  {text: "СГОРЕТЬ.", start: 1046, end: 1074, scene: 'thermal'},
  {text: "Профессиональная", start: 1089, end: 1144, scene: 'solution'},
  {text: "ЧИСТКА,", start: 1144, end: 1170, scene: 'solution'},
  {text: "свежая", start: 1170, end: 1196, scene: 'solution'},
  {text: "ТЕРМОПАСТА", start: 1196, end: 1233, scene: 'solution'},
  {text: "и", start: 1233, end: 1245, scene: 'solution'},
  {text: "новые", start: 1245, end: 1268, scene: 'solution'},
  {text: "ТЕРМОПРОКЛАДКИ", start: 1268, end: 1317, scene: 'solution'},
  {text: "снижают", start: 1317, end: 1346, scene: 'solution'},
  {text: "нагрев", start: 1346, end: 1372, scene: 'solution'},
  {text: "на", start: 1372, end: 1386, scene: 'solution'},
  {text: "20–30", start: 1386, end: 1407, scene: 'solution'},
  {text: "ГРАДУСОВ.", start: 1407, end: 1438, scene: 'solution'},
  {text: "Ноутбук", start: 1438, end: 1467, scene: 'solution'},
  {text: "снова", start: 1467, end: 1490, scene: 'solution'},
  {text: "ТИХИЙ", start: 1490, end: 1514, scene: 'solution'},
  {text: "и", start: 1514, end: 1525, scene: 'solution'},
  {text: "БЫСТРЫЙ!", start: 1525, end: 1554, scene: 'solution'},
  {text: "Не", start: 1566, end: 1576, scene: 'brand'},
  {text: "жди", start: 1576, end: 1589, scene: 'brand'},
  {text: "дорогого", start: 1589, end: 1611, scene: 'brand'},
  {text: "РЕМОНТА.", start: 1611, end: 1632, scene: 'brand'},
  {text: "Всё", start: 1632, end: 1644, scene: 'brand'},
  {text: "это", start: 1644, end: 1657, scene: 'brand'},
  {text: "делают", start: 1657, end: 1675, scene: 'brand'},
  {text: "мастера", start: 1675, end: 1696, scene: 'brand'},
  {text: "PRIME", start: 1696, end: 1713, scene: 'brand'},
  {text: "IT", start: 1713, end: 1723, scene: 'brand'},
  {text: "БЫСТРО", start: 1723, end: 1741, scene: 'brand'},
  {text: "и", start: 1741, end: 1750, scene: 'brand'},
  {text: "с", start: 1750, end: 1758, scene: 'brand'},
  {text: "ГАРАНТИЕЙ.", start: 1758, end: 1783, scene: 'brand'},
  {text: "Пиши", start: 1783, end: 1797, scene: 'brand'},
  {text: "в", start: 1797, end: 1805, scene: 'brand'},
  {text: "ДИРЕКТ!", start: 1805, end: 1824, scene: 'brand'},
];
// <WORDS:END>
