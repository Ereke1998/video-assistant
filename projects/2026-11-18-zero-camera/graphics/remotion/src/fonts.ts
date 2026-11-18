// Шрифты из npm (@fontsource) — кириллица и казахские буквы (cyrillic-ext), без обращения к сети при рендере.
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import "@fontsource/montserrat/800-italic.css";
import "@fontsource/jetbrains-mono/500.css";
import { continueRender, delayRender } from "remotion";

const h = delayRender("fonts");
Promise.all(["600 40px Montserrat", "800 40px Montserrat", "900 40px Montserrat", "italic 800 40px Montserrat", "500 20px 'JetBrains Mono'"]
  .map((f) => document.fonts.load(f, "Аәғқңөұүһі"))).then(() => continueRender(h), () => continueRender(h));
