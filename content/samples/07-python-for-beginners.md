---
title: Python for Absolute Beginners
slug: python-for-absolute-beginners
kind: ebook
category: programming
access: premium
price_credits: 15
summary: Go from zero to writing real programs. Six short chapters, plenty of examples and a mini project.
tags: [python, ebook, beginner]
featured: true
author: Polymath Team
---

Python reads almost like English, runs everywhere, and powers everything from websites to data science and AI. This ebook takes you from your very first line of code to a small program you build yourself.

<!-- more -->

## Chapter 1 · Setting up

Install Python 3 from python.org (on macOS and Linux it is often already installed). Open a terminal and start the interactive interpreter:

```bash
python3
```

Type your first line of code and press Enter:

```python
print("Hello, world!")
```

> [!TIP]
> The interpreter is a calculator too. Try `2 ** 10` or `7 / 2`.

## Chapter 2 · Variables and types

A **variable** is a name for a value:

```python
name = "Ada"          # str  — text
age = 36              # int  — whole number
height = 1.65         # float — decimal number
is_learning = True    # bool — True or False

print(f"{name} is {age} years old")
```

The `f` before the quotes makes an **f-string**: anything inside `{}` is evaluated and inserted.

## Chapter 3 · Making decisions and repeating

```python
temperature = 23

if temperature > 30:
    print("Hot!")
elif temperature > 15:
    print("Pleasant.")
else:
    print("Bring a jacket.")

for i in range(3):
    print("Lap", i + 1)

count = 3
while count > 0:
    print(count)
    count -= 1
print("Lift-off!")
```

Indentation matters in Python: the indented lines belong to the `if`, `for` or `while` above them.

## Chapter 4 · Functions

Functions package up code you want to reuse:

```python
def area_of_circle(radius: float) -> float:
    """Return the area of a circle."""
    return 3.14159 * radius ** 2

print(area_of_circle(2))   # 12.56636
```

## Chapter 5 · Lists and dictionaries

```python
scores = [72, 95, 88]
scores.append(100)
print(max(scores), sum(scores) / len(scores))   # 100 88.75

capitals = {"France": "Paris", "Japan": "Tokyo"}
capitals["Kenya"] = "Nairobi"
for country, city in capitals.items():
    print(f"The capital of {country} is {city}")
```

## Chapter 6 · Mini project: word counter

Put it all together — a program that finds the most common words in a piece of text:

```python
from collections import Counter

def top_words(text: str, n: int = 3) -> list[tuple[str, int]]:
    words = [w.strip(".,!?;:").lower() for w in text.split()]
    return Counter(w for w in words if w).most_common(n)

speech = "The more you read, the more you know. The more you know, the further you go."
print(top_words(speech))
# [('the', 4), ('you', 4), ('more', 3)]
```

> [!NOTE]
> `Counter.most_common` lists the most frequent words first; words with the same count keep the order in which they first appeared.

**Next steps:** read files with `open()`, explore the standard library, and build something you care about — a budget tracker, a quiz, a tiny game.
