# TCS AI WisdomNext™ — Introduction Video Agent Brief

> **Purpose:** Create a polished, enterprise-grade introduction video explaining TCS AI WisdomNext™ using the official TCS reference page. Use the already-installed **HyperFrames skill** as the primary video authoring/rendering workflow, and use the **motion-graphics** skill for appropriate timed motion-graphic B-roll where it fits the project.
>
> **Output:** 16:9, 1920×1080 (1080p), 60 fps, with readable subtitles and gentle melodic background music.

## 1. Reference material

- Official product reference: https://www.tcs.com/what-we-do/services/artificial-intelligence/solution/enterprise-generative-ai-adoption-wisdomnext
- HyperFrames repository: https://github.com/heygen-com/hyperframes
- Motion-graphics repository: https://github.com/Barty-Bart/motion-graphics

Treat the TCS page as the source of truth for product claims, terminology, and messaging. Re-open it before writing final copy in case the page has changed. The video should be an original, concise explainer inspired by the content—not a copy of the webpage or an imitation of a TCS corporate film.

## 2. Agent operating instructions

1. **Use the installed skills first.** Load/read the locally installed HyperFrames skill instructions (especially `/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry`, and `/media-use`, as available in this agent environment). Do not assume slash-command spelling or CLI arguments: follow the installed skill docs.
2. Inspect the installed `hyperframes` CLI version and its supported options. Check the current project files before changing them.
3. Use HyperFrames as the source of truth for the composition and deterministic frame rendering. Author video scenes in HTML/CSS with seekable, time-driven animations. Use the supported HyperFrames CLI to initialize only if a project does not already exist, preview, validate, and render.
4. Use the motion-graphics skill only where its actual documented workflow fits. The repository's `motion-broll` skill is designed to plan/render transcript-timed B-roll from a video and transcript; it is not a replacement for the main HyperFrames composition. If the project does not have source footage, create matching original motion-graphic sequences inside HyperFrames rather than inventing a source-video input for `motion-broll`.
5. Use the HyperFrames registry for existing title, transition, caption, chart, or overlay patterns before hand-authoring similar components. Adapt the visual system consistently.
6. Do not reinstall tools that are already installed. If a required command or skill is missing, report it clearly and use the nearest supported workflow; do not silently fake a successful render.
7. Use local assets whenever available. Keep a clear `assets/` folder for licensed music, fonts, logo assets, and any approved visuals. Do not hotlink fragile assets for the final render.
8. Keep all animation deterministic and seekable: a frame rendered at time *t* must look the same no matter which frame was rendered before it. Avoid runtime randomness, wall-clock-dependent state, and non-seekable CSS-only effects unsupported by the rendering engine.
9. Build, preview, lint/check, render, then inspect key frames and the exported file. Fix clipping, overlap, subtitle timing, transition discontinuities, audio ending, or typography issues before considering the task complete.
10. Do not claim the final output meets 60 fps unless the rendered file's actual frame rate has been inspected with a media probe such as `ffprobe` (if installed). Report any tool limitation honestly.

## 3. Creative direction

**Working title:** “From Generative AI Pilots to Enterprise Impact”

**Audience:** Business leaders, technology leaders, architects, and teams exploring enterprise GenAI adoption.

**Target duration:** Approximately 75–90 seconds. Keep the pace confident and clear; do not rush the voiceover to fit too much content.

**Tone:** Modern enterprise technology, assured, intelligent, practical, and human. Explain the value clearly rather than using exaggerated sci-fi visuals or unsubstantiated claims.

**Visual language:**
- A dark navy/charcoal foundation with bright cyan/teal highlights, restrained white typography, and occasional warm accent for emphasis.
- Clean geometric compositions, layered data flows, modular cards, connected nodes, workflow diagrams, and purposeful kinetic typography.
- Use smooth, deliberate camera-like movement, strong composition, crisp edges, restrained glow, and transitions that connect one idea to the next.
- Show AI as a coordinated enterprise system: models, agents, business data, workflow orchestration, governance, and existing tools working together.
- Use realistic abstract enterprise interfaces and original diagrams. Do not fabricate screenshots of the WisdomNext product UI and present them as real.
- Avoid generic robot heads, glowing brains, floating code walls, excessive particles, or random stock-style AI imagery.
- Make every visual communicate the narration. Keep key messages readable on a 1080p display.

## 4. Product accuracy and guardrails

Describe TCS AI WisdomNext™ using language supported by the official reference. Core ideas include:
- An orchestration layer that helps organizations design, govern, deploy, and evolve AI workflows.
- Coordination of models, agents, and enterprise data across business and IT.
- Reusable agents, workflow templates, and pre-configured capabilities to help accelerate adoption.
- Governance, configurable guardrails, observability, and cost visibility.
- Integration with enterprise systems and flexible deployment options.
- Support for moving from experimentation and pilots toward secure, governed production workflows.

**Do not:**
- Promise guaranteed business outcomes, specific ROI, cost reductions, accuracy levels, or time savings unless the official reference supplies the exact verified figure and context.
- Invent customer names, endorsements, case-study statistics, certifications, features, UI screens, or product capabilities.
- Suggest that AI operates without oversight or that governance eliminates every risk.
- Imply this video is an official TCS production or use TCS logos/brand assets without an approved source and the right to use them.
- Alter the product name: use **TCS AI WisdomNext™** on first mention, then **WisdomNext™** when appropriate.
- Copy substantial webpage wording verbatim. Paraphrase while preserving meaning.

## 5. Storyboard and narration

Build around this approximate timeline. Adjust scene boundaries to match natural spoken delivery, but preserve the narrative arc. Use these narration lines as the initial script and refine only for clarity, spoken rhythm, and factual alignment.

| Time | Scene / on-screen headline | Visual direction | Voiceover |
|---|---|---|---|
| 0–7s | **AI is moving beyond the pilot.** | Start on a calm dark canvas. Small isolated model and experiment cards appear, then connect into a larger enterprise system. Quick, clean title reveal. | “Generative AI is moving fast. But turning promising pilots into trusted, enterprise-wide impact takes more than a model.” |
| 7–17s | **Meet TCS AI WisdomNext™** | Reveal the product name with a central orchestration layer. Surround it with model, agent, data, and workflow nodes. | “TCS AI WisdomNext is designed to help organizations orchestrate AI across business and technology—bringing models, agents, and enterprise data into connected workflows.” |
| 17–29s | **Design. Orchestrate. Evolve.** | A workflow assembles step-by-step: business request → agent coordination → tools and data → reviewed output. Use connected modular blocks. | “Teams can design and coordinate agentic workflows, reuse proven patterns, and evolve solutions as enterprise needs change.” |
| 29–41s | **Built for enterprise context** | Data streams connect to abstract ERP, SaaS, document, and collaboration-system cards. Show integration as a clear, structured flow. | “By connecting with existing enterprise systems and trusted data, WisdomNext helps bring AI into the processes where work already happens.” |
| 41–53s | **Governance. Visibility. Control.** | A governance layer wraps the workflow. Show policy gates, an audit trail, status indicators, and a restrained observability panel. Avoid fake dashboard metrics. | “Governance and configurable guardrails help teams apply control, while observability and cost visibility support more disciplined adoption.” |
| 53–65s | **From experimentation to production** | Separate pilot tiles consolidate into a reusable, governed workflow moving through staged checkpoints: design, validate, deploy, monitor. | “With reusable capabilities and flexible deployment options, organizations can work toward taking AI from experimentation into secure, managed production.” |
| 65–78s | **AI that works across the enterprise** | Return to the connected enterprise system. Business and IT workflows converge; the frame resolves into a strong final title. | “The opportunity is not just to use AI—but to make it useful, governable, and connected across the enterprise.” |
| 78–85s | **TCS AI WisdomNext™** | Hold a clean closing frame with the product name and a short descriptor: “Orchestrating enterprise AI adoption.” Add a small source note if appropriate. Fade music naturally. | “TCS AI WisdomNext. Orchestrating the next step in enterprise AI adoption.” |

**Timing note:** Voiceover should sound natural at a moderate pace. If the narration needs more time, let the video run longer rather than accelerating the speech unnaturally. The storyboard can become 85–95 seconds if needed.

## 6. Voice and audio direction

- Use a calm, confident, professional English voice with clear pronunciation of “TCS AI WisdomNext.”
- Prefer a natural corporate explainer delivery; avoid an overly dramatic movie-trailer style.
- Generate or record clean narration only if a supported voice tool and permitted assets are available. Do not imply that narration has been generated if it has not.
- **Music requirement: melodic background music.** Choose a tasteful, modern corporate-electronic melody with soft piano or plucks, warm pads, light rhythmic pulses, and subtle forward momentum. Instrumental only; no lyrics.
- Music should support the narration, not compete with it. Keep it quieter under speech, gently lift during visual transitions, and fade out cleanly at the end.
- Use music whose license permits the intended use, or generate original music through an available supported tool. Do not use an unlicensed commercial track.
- If sound effects are used, keep them understated and synchronized to visible transitions. Avoid constant whooshes or distracting impacts.
- Ensure audio starts and ends cleanly, with no clipped transients or abrupt cut.

## 7. Subtitle and caption requirements

Subtitles are mandatory and must be included in the final render.

- Use accurate English captions that match the spoken narration; do not use the on-screen headline as a substitute for subtitles.
- Generate timing from the final approved narration/audio. Prefer word- or phrase-level timing where practical.
- Keep each caption to one or two lines, with natural phrase breaks and comfortable reading speed.
- Use high-contrast white text with a subtle dark translucent backing or shadow. Highlight only key terms sparingly with the visual accent color.
- Place subtitles inside title-safe margins near the bottom, without covering important UI or scene elements.
- Use consistent font, size, line spacing, and positioning across scenes.
- Check punctuation, capitalization, line breaks, and product-name spelling manually.
- Export a separate `.srt` or `.vtt` caption file if the available workflow supports it, in addition to burning captions into the MP4.
- Inspect subtitles in the rendered video at full 1080p; they must be legible on a typical desktop display.

## 8. Technical delivery requirements

- **Aspect ratio:** 16:9
- **Frame size:** 1920 × 1080
- **Frame rate:** 60 fps
- **Container:** MP4
- **Video codec:** H.264 / AVC when available in the supported render pipeline
- **Audio:** AAC or another broadly compatible codec, subject to the available exporter
- **Duration:** Target approximately 75–90 seconds; let natural narration determine the final duration
- **Captions:** Burned-in English subtitles; sidecar `.srt`/`.vtt` when supported
- **Music:** Melodic instrumental background track mixed beneath narration
- **Output name:** `tcs-ai-wisdomnext-intro-1080p60.mp4`
- **Project source:** Preserve the editable HyperFrames project and assets used to generate the final video

HyperFrames often uses defaults that may differ from the requested frame rate. Do not accept a 30 fps default silently. Inspect the installed CLI and skill documentation for the supported frame-rate/render settings. Configure the project/render pipeline to 60 fps if supported, and verify the exported file with `ffprobe` or an equivalent probe. If 60 fps is not supported by the current render path, do not fake the metadata; state the limitation and use an honest supported workflow to reach a genuine 60 fps export.

## 9. Suggested project organization

Follow the structure recommended by the installed HyperFrames version. Keep the following assets organized where compatible with that structure:

```text
tcs-ai-wisdomnext-intro/
├── index.html                 # Root composition, per installed HyperFrames conventions
├── compositions/               # Scene compositions if used by this project
├── assets/
│   ├── audio/
│   │   ├── narration.*
│   │   └── melody-background.*
│   ├── captions/
│   │   ├── narration.srt
│   │   └── narration.vtt
│   ├── images/
│   └── fonts/
├── storyboard.md               # Final scene breakdown and timing
├── script.md                   # Approved spoken narration
└── output/
    └── tcs-ai-wisdomnext-intro-1080p60.mp4
```

This is a suggested organization, not a demand to override a scaffold generated by the installed CLI. Preserve any required HyperFrames project files and conventions.

## 10. Production workflow

### Phase A — Inspect and plan
1. Read the installed HyperFrames and relevant motion-graphics skill instructions.
2. Check current project status, CLI version, installed skills, available fonts, FFmpeg, voice/media tools, and render options.
3. Review the official TCS page and confirm product wording and claims.
4. Finalize a timed narration script and storyboard before implementing the video.
5. Identify asset sources and confirm their licenses.

### Phase B — Create and animate
1. Initialize a HyperFrames project only if one does not already exist.
2. Establish the scene dimensions, design tokens, typography, safe areas, and visual hierarchy.
3. Create the scenes above using HTML/CSS and supported seekable animation tools.
4. Use the HyperFrames registry where appropriate for captions, titles, transitions, panels, diagrams, or overlays.
5. Add narration, licensed melodic music, and subtitle tracks/caption elements.
6. Use the motion-graphics B-roll skill only if there is real source footage and a finalized transcript that suits its documented workflow. Otherwise, make original motion-graphics scenes directly in HyperFrames.

### Phase C — Validate and render
1. Run the HyperFrames project's supported check/lint command; resolve the reported issues.
2. Preview the whole video and review each scene at its entry, middle, and exit.
3. Inspect captions, line breaks, spelling, safe margins, scene pacing, and transition continuity.
4. Confirm narration is clear above music; fade music smoothly at both ends where appropriate.
5. Render with the supported HyperFrames CLI using explicit 1920×1080 and 60 fps settings if available.
6. Probe the exported MP4 for dimensions, frame rate, duration, video codec, and audio stream.
7. Inspect the opening, each scene transition, subtitle-heavy moments, and end card from the final exported MP4.
8. Correct any defects and re-render.

### Phase D — Deliver
Provide:
- `tcs-ai-wisdomnext-intro-1080p60.mp4`
- The editable HyperFrames project source
- Final narration script
- Subtitle file (`.srt` or `.vtt`) if generated
- A short validation summary containing actual dimensions, actual fps, duration, audio/caption status, and any limitations

Do not report a step as completed unless it was actually executed. Clearly identify missing media or unsupported features rather than substituting placeholders without disclosure.

## 11. Final quality checklist

- [ ] Product name is correct and claims are supported by the TCS reference.
- [ ] Opening quickly establishes the enterprise adoption challenge.
- [ ] Story flows from orchestration to integration, governance, and production adoption.
- [ ] Every scene has a clear visual purpose and readable hierarchy.
- [ ] Motion is smooth, controlled, deterministic, and coherent.
- [ ] Melodic instrumental background music is present, appropriately licensed, and mixed quietly under narration.
- [ ] English subtitles match the final narration and remain legible at 1080p.
- [ ] Closing title is held long enough to read.
- [ ] Export is 1920×1080, 16:9, and verified at 60 fps.
- [ ] MP4 audio plays correctly and ends cleanly.
- [ ] Rendered video has been previewed and key frames inspected.
- [ ] Editable project and final deliverables are saved in the output location.

## Source links

- TCS AI WisdomNext™: https://www.tcs.com/what-we-do/services/artificial-intelligence/solution/enterprise-generative-ai-adoption-wisdomnext
- HyperFrames GitHub: https://github.com/heygen-com/hyperframes
- HyperFrames quickstart: https://hyperframes.heygen.com/quickstart
- HyperFrames documentation: https://hyperframes.heygen.com/introduction
- Motion-graphics GitHub: https://github.com/Barty-Bart/motion-graphics
