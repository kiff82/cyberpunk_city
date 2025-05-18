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

## Customizing the commercial video

The neon billboard loads its video from the `assets/megacorp_commercial`
directory. Any MP4 files placed in that folder are detected automatically and
rotated one after another while the scene runs. The file list is refreshed after
each clip ends, so you can drop new videos into the folder and they will start
appearing without reloading the page.


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

