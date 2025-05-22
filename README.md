# Cyberpunk City

This project renders a Three.js scene with a drone flying through a neon cityscape.

## Running the project

Modern browsers require ES modules to be served over HTTP. If you open `index.html` directly with the `file://` protocol, the import map in the HTML file will not resolve the modules and the page will fail to load. To view the project correctly, serve the directory through a local web server and then visit the page via `http://localhost`.
The scene pulls Three.js modules from the CDN at [unpkg.com](https://unpkg.com/), so an active internet connection is required. If you need to run the project completely offline, download those modules and update the import paths accordingly.


### Using Python

If you have Python 3 installed, run the following command in the repository root:

```bash
python3 -m http.server
```

This starts a server at [http://localhost:8000](http://localhost:8000). Open that URL in your browser and select `index.html`.

### Using Node.js (optional)

If you prefer Node.js, the project now includes a `package.json` with a start
script. Run the following command to serve the files:

```bash
npm start
```

The first time you run this command, install dependencies with `npm install`.

## Development

All code is contained in `index.html` and the `src/` directory. No build step is required.

## Configuration

The `CONFIG` object in `index.html` exposes various options. To disable the neon flickering effect, set:

```javascript
CONFIG.misc.ENABLE_FLICKER = false;
```

Reload the page after editing the file to see the change.

To adjust how strongly neon signs glow, tweak the bloom threshold:

```javascript
CONFIG.effects.BLOOM_THRESHOLD = 0.3; // lower values produce more bloom
```

A page reload applies the new setting.

## Customizing the commercial video

The neon billboard loads videos from `assets/megacorp_commercial`.
Each billboard randomly selects one of those MP4 files when it is created and
loops that clip independently. Replace the provided placeholders with your own
clips if desired. Edit `commercialVideoFiles` in `index.html` when using
different filenames.

## Custom player car

Add one or more `.glb` or `.ply` files to the `main_car` directory. When the
page loads, one of these models will be chosen at random and followed from a
third-person perspective. If the folder is empty or the files cannot be loaded,
a simple placeholder car is used instead.

If your model faces a different direction, adjust `CONFIG.PLAYER_CAR_ROTATION_Y`
in `index.html`. The value is in radians and defaults to `Math.PI / 2` (90°).


## Running on GitHub Pages

The project works when hosted from any subdirectory, so you can serve it via GitHub Pages. Publish the repository (or a `gh-pages` branch) using GitHub Pages and visit:

```
https://kiff82.github.io/cyberpunk_city/
```

`index.html` and the `src/` folder will load from that path. An internet connection is still required for the Three.js modules pulled from the CDN.

## Resolving Merge Conflicts

If a pull request shows "This branch has conflicts that must be resolved", you'll need to edit the files locally.

1. Run `git status` to see which files contain conflict markers like `<<<<<<<` and `>>>>>>>`.
2. Open those files and decide which changes to keep. Remove the conflict markers once the content looks correct.
3. After editing, run `git add <file>` for each resolved file and commit with `git commit`.
4. Push the updated branch and the pull request will update automatically.

