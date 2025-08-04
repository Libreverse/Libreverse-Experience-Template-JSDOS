# Libreverse Experience Template - JS-DOS

A template for creating MS-DOS code experiences using JS-DOS emulation. This template is designed to be lightweight, completely offline-capable, and builds to a single HTML file for easy deployment and distribution.

## Features

🕹️ **Full DOS Emulation** - Complete MS-DOS environment with DOSBox emulator
🎮 **Drop-in Game Support** - Simply drop any `.jsdos` file in the root directory
📦 **Single File Output** - Builds to a completely self-contained HTML file
🌐 **Offline Capable** - No external dependencies, works without internet
⚡ **Fast Loading** - All emulator components pre-loaded and inlined
🎯 **Smart Asset Management** - Automatic detection and inlining of DOS games
🔧 **Modern Build Pipeline** - Vite with advanced optimization and minification
📱 **Responsive Design** - Works on desktop and mobile browsers

## Prerequisites

- [Bun](https://bun.sh/) 1.0 or higher
- A modern web browser with WebGL support
- DOS games in `.jsdos` format

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone [repository-url]
   cd libreverse-experience-template-jsdos
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Add your DOS game:**
   ```bash
   # Replace the default game with your own .jsdos file
   cp your-game.jsdos ./
   # The build system will automatically detect and use it
   ```

4. **Start development server:**
   ```bash
   bun run dev
   ```
   This starts Vite's development server with hot module replacement.

5. **Build for production:**
   ```bash
   bun run build
   ```
   Creates a completely self-contained HTML file in the `dist` folder.

6. **Preview production build:**
   ```bash
   bun run serve
   ```
   Serves the production build locally on `http://localhost:8080`

## How It Works

The template uses a sophisticated Vite plugin system to create truly offline DOS experiences:

- **Emulator Inlining**: Downloads and embeds the entire JS-DOS emulator (emulators.js, wdosbox.js, wdosbox.wasm, etc.)
- **Asset Detection**: Automatically scans for `.jsdos` files in the project root
- **Smart Bundling**: Converts all resources to base64 data URLs for offline operation
- **Request Hijacking**: Intercepts network requests and redirects to inline content
- **Zero Dependencies**: The final HTML file requires no external resources

## Technical Architecture

### Emulator Inlining System

The template uses a custom Vite plugin that:

1. **Downloads Emulator Components**: Fetches all JS-DOS emulator files from CDN
2. **Processes Large WASM Files**: Uses chunked base64 encoding for multi-megabyte files
3. **Creates Script Tag**: Embeds `emulators.js` with `id="emulators-js"` for detection
4. **Hijacks Network Requests**: Intercepts XHR/fetch calls at runtime
5. **Redirects to Inline Content**: Maps external URLs to embedded data URLs

### File Structure

```
src/
├── index.html          # Main HTML with DOS emulator setup
├── vite.config.js      # Custom plugin for resource inlining
├── package.json        # Bun configuration and dependencies
└── *.jsdos            # DOS games (automatically detected)
```

### Supported Emulator Files

The system automatically inlines these JS-DOS components:
- `emulators.js` - Core emulator loader
- `wdosbox.js` - DOSBox emulator JavaScript
- `wdosbox.wasm` - DOSBox emulator WebAssembly (~2MB)  
- `wlibzip.js` - ZIP library JavaScript
- `wlibzip.wasm` - ZIP library WebAssembly
- `js-dos.css` - Emulator styling

## Performance

- **File Size**: Typical build ~6MB (includes full DOS emulator)
- **Load Time**: Instant offline loading after initial download
- **Memory Usage**: Optimized WASM execution
- **Compatibility**: Works in all modern browsers with WebGL support

## Use Cases

- **Code Demonstrations**: Share DOS-based coding examples
- **Retro Gaming**: Distribute classic DOS games
- **Educational Content**: Interactive DOS tutorials and lessons
- **Digital Preservation**: Archive DOS software with full context
- **Offline Experiences**: Fully functional without internet connectivity

## Deployment

The single HTML file can be deployed anywhere:

```bash
# Deploy to static hosting
cp dist/index.html /var/www/html/

# Upload to CDN
aws s3 cp dist/index.html s3://your-bucket/

# Serve from GitHub Pages
git add dist/index.html
git commit -m "Deploy DOS experience"  
git push origin main
```

## Project Features

- **Complete Offline Operation**: All emulator components embedded in final HTML
- **Automatic Game Detection**: Scans project root for `.jsdos` files automatically  
- **Advanced Inlining**: CSS, JavaScript, WASM, and game data all embedded as data URLs
- **Smart Build Pipeline**: Vite with cssnano, htmlnano, and custom resource inlining
- **Large File Handling**: Optimized base64 encoding for multi-megabyte WASM files
- **Request Interception**: Runtime hijacking of XHR/fetch for seamless offline operation
- **Fast Development**: Bun for ultra-fast package management and task running

## Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build completely self-contained HTML file  
- `bun run serve` - Preview production build locally

## Adding DOS Games

The template automatically detects and uses `.jsdos` files in the project root:

1. **Single Game**: Just drop your `.jsdos` file in the root directory
   ```bash
   cp mygame.jsdos ./
   bun run build
   ```

2. **Replace Existing**: Remove old game and add new one
   ```bash
   rm doom_shareware.jsdos
   cp quake.jsdos ./
   bun run build
   ```

3. **Multiple Games**: The system will intelligently match games to references
   ```bash
   cp game1.jsdos game2.jsdos ./
   bun run build
   ```

## Customization

- **Game Selection**: Drop any `.jsdos` file in the root - no code changes needed
- **Styling**: Modify the CSS in `index.html` to customize the interface
- **Build Settings**: Adjust optimization settings in `vite.config.js`
- **Emulator Config**: The JS-DOS emulator settings can be modified in the HTML file

## Build Output

The build process creates a single, completely self-contained HTML file that includes:

- **Inlined Emulator**: Complete DOSBox emulator (emulators.js, wdosbox.js, wdosbox.wasm)
- **Inlined Game Data**: Your `.jsdos` file converted to base64 data URL
- **Inlined Assets**: All CSS, JavaScript, and WASM files embedded
- **Runtime Hijacking**: Code to redirect network requests to inline content
- **Advanced Minification**: Optimized with cssnano, htmlnano, and esbuild

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

AGPL License, just like Libreverse.

## Acknowledgments

- [JS-DOS](https://js-dos.com/) - DOS emulation in the browser
- [DOSBox](https://www.dosbox.com/) - DOS emulator  
- [Vite](https://vitejs.dev/) - Build tooling
- [Bun](https://bun.sh/) - JavaScript runtime
