/**
 * Static code samples shown outside a simulation, verbatim from
 * doc/design/Render Commit Repeat.dc.html (`codes()`).
 */

/** Chapter 9 · Modern React: Before/Now pairs and the Server Components split. */
export const CH9_CODE = {
  actionsBefore:
    "const [error, setError] = useState(null);\nconst [pending, setPending] = useState(false);\n\nasync function onSubmit(e) {\n  e.preventDefault();\n  setPending(true);\n  setError(await updateName(name));\n  setPending(false);\n}\nreturn <form onSubmit={onSubmit}>…</form>;",
  actionsNow:
    "const [error, submit, isPending] = useActionState(\n  async (prev, formData) => updateName(formData.get('name')),\n  null,\n);\nreturn <form action={submit}>…</form>;",
  optimisticBefore:
    "async function send(text) {\n  const temp = { id: 'tmp', text, sending: true };\n  setMsgs(m => [...m, temp]);\n  try { await post(text); }\n  catch { setMsgs(m => m.filter(x => x !== temp)); }\n}",
  optimisticNow:
    "const [shown, addOptimistic] = useOptimistic(\n  msgs, (state, text) => [...state, { text, sending: true }],\n);\nasync function send(formData) {\n  addOptimistic(formData.get('text'));\n  await post(formData.get('text'));\n}",
  useBefore:
    'const [comments, setComments] = useState(null);\nuseEffect(() => {\n  fetchComments(id).then(setComments);\n}, [id]);\nif (!comments) return <Spinner />;',
  useNow:
    'function Comments({ commentsPromise }) {\n  // suspends until the promise resolves\n  const comments = use(commentsPromise);\n  return comments.map(c => <p key={c.id}>{c.text}</p>);\n}',
  compilerBefore:
    'const sorted = useMemo(() => sortBy(items, key), [items, key]);\nconst onSelect = useCallback(id => setSelected(id), []);\nexport default memo(List);',
  compilerNow: 'const sorted = sortBy(items, key);\nconst onSelect = id => setSelected(id);\nexport default List;',
  server:
    '// ProductPage.jsx · runs on the server\nexport default async function ProductPage({ id }) {\n  const product = await db.products.find(id);\n  return (\n    <>\n      <h1>{product.name}</h1>\n      <AddToCart productId={id} />\n    </>\n  );\n}',
  client:
    "// AddToCart.jsx · runs in the browser\n'use client';\n\nexport function AddToCart({ productId }) {\n  const [adding, setAdding] = useState(false);\n  return <button onClick={() => add(productId)}>Add to cart</button>;\n}",
} as const
