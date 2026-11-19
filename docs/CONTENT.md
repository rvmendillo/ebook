# Publishing content

Everything readers see is managed in the **admin studio** (`apps/admin`): articles, tips, tutorials and ebooks, the subject categories, and the monetization settings.

## Content types

| Type | Use it for | Tips |
|---|---|---|
| **Tip** | A single trick or habit, 1–2 minutes | Shown in the *Quick tips* row on Home |
| **Article** | An explanation or opinion piece | |
| **Tutorial** | Step-by-step lessons with practice | Use `## Step 1`, `## Step 2` headings |
| **Ebook** | Long, multi-chapter books | Each `## Chapter …` heading becomes an entry in the reader's table of contents |

Each item has a **category** (Mathematics, Music, Programming, Science, Languages, Productivity — add your own under *Categories*, each with an icon and colour that also generates a cover when you don't upload one).

## Access and pricing

* **Free** — free readers watch one ad, then read. Premium members read ad-free.
* **Premium** — subscribers read it; others see the free preview and a paywall. Optionally set a **price in credits** so readers can own it without subscribing (leave empty for subscribers only).
* **Free preview:** everything above `<!-- more -->` (toolbar: *✂ Preview ends*). Without the marker the first ~80 words are used. The editor's *Free preview* toggle shows exactly what non-buyers see.

## Publishing

* **Save** keeps a draft. **Publish** makes it live in the app (readers get it next time the app refreshes its library — pull down on Home).
* A **publish date in the future schedules** the item — the database keeps it hidden until then.
* **Feature on the home screen** puts it in the Featured carousel.
* **Unpublish** hides it again without deleting it.

## Writing — Markdown cheatsheet

````markdown
## Section heading            ← appears in the ebook table of contents
**bold**, _italic_, [link](https://example.com), `inline code`

- bullet list
1. numbered list

| Table | Header |
|---|---|
| a | b |

> [!TIP]
> Tip / note / important / warning / caution callouts.

Inline math: the area is $\pi r^2$.

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

```python
def hello(name):
    return f"Hello, {name}!"
```

```abc
X:1
T:C major scale
M:4/4
L:1/4
K:C
C D E F | G A B c |]
```

![Diagram](https://…)          ← or use the 🖼 Image button to upload
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" allowfullscreen></iframe>
````

* **Math** uses LaTeX and is rendered to MathML — crisp at any text size, no images.
* **Code** is syntax-highlighted for 20+ languages (Python, JavaScript/TypeScript, Java, C/C++, C#, Go, Rust, Swift, Kotlin, Dart, SQL, Bash, HTML, CSS, JSON, YAML…).
* **Music** uses [ABC notation](https://abcnotation.com/wiki/abc:standard:v2.1) and is drawn as sheet music in the app (chord symbols in quotes: `"Am"[A,CE]2`).
* **Embeds** are limited to YouTube, Vimeo, Spotify, SoundCloud and CodePen; everything is sanitised before it's saved.

## Images

The *Upload cover* and *🖼 Image* buttons store files in the Supabase `media` bucket (max 10 MB) and insert the public URL. In demo mode small images are kept in the browser.

## Import, export and the starter library

*Settings → Library import & export*:

* **Export JSON** — a full backup (categories, items, text, settings).
* **Import JSON** — adds items whose slug doesn't exist yet; nothing is overwritten.
* **Load starter library** — the 13 sample items from [`/content`](../content).

The sample content lives in [`content/samples/*.md`](../content/samples) as Markdown with front matter. After editing it run `npm run content` in `apps/admin` — it regenerates the app's offline demo library and `supabase/seed.sql` (CI checks they're in sync).

## Readers & sales

*Readers & sales* lists active subscriptions, owned items and the credit ledger (purchases, spending, refunds, gifts). Use **Gift credits** to compensate a reader or run a promotion — you need their reader id (shown in Supabase → Authentication → Users).
