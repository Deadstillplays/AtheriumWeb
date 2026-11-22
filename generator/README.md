# Atherium Website (Built in Atherium)

Static site generator written 100% in Atherium (`website/build.ath` + `website/lib/html.athlib`).

## Build

From the repository root:

```bash
./website/build.sh
```

Or compile to a standalone native Linux x86-64 ELF64 binary and run it:

```bash
./Atherium/build/atherium native --allow-io --lib Atherium/lib --lib website/lib website/build.ath -o website/sitegen
./website/sitegen
```

## Output (`website/site/`)

- `index.html` — main page (Introduction, Installation & how to use, Libraries link, Atherium Studio AppImage download, TOS / Licence)
- `libraries.html` — auto-generated from `Atherium/lib/*.athlib` with direct `.athlib` downloads (`libs/*.athlib`) and links to `https://github.com/Deadstillplays/Atherium`
- `license.html` — verbatim `Atherium/LICENSE` read at build time
- `style.css`, `assets/*.png`, `libs/*.athlib`
