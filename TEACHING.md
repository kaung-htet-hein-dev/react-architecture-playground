# Teaching style guide

Every lesson, blurb and explanation in this course follows these rules. They are modelled on how a
patient tutor explains things in a chat: start from why, give the big idea in one sentence, use a
picture the learner already has in their head, then walk through it step by step.

## The rules

1. **Why before how.** Open with the problem the feature solves, in one or two sentences, before any syntax.
   "Forgot to set a variable in JS? You get `undefined`. Go removes that whole class of bug." Then show how.
2. **Big idea in one sentence.** Each lesson and each teaching section has one sentence a learner could
   repeat to a friend. Put it early. In sections, use a note titled `In one sentence`.
3. **A mental model or analogy.** Tie the new idea to something the learner already knows: a JS feature
   first, an everyday object second ("a channel is a pipe with a few slots"). Use a note titled
   `Think of it like this` where an analogy carries the section. Say where the analogy breaks if it does.
4. **Example before rule.** Show a small piece of code, say what it prints, then state the rule it shows.
5. **Step by step.** Anything that happens in order (evaluation, blocking, growth, a request) is a numbered
   list of short steps (`{ list: [...], ordered: true }`), not one long paragraph.
6. **Define every new word on first use**, inline and in plain words: "the zero value (the empty value Go
   gives a type when you don't set one)". Never assume the learner knows runtime or compiler vocabulary.
7. **Short chunks.** One idea per paragraph, one to three sentences. Split long paragraphs.
8. **Bold the key term once**, where it is introduced. Do not bold whole sentences.
9. **Talk to the learner.** Second person, friendly, direct. "You'll write this a lot." No lecturing, no
   jargon walls, no hype words (powerful, seamless, robust, simply, just).
10. **Answer the obvious question.** When a TS developer would think "wait, why?", answer it right there:
    "You might wonder why Go doesn't convert for you. The answer: ...".
11. **Explain answers, not only verdicts.** Predict `why` and Challenge `success`/`wrong`/`hint` say what
    happens step by step and which rule caused it. Hints nudge toward the rule without giving the answer.
12. **Close the loop.** Recap bullets restate the big ideas in the same words used to teach them, so the
    learner recognises them.

## What does not change

- Code in `predict` and `challenge` (and their `answers`/`options`/`answer`) was run with Go 1.25. Do not
  edit it unless you re-run it. Code comments elsewhere may be added or reworded.
- The lesson schema in `src/data/lessons/types.ts` (beyond the optional `ordered` list flag) and the six-part lesson format in the README.
- Facts. Rewording must not change what is true.
