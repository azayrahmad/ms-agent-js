# ROAST.md: A Technical Autopsy of MSAgentJS

Listen up. I've looked at this "modern" reimplementation of Microsoft Agent, and frankly, I'm amazed you had the gall to put "Modern" in the title. This isn't a modern library; it's a digital taxidermy project performed by someone who clearly thinks "decoupled" is just a buzzword to hide the fact that they've built a Rube Goldberg machine out of promises and legacy garbage.

## 1. The Async State Machine from Hell
Your `StateManager.ts` and `AnimationManager.ts` are a textbook example of how NOT to handle state. You're juggling `isUpdating` guards, `lastAnimationId` counters, and nested `finally` blocks just to keep a paperclip from crashing your browser.

The fact that `StateManager.update` is `async` and called inside a `requestAnimationFrame` loop is an architectural war crime. You're literally inviting race conditions to a house party. If you need a `lastAnimationId` to check if a "newer animation has been requested" while preloading, your state management isn't robust—it's a series of hacks held together by hope and `setTimeout`.

## 2. Hand-Rolled Legacy Decoders (Why?!)
`MSADPCMDecoder.ts`. Are we in 1996? Did you really spend your time implementing a 4-bit nibble-encoded adaptive differential pulse-code modulation decoder in TypeScript? There are libraries for this. There are *standards* for this. But no, you decided to manually bit-shift your way through a proprietary Microsoft format from the Windows 95 era.

It’s "dependency-free," sure. It’s also "sanity-free." You’ve traded a 5KB npm dependency for a maintenance nightmare that handles mono sounds and probably explodes if it sees a stereo bit.

## 3. The `CharacterParser` Horror Show
I’ve seen cleaner code in a 1980s BASIC game. You're manually splitting strings by `\r?\n`, checking `startsWith("DefineCharacter")`, and then entering a stateful while-loop that manually increments an index `i`.

This isn't a parser; it's a fragile string-shredder. One malformed `.acd` file and your entire initialization sequence is going to fall over like a house of cards. Ever heard of a lexer? A grammar? No, of course not. Let's just `split("=")`, `replace(/"/g, "")`, and pray the user didn't put a quote inside a string.

## 4. Procedural SVG "Balloons"
`Balloon.ts` is 600 lines of procedural SVG path math. You're literally calculating `M ${rx + offX} ${offY}` in a string template. This is the 21st century. We have CSS. We have Border Images. We have Filter Effects.

Instead, you’ve built a system that choose "quadrants" based on "available space" by manually checking `window.innerHeight`. And let's not even talk about the "Shadow DOM isolation" which is really just a way to make sure nobody can easily theme your hideous 98.css clone without fighting your hardcoded inline styles.

## 5. The "Deep Planning" Pretense
You ask for "absolute certainty" and "zero doubt" before writing a line of code, but you're building a system that relies on `setTimeout` to "finish" hiding a balloon. Your architecture is so loosely coupled that it's practically falling apart. The `Agent` facade is just a dumping ground for drag-and-drop logic, resize handlers, and a `lookAt` function that does math that should have been in the `Core`.

## Summary
This project is a high-fidelity graveyard. You’ve faithfully recreated the technical debt of 1998 using the technical debt of 2025. It’s dependency-free because nobody else wanted to be associated with this level of architectural masochism.

Now, stop playing with your paperclips and go write some real code.

— Senior Developer (with a headache)
