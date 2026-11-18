import { Hook } from "./Hook";
import { Plate } from "./Plate";
import { List } from "./List";
import { Infographic } from "./Infographic";
import { Counter } from "./Counter";
import { Code } from "./Code";
import { CTA } from "./CTA";

// Реестр визуалов: scenes[].visual.component в project.config.json → компонент.
export const COMPONENTS: Record<string, React.FC<any>> = { Hook, Plate, List, Infographic, Counter, Code, CTA };
