---
title: Calculus in a Weekend
slug: calculus-in-a-weekend
kind: ebook
category: math
access: premium
price_credits: 15
summary: Limits, derivatives and integrals explained with intuition first — a complete short course in five chapters.
tags: [calculus, ebook, intermediate]
featured: true
author: Polymath Team
---

Calculus is the mathematics of change. Speed is the change in distance; acceleration is the change in speed; the area under a curve adds up infinitely many tiny changes. This short ebook gives you the core ideas in a weekend — intuition first, formulas second.

<!-- more -->

## Chapter 1 · Limits

A **limit** asks: *what value does $f(x)$ approach as $x$ gets closer and closer to some number?* We write

$$
\lim_{x \to a} f(x) = L
$$

The function does not even need to be defined at $a$. A classic example:

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1
$$

Plug in $x = 0$ and you get $\tfrac{0}{0}$, which is meaningless — yet values like $x = 0.01$ give $0.99998\ldots$. The limit captures where the function is *heading*.

> [!NOTE]
> Limits are the foundation everything else is built on. If a definition later looks scary, look for the limit hiding inside it.

## Chapter 2 · Derivatives

The **derivative** measures instantaneous rate of change — the slope of the curve at a single point:

$$
f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}
$$

You rarely compute it from the definition. A handful of rules cover most cases:

| Rule | Formula |
|---|---|
| Power | $\dfrac{d}{dx} x^n = n x^{n-1}$ |
| Sum | $(f + g)' = f' + g'$ |
| Product | $(fg)' = f'g + fg'$ |
| Chain | $\dfrac{d}{dx} f(g(x)) = f'(g(x))\, g'(x)$ |

**Example.** If a ball's height is $h(t) = 20t - 5t^2$ metres, its velocity is $h'(t) = 20 - 10t$. It stops rising when $h'(t) = 0$, at $t = 2$ seconds, reaching $h(2) = 20$ metres.

## Chapter 3 · Integrals

An **integral** adds up infinitely many infinitely thin slices. The definite integral is the signed area under a curve:

$$
\int_a^b f(x)\,dx
$$

The **Fundamental Theorem of Calculus** connects integrals to derivatives: if $F'(x) = f(x)$, then

$$
\int_a^b f(x)\,dx = F(b) - F(a)
$$

**Example.** The area under $y = x^2$ from 0 to 3:

$$
\int_0^3 x^2\,dx = \left[\frac{x^3}{3}\right]_0^3 = \frac{27}{3} - 0 = 9
$$

## Chapter 4 · Applications

**Optimization.** You have 20 m of fence and want the largest rectangular pen. With width $x$, the length is $10 - x$ and the area is

$$
A(x) = x(10 - x) = 10x - x^2, \qquad A'(x) = 10 - 2x
$$

Setting $A'(x) = 0$ gives $x = 5$: a $5 \times 5$ square with area $25\text{ m}^2$.

**Motion.** Integrate velocity to get distance travelled; differentiate position to get velocity. The two operations undo each other.

## Chapter 5 · Where to go next

- Practise derivatives until the rules are automatic.
- Learn **u-substitution** and **integration by parts** — the integral versions of the chain and product rules.
- Explore **differential equations**, which describe everything from population growth to circuits.

> [!TIP]
> Fifteen minutes a day beats a three-hour cram. Calculus rewards repetition.
