---
title: Thoughts on AI Generated Demo Code
date: 2026-04-14
tags:
  - ai
  - demo-code
  - writing
description: Thoughts on using AI to generate demo code, and why simpler, more readable examples often beat production-style defensiveness.
---

*Originally published as a gist: [gabriel-ing/c31acb5acd095eb436b261208fe8a945](https://gist.github.com/gabriel-ing/c31acb5acd095eb436b261208fe8a945).*

## Some thoughts on using AI for Demo code

I have never written a line of true production code in my life. Before starting my role in Developer Relations, I worked on a lot of personal projects, portfolio projects, and one small to medium size open source Python project with a few stars on github (16 last time I checked). I am not coming from this as a hardcore software developer but I do think I know more than my background might suggest.

Nowadays, I do a reasonable amount of writing code which I want people to read, code for tutorials / demos. Like the rest of the developer world, I have been using various AI tools to write code for me, which I have very much enjoyed at times. One thing I have struggled with though, is that whenever AI writes code, it is incredibly difficult to read and understand what it is doing. I'll find a single function call being nested within two layers of accessory helper functions with names like `_tool_attr` which simply takes a tool, and an attribute name and returns `tool.attribute_name`. Why does this need to be a separate function?! Why can't I just use `tool.attribute_name` in line? (this is a genuine example that I currently have open on my other monitor).

I've finally realised the answer. AI has been aggressively trained to write production code. I remember a couple of years ago, when I had a part-time job labelling AI training data, that the army of data annotators were instructed to enforce stylistic preferences.

### Defensive programming

The stylistic preferences that the AI models use are generally (imho) defensive. They are used to avoid edge cases. Take the `_tool_attr` example I mentioned above:

```python
def _tool_attr(tool, name: str, default=None):
    if isinstance(tool, dict):
        return tool.get(name, default)
    return getattr(tool, name, default)
```

First it checks if the tool is a dictionary (which it knows it _should_ be, but it would be awful if it wasn't...), then it uses a `.get()` method rather than referencing directly, because then if the attribute it knows should exist, doesn't exist, it will avoid an error.

This all makes sense **in production code**, you want to avoid errors due to assuming the object looks how you are expecting.

### Where this breaks down

As I mentioned at the start, I write code that I want people to read. Its not hidden away in a server as part of a background library, its code which I am encouraging people to read and understand. I find myself having to fight against the agents which have been aggressively trained to write as defensively as possible.

Frankly, I don't care about edge cases. Its a demo, it needs to be robust enough to show people how it works, **and no more robust**. Why? because `print(tool.name)` is a lot easier to understand than:

```python
def _tool_attr(tool, name: str, default=None):
    if isinstance(tool, dict):
        return tool.get(name, default)
    return getattr(tool, name, default)

# -----------------
# 100 lines of code
# -----------------

print(_tool_attr(tool, "name", default="AttrNotFound"))
```

Its like how when people start learning Python, they will start with a file containing just `print("Hello, World!")`. They don't start with:

```python
def main():
  print("Hello, World!")

if __name__=="__main__":
  main()
```

Why? Because it overcomplicates things. It makes code hard to read and hard to understand.  Beginners would see that file and think "Its lesson 1 and I already don't understand 3 different concepts".

### Fighting back

The bit I find hardest, is that if I use AI to generate demo code, it feels wrong to go through simplifying it. There is good reason to use `getattr()` over referring to it directly because it won't stop the whole script if the attribute doesn't exist. I don't want to deliberately make the code worse.

The result is code that looks over-complicated. Code that gives you a headache after 10 minutes of mapping out what the utility functions do. Code that is designed for robust systems where the cost of unhandled errors is great. Code that is designed to be read by the developers, but not by anyone else.

So this article is an acknowledgement of a deliberate choice. When writing demo code, I will shamelessly simplify. I will not care about edge cases. I will use `tool.attribute_name`, I won't aggressively type hint or use pydantic classes for everything. I will not focus on test cases. I will write code which is good for the intended purpose i.e. code that can be read by people who want to understand it.

And if I want to use AI to write demo code? Maybe I'll make a skill for that...
