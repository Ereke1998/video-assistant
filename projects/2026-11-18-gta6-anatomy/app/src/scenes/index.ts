import React from 'react';
import {SceneProps} from '../components/ui';
import {Countdown, Crowd, Generations, Hook, OfficeClosed, Question, YearsJump} from './act1';
import {ActTitle, BigNumber, BudgetBars, Platforms, PriceTags, RecordBadge} from './act2';
import {ChaosTags, CopsAI, Engine, MapPin, SplitScreen} from './act3';
import {Demand, FinalPoll, StockChart, Views} from './act4';

/** type из script.ts → React-компонент */
export const SCENES: Record<string, React.FC<SceneProps<any>>> = {
  Countdown, Hook, YearsJump, Generations, Crowd, OfficeClosed, Question,
  ActTitle, BigNumber, BudgetBars, PriceTags, RecordBadge, Platforms,
  Engine, CopsAI, SplitScreen, MapPin, ChaosTags,
  Demand, StockChart, Views, FinalPoll,
};
