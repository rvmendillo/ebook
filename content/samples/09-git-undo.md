---
title: "Git: Undo (Almost) Anything"
slug: git-undo-almost-anything
kind: tip
category: programming
access: free
summary: The six commands that rescue you from the most common Git mistakes.
tags: [git, cheat sheet]
author: Polymath Team
---

Made a mess in Git? Find your situation below.

<!-- more -->

**Discard changes to a file you haven't staged**

```bash
git restore path/to/file
```

**Unstage a file (keep the changes)**

```bash
git restore --staged path/to/file
```

**Fix the last commit message, or add a forgotten file**

```bash
git add forgotten-file
git commit --amend
```

**Undo the last commit but keep its changes**

```bash
git reset --soft HEAD~1
```

**Undo a commit that is already pushed** (creates a new commit that reverses it)

```bash
git revert <commit-sha>
```

**Recover "lost" work**

```bash
git reflog          # find the commit you were on
git switch -c rescue <sha>
```

> [!WARNING]
> Never `reset` or `--amend` commits you have already pushed to a shared branch — use `revert` instead.
