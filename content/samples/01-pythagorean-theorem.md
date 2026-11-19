---
title: The Pythagorean Theorem, Visually
slug: pythagorean-theorem-visually
kind: tutorial
category: math
access: free
summary: Why a² + b² = c² is true — with a proof you can see — and how to use it to measure the world.
tags: [geometry, proofs, beginner]
featured: true
author: Polymath Team
---

Every right triangle hides the same secret. Label the two short sides $a$ and $b$, and the long side opposite the right angle — the **hypotenuse** — $c$. Then:

$$
a^2 + b^2 = c^2
$$

It is one of the oldest results in mathematics, and you can *see* why it is true.

<!-- more -->

## The picture proof

Take a big square with side length $a + b$ and place four copies of your triangle inside it, one in each corner. The space left in the middle is a tilted square whose side is $c$.

Now count the area of the big square two different ways:

1. As one big square: $(a+b)^2 = a^2 + 2ab + b^2$
2. As four triangles plus the middle square: $4 \cdot \tfrac{1}{2}ab + c^2 = 2ab + c^2$

Both describe the same area, so

$$
\begin{aligned}
a^2 + 2ab + b^2 &= 2ab + c^2 \\
a^2 + b^2 &= c^2
\end{aligned}
$$

> [!TIP]
> Draw it yourself. Cut four paper triangles and slide them around inside the square — the proof clicks the moment you rearrange them.

## Famous whole-number triangles

Some right triangles have whole-number sides. They are called **Pythagorean triples**:

| a | b | c | Check |
|---|---|---|---|
| 3 | 4 | 5 | 9 + 16 = 25 |
| 5 | 12 | 13 | 25 + 144 = 169 |
| 8 | 15 | 17 | 64 + 225 = 289 |
| 7 | 24 | 25 | 49 + 576 = 625 |

Builders have used the 3-4-5 triangle for centuries to make perfect right angles with nothing but a knotted rope.

## Using it: the ladder problem

A 5 m ladder leans against a wall with its foot 3 m from the wall. How high up does it reach?

$$
h = \sqrt{5^2 - 3^2} = \sqrt{25 - 9} = \sqrt{16} = 4\text{ m}
$$

## Bonus: distance between two points

The distance formula from coordinate geometry *is* the Pythagorean theorem in disguise. For points $(x_1, y_1)$ and $(x_2, y_2)$:

$$
d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}
$$

## Practice

1. A TV screen is 48 inches wide and 27 inches tall. What is its diagonal?
2. Is a triangle with sides 6, 8 and 11 a right triangle?

**Answers:** (1) $\sqrt{48^2 + 27^2} = \sqrt{3033} \approx 55.1$ inches. (2) No — $36 + 64 = 100 \ne 121$.
