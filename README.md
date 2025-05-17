# Cyberpunk City

This project renders a Three.js scene with a drone flying through a neon cityscape.

## Running the project

Modern browsers require ES modules to be served over HTTP. If you open `index.html` directly with the `file://` protocol, the import map in the HTML file will not resolve the modules and the page will fail to load. To view the project correctly, serve the directory through a local web server and then visit the page via `http://localhost`.

### Using Python

If you have Python 3 installed, run the following command in the repository root:

```bash
python3 -m http.server
```

This starts a server at [http://localhost:8000](http://localhost:8000). Open that URL in your browser and select `index.html`.

### Using Node.js (optional)

If you prefer Node.js, install the `serve` package and use it to host the files:

```bash
npx serve
```

## Development

All code is contained in `index.html` and the `src/` directory. No build step is required.

