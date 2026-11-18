import { Chips } from "./Chips";
import { ToolList } from "./ToolList";
import { Folder } from "./Folder";
import { Phone } from "./Phone";
import { Chat } from "./Chat";
import { Steps } from "./Steps";
import { Bars } from "./Bars";
import { Counter } from "./Counter";
import { Cards } from "./Cards";
import { Code } from "./Code";
import { CTA } from "./CTA";

// Реестр визуалов: scenes[].visual.component в project.config.json → компонент.
export const COMPONENTS: Record<string, React.FC<any>> = { Chips, ToolList, Folder, Phone, Chat, Steps, Bars, Counter, Cards, Code, CTA };
