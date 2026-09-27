# Design

## Audio

Each UI state has a sound built from three notes. The notes play one after another, with no gap, the same way **Play Sequence** plays them. Every value below matches a control in the app, so to recreate a sound, add its three notes in order and press Play Sequence.

### Principles

- **Short.** A whole sound stays under about 0.5 s so it never gets in the way of the next action.
- **Quiet by default.** Gain stays at 0.25 or below. The more often a sound plays, the quieter it is.
- **Pitch direction carries meaning.** Rising means something went well, falling means attention is needed, and small steps mean a light touch.
- **Soft edges.** Brighter waveforms (triangle, square) go through a lowpass filter so they don't sound harsh.

### States

#### Success

A rising major chord (C–E–G). Bright and resolved, and the last note rings slightly longer.

| # | Note | Frequency | Oscillation | Gain | Time limit | Pan | Filter | Echo |
|---|------|-----------|-------------|------|------------|-----|--------|------|
| 1 | C5 | 523 Hz | triangle | 0.20 | 0.10 s | center | lowpass 3000 Hz, Q 1 | off |
| 2 | E5 | 659 Hz | triangle | 0.20 | 0.10 s | center | lowpass 3000 Hz, Q 1 | off |
| 3 | G5 | 784 Hz | triangle | 0.22 | 0.25 s | center | lowpass 3000 Hz, Q 1 | mix 0.25, time 0.12 s, feedback 0.3 |

Total: about 0.45 s, plus a short echo tail.

#### Warning

Two firm notes, then a drop (A–A–F). Lower and heavier than success, so it gets attention without sounding like an error.

| # | Note | Frequency | Oscillation | Gain | Time limit | Pan | Filter | Echo |
|---|------|-----------|-------------|------|------------|-----|--------|------|
| 1 | A4 | 440 Hz | square | 0.15 | 0.10 s | center | lowpass 1800 Hz, Q 1 | off |
| 2 | A4 | 440 Hz | square | 0.15 | 0.10 s | center | lowpass 1800 Hz, Q 1 | off |
| 3 | F4 | 349 Hz | square | 0.18 | 0.25 s | center | lowpass 1800 Hz, Q 1 | off |

Total: about 0.45 s. Notes 1 and 2 have the same pitch, so only the app's quick fade between notes separates them. For a clearer "da-da" rhythm, add a silent note (gain 0, 0.05 s) between them to act as a rest.

#### Hover

A tiny upward flick (A5–C#6–E6). It plays often, so it's very short and very quiet. It should be felt more than heard.

| # | Note | Frequency | Oscillation | Gain | Time limit | Pan | Filter | Echo |
|---|------|-----------|-------------|------|------------|-----|--------|------|
| 1 | A5 | 880 Hz | sine | 0.05 | 0.05 s | center | none | off |
| 2 | C#6 | 1109 Hz | sine | 0.05 | 0.05 s | center | none | off |
| 3 | E6 | 1319 Hz | sine | 0.04 | 0.05 s | center | none | off |

Total: about 0.15 s. Keep hover without echo so quick movements between buttons don't pile up.

### Notes

- Time limits under about 0.05 s are close to the app's 10 ms fade-in and 20 ms fade-out, so very short notes sound more like clicks than tones. That suits hover, but keep other states at 0.10 s or longer.
