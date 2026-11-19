// Тайминги субтитров: из выравнивания озвучки (если есть) или пропорционально.
// Чистый модуль — используется и в браузере (рендер), и в Node (экспорт .srt).

const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}+]/gu, '');
const plain = (s) => s.replace(/\*/g, '');

/**
 * @param {Array} scenes  SCENES из timeline.config.js
 * @param {Array|null} alignment  build/vo-alignment.json: [{scene, w, start, end}]
 * @returns {Array<{start:number,end:number,text:string,scene:string}>}  text сохраняет *акценты*
 */
export function buildSubtitles(scenes, alignment) {
  const out = [];
  for (const sc of scenes) {
    const words = (alignment || []).filter((w) => w.scene === sc.id);
    const subs = sc.subs.map((s) => (typeof s === 'string' ? { t: s } : s));
    const voStart = words[0]?.start ?? sc.vo.parts[0].at;
    const voEnd = words.at(-1)?.end ?? sc.end - 0.2;

    // 1) якоря: первое слово экрана ищем вперёд по словам озвучки
    let pos = 0;
    const starts = subs.map((s) => {
      const key = norm(s.anchor || plain(s.t).split(/\s+/)[0]);
      for (let k = pos; k < words.length; k++) {
        if (norm(words[k].w) === key) { pos = k + 1; return words[k].start; }
      }
      return null;
    });
    // 2) пропуски — интерполяция (по числу слов) между известными соседями
    const wc = subs.map((s) => plain(s.t).split(/\s+/).length);
    const known = [[-1, voStart], ...starts.map((v, i) => [i, v]).filter(([, v]) => v != null), [subs.length, voEnd]];
    if (starts[0] == null) starts[0] = voStart;
    for (let i = 0; i < subs.length; i++) {
      if (starts[i] != null) continue;
      const prev = [...known].reverse().find(([k]) => k < i);
      const next = known.find(([k]) => k > i);
      const a = prev[0] < 0 ? 0 : prev[0];
      const totalW = wc.slice(a, next[0]).reduce((x, y) => x + y, 0) || 1;
      const before = wc.slice(a, i).reduce((x, y) => x + y, 0);
      starts[i] = prev[1] + (next[1] - prev[1]) * (before / totalW);
    }
    subs.forEach((s, i) => {
      const start = Math.max(sc.start, starts[i] - 0.05);
      // конец: до следующего экрана, но не дольше 0,6 с после последнего произнесённого слова
      let next = i < subs.length - 1 ? starts[i + 1] - 0.05 : sc.end - 0.05;
      // не переносим субтитр через границу подсцены (попытки эксперимента)
      const cut = (sc.attempts || []).map((a) => a.end).find((e) => e > start + 0.2);
      if (cut) next = Math.min(next, cut - 0.05);
      const spoken = words.filter((w) => w.start < next - 0.01).at(-1);
      const end = Math.min(next, (spoken ? spoken.end : voEnd) + 0.6);
      out.push({ scene: sc.id, start: +start.toFixed(3), end: +Math.max(start + 0.4, end).toFixed(3), text: s.t });
    });
  }
  return out;
}

const ts = (t) => {
  const ms = Math.round(t * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

export function toSrt(subs) {
  return subs.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${plain(s.text)}\n`).join('\n');
}
