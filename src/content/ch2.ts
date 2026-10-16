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
    runs: 'Vue remembers that this component reads todos. When todos changes, Vue re-runs only the components that read it, then updates their virtual DOM.',
    plus: 'Fewer components re-run, without you adding memo.',
    minus: "Extra rules to learn: ref, .value, and which values Vue does or doesn't watch.",
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
    runs: 'When you build the app, the compiler turns this file into code that adds a row and sets one text. In the browser that code runs directly; nothing is compared.',
    plus: 'Little code shipped to the browser, and direct updates.',
    minus: 'More happens at build time, so how it behaves depends on the code the compiler writes.',
  },
  solid: {
    name: 'Solid',
    model: 'Signals update the exact DOM node; components run once.',
    code: 'function TodoApp() {\n  const [todos, setTodos] = createSignal(initial);\n  const left = () => todos().filter(t => !t.done).length;\n  return <>\n    <ul><For each={todos()}>{t => <li>{t.text}</li>}</For></ul>\n    <p>{left()} left</p>\n  </>;\n}',
    active: 6,
    runs: 'TodoApp ran once, at mount. Now only the expressions that read todos() run: <For> adds one <li>, and the text node updates.',
    plus: 'Very exact updates, and components never run twice.',
    minus: 'Because components run only once, destructuring props or reading a signal outside JSX can quietly stop the screen from updating.',
  },
  angular: {
    name: 'Angular',
    model: 'Change detection, now moving to signals.',
    code: "@Component({\n  selector: 'todo-app',\n  template: `\n    <ul>@for (t of todos(); track t.id) {<li>{{ t.text }}</li>}</ul>\n    <p>{{ left() }} left</p>`,\n})\nexport class TodoApp {\n  todos = signal(initial);\n  left = computed(() => this.todos().filter(t => !t.done).length);\n}",
    active: 8,
    runs: 'Older Angular checks every binding in the component tree after any event. With signals, it only checks the parts that read todos.',
    plus: 'A full framework with strong conventions for large teams.',
    minus: 'Two ways of working (zones and signals) exist side by side while apps move over.',
  },
}

export const VANILLA: ApproachCopy = {
  kicker: 'Imperative · you say how',
  name: 'Vanilla JS + HTML',
  model: 'You find the DOM nodes and change them yourself.',
  code: "const list = document.querySelector('#list');\nconst left = document.querySelector('#left');\n\nfunction addTodo(text) {\n  todos.push({ text, done: false });\n  const li = document.createElement('li');\n  li.textContent = text;\n  list.append(li);\n  left.textContent = countLeft(todos) + ' left';\n}",
  active: 9,
  runs: 'Only your addTodo function. It makes the 4 changes itself: create the <li>, set its text, add it to the list, update the label.',
  plus: 'No library and no extra work in the browser.',
  minus: 'You must remember every place that shows this data. Miss one and the screen shows old data.',
}

export const REACT: ApproachCopy = {
  kicker: 'Declarative · you say what',
  name: 'React',
  model: 'You describe how the UI should look for some state; React works out the changes.',
  code: 'function TodoApp() {\n  const [todos, setTodos] = useState(initial);\n  const left = todos.filter(t => !t.done).length;\n\n  return (\n    <>\n      <ul>{todos.map(t => <li key={t.id}>{t.text}</li>)}</ul>\n      <p>{left} left</p>\n    </>\n  );\n}',
  active: 1,
  runs: 'setTodos asks for a render. TodoApp runs again, top to bottom. React compares the new elements with the old ones and finds the same 4 changes.',
  plus: "You describe the result for any state; keeping the screen up to date is React's job.",
  minus: 'Components re-run and React compares the results on every update, which you sometimes need to speed up.',
}

export const OTHERS_KICKER = 'Other approaches'
