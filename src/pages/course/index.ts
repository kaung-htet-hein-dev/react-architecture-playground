import type { ComponentType } from 'react'
import { Chapter1 } from './Chapter1'
import { Chapter10 } from './Chapter10'
import { Chapter2 } from './Chapter2'
import { Chapter3 } from './Chapter3'
import { Chapter4 } from './Chapter4'
import { Chapter5 } from './Chapter5'
import { Chapter6 } from './Chapter6'
import { Chapter7 } from './Chapter7'
import { Chapter8 } from './Chapter8'
import { Chapter9 } from './Chapter9'

/**
 * The guide's chapters in order. Each `ChapterN.tsx` exports a prop-less `ChapterN` component
 * whose root is `<ChapterSection n={N}>` (the `<section id="chN" data-ch="N">`). Course.tsx
 * renders this list; replacing a chapter means rewriting only its own file.
 */
export const CHAPTER_COMPONENTS: readonly ComponentType[] = [
  Chapter1,
  Chapter2,
  Chapter3,
  Chapter4,
  Chapter5,
  Chapter6,
  Chapter7,
  Chapter8,
  Chapter9,
  Chapter10,
]
