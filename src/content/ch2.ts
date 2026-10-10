/** Chapter 2 copy and code, verbatim from design/Render Commit Repeat.dc.html `ch2()`. */

export interface ApproachCopy {
  kicker?: string
  name: string
  model: string
  code: string
  /** Line that reacts to the change. */
  active: number
  runs: string
  plus: string
  minus: string
}

const SO = '\x3cscript'
const SC = '\x3c/script>'

export type OtherId = 'vue' | 'svelte' | 'solid' | 'angular'

export const OTHERS: Record<OtherId, ApproachCopy> = {
  vue: {
    name: 'Vue',
    model: 'Tracks which data each component reads.',
    code:
      SO +
      ' setup>\nconst todos = ref(initial);\nconst left = computed(() =>\n  todos.value.filter(t => !t.done).length);\n' +
      SC +
      '\n\n<template>\n  <ul><li v-for="t in todos" :key="t.id">{{ t.text }}</li></ul>\n  <p>{{ left }} left</p>\n</template>',
    active: 2,
    runs: 'Vue recorded that this component reads todos. Pushing to it re-runs only the components that read it, then patches their virtual DOM.',
    plus: 'Fewer components re-run, without you adding memo.',
    minus: "Reactivity rules to learn: ref, .value, what is and isn't tracked.",
  },
  svelte: {
    name: 'Svelte',
    model: 'A compiler writes the DOM updates ahead of time.',
    code:
      SO +
      '>\n  let todos = $state(initial);\n  let left = $derived(\n    todos.filter(t => !t.done).length);\n' +
      SC +
      '\n\n<ul>{#each todos as t (t.id)}<li>{t.text}</li>{/each}</ul>\n<p>{left} left</p>',
    active: 2,
    runs: 'At build time the compiler turned this file into code that adds a row and sets one text node. At runtime that code just runs; there is no diff.',
    plus: 'A small runtime and direct updates.',
    minus: 'More happens at build time, so behavior depends on what the compiler generates.',
  },
  solid: {
    name: 'Solid',
    model: 'Signals update the exact DOM node; components run once.',
    code: 'function TodoApp() {\n  const [todos, setTodos] = createSignal(initial);\n  const left = () => todos().filter(t => !t.done).length;\n  return <>\n    <ul><For each={todos()}>{t => <li>{t.text}</li>}</For></ul>\n    <p>{left()} left</p>\n  </>;\n}',
    active: 6,
    runs: 'TodoApp ran once, at mount. Now only the expressions that read todos() run: <For> adds one <li>, and the text node updates.',
    plus: 'Very precise updates with no component re-runs.',
    minus: 'Because components never re-run, destructuring props or reading a signal outside JSX can silently stop updates.',
  },
  angular: {
    name: 'Angular',
    model: 'Change detection, now moving to signals.',
    code: "@Component({\n  selector: 'todo-app',\n  template: `\n    <ul>@for (t of todos(); track t.id) {<li>{{ t.text }}</li>}</ul>\n    <p>{{ left() }} left</p>`,\n})\nexport class TodoApp {\n  todos = signal(initial);\n  left = computed(() => this.todos().filter(t => !t.done).length);\n}",
    active: 8,
    runs: 'Classic Angular checks bindings across the component tree after any event. With signals, it marks only the views that read todos and checks those.',
    plus: 'A full framework with strong conventions for large teams.',
    minus: 'Two models in the wild, zones and signals, while apps migrate.',
  },
}

export const VANILLA: ApproachCopy = {
  kicker: 'Imperative',
  name: 'Vanilla JS + HTML',
  model: 'You find the DOM nodes and change them yourself.',
  code: "const list = document.querySelector('#list');\nconst left = document.querySelector('#left');\n\nfunction addTodo(text) {\n  todos.push({ text, done: false });\n  const li = document.createElement('li');\n  li.textContent = text;\n  list.append(li);\n  left.textContent = countLeft(todos) + ' left';\n}",
  active: 9,
  runs: 'Only your addTodo function. It makes the 4 writes itself: create the <li>, set its text, append it, update the label.',
  plus: 'No library and no extra work at runtime.',
  minus: 'You must remember every place that shows this data. Miss one and the screen shows stale data.',
}

export const REACT: ApproachCopy = {
  kicker: 'Declarative',
  name: 'React',
  model: 'You describe the UI for a given state; React works out the changes.',
  code: 'function TodoApp() {\n  const [todos, setTodos] = useState(initial);\n  const left = todos.filter(t => !t.done).length;\n\n  return (\n    <>\n      <ul>{todos.map(t => <li key={t.id}>{t.text}</li>)}</ul>\n      <p>{left} left</p>\n    </>\n  );\n}',
  active: 1,
  runs: 'setTodos schedules a render. TodoApp runs again, top to bottom. React compares the new elements with the old ones and finds the same 4 writes.',
  plus: "You describe the result for any state; keeping the screen in sync is React's job.",
  minus: 'Re-running components and diffing on every update, which you sometimes need to tune.',
}

export const OTHERS_KICKER = 'Other approaches'
