---
title: Big-O Notation Without the Jargon
slug: big-o-notation-without-the-jargon
kind: article
category: programming
access: free
summary: How to tell whether your code will still be fast when the data gets big — explained with everyday examples.
tags: [algorithms, complexity, interviews]
author: Polymath Team
---

**Big-O notation** describes how the work an algorithm does grows as its input grows. It ignores the details and asks one question: *if the data gets ten times bigger, how much slower does this get?*

<!-- more -->

## The common growth rates

| Big-O | Name | Everyday example |
|---|---|---|
| $O(1)$ | constant | Looking up a word by page number |
| $O(\log n)$ | logarithmic | Finding a name in a phone book by halving |
| $O(n)$ | linear | Reading every page of a book |
| $O(n \log n)$ | linearithmic | Sorting a deck of cards efficiently |
| $O(n^2)$ | quadratic | Comparing every person in a room with everyone else |

## Seeing it in code

```javascript
// O(1): one step, no matter how long the array is
const first = (items) => items[0];

// O(n): looks at every item once
function contains(items, target) {
  for (const item of items) {
    if (item === target) return true;
  }
  return false;
}

// O(n²): compares every pair
function hasDuplicate(items) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i] === items[j]) return true;
    }
  }
  return false;
}
```

The quadratic version makes $\frac{n(n-1)}{2}$ comparisons. For 1,000 items that is about half a million; for 1,000,000 items, half a *trillion*.

## The fix is often a better data structure

```javascript
// O(n): a Set remembers what we've seen
function hasDuplicateFast(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) return true;
    seen.add(item);
  }
  return false;
}
```

> [!TIP]
> When code feels slow, look for a loop inside a loop. A `Set` or a `Map` can often turn $O(n^2)$ into $O(n)$.

## Why logarithms are magic

Binary search halves the remaining data at every step, so a sorted list of a billion items takes at most about 30 steps, because $2^{30} \approx 1.07 \times 10^9$.
