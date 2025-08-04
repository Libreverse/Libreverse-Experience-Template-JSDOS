import { defineConfig } from "vite";
import cssnano from "cssnano";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Custom plugin to inline external CSS, JS resources, .jsdos files, and emulator files
const inlineExternalResourcesPlugin = () => {
  return {
    name: "inline-external-resources",
    enforce: "post",
    apply: "build",
    async transformIndexHtml(html) {
      try {
        // Fetch external CSS and JS resources
        const fetchResource = async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Failed to fetch ${url}: ${response.status}`);
              return null;
            }
            return await response.text();
          } catch (error) {
            console.warn(`Error fetching ${url}:`, error);
            return null;
          }
        };

        // Fetch binary resources (like .jsdos files and WASM files)
        const fetchBinaryResource = async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Failed to fetch ${url}: ${response.status}`);
              return null;
            }
            const arrayBuffer = await response.arrayBuffer();
            
            // Use Node.js Buffer for proper base64 encoding of large files
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('base64');
          } catch (error) {
            console.warn(`Error fetching ${url}:`, error);
            return null;
          }
        };

        // Read local .jsdos files from the root directory
        const fs = await import('fs');
        const path = await import('path');
        
        const readLocalJsdosFile = async (filePath) => {
          try {
            // Remove leading slash for local file reading
            const localPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            const fullPath = path.resolve(process.cwd(), localPath);
            const fileBuffer = await fs.promises.readFile(fullPath);
            return fileBuffer.toString('base64');
          } catch (error) {
            console.warn(`Error reading local file ${filePath}:`, error);
            return null;
          }
        };

        // Scan for .jsdos files in the project root
        const scanForJsdosFiles = async () => {
          try {
            const rootFiles = await fs.promises.readdir(process.cwd());
            return rootFiles.filter(file => file.endsWith('.jsdos'));
          } catch (error) {
            console.warn('Error scanning for .jsdos files:', error);
            return [];
          }
        };

        // Extract CSS URLs from link tags
        const cssUrls = [];
        html = html.replace(
          /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g,
          (match, url) => {
            const placeholder = `CSS_PLACEHOLDER_${cssUrls.length}`;
            cssUrls.push([placeholder, url]);
            return placeholder;
          }
        );

        // Extract JS URLs from script tags
        const jsUrls = [];
        html = html.replace(
          /<script\s+src="([^"]+)"\s*><\/script>/g,
          (match, url) => {
            const placeholder = `JS_PLACEHOLDER_${jsUrls.length}`;
            jsUrls.push([placeholder, url]);
            return placeholder;
          }
        );

        // Extract .jsdos file references from JavaScript code and scan for local files
        const jsdosFiles = [];
        
        // First, scan for any .jsdos files in the project root
        const localJsdosFiles = await scanForJsdosFiles();
        console.log('Found .jsdos files in project root:', localJsdosFiles);
        
        // Extract existing .jsdos references from the HTML
        html = html.replace(
          /url:\s*["']([^"']*\.jsdos)["']/g,
          (match, filePath) => {
            const placeholder = filePath;
            jsdosFiles.push([placeholder, filePath]);
            return match;
          }
        );
        
        // If we found local .jsdos files, intelligently replace references
        if (localJsdosFiles.length > 0) {
          for (let i = 0; i < jsdosFiles.length && i < localJsdosFiles.length; i++) {
            const originalPath = jsdosFiles[i][1];
            const localFile = localJsdosFiles[i];
            
            // Try to match by filename first, otherwise use order
            const matchingFile = localJsdosFiles.find(file => 
              originalPath.endsWith(file) || originalPath.includes(file.replace('.jsdos', ''))
            ) || localFile;
            
            jsdosFiles[i][1] = matchingFile;
            console.log(`Replacing ${originalPath} with local file: ${matchingFile}`);
          }
          
          // If there are more local files than references, just use the first one for all
          if (localJsdosFiles.length === 1 && jsdosFiles.length > 0) {
            jsdosFiles.forEach((_, index) => {
              jsdosFiles[index][1] = localJsdosFiles[0];
            });
          }
        }

        // Inline CSS
        for (const [placeholder, url] of cssUrls) {
          const cssContent = await fetchResource(url);
          if (cssContent) {
            html = html.replace(placeholder, `<style>\n${cssContent}\n</style>`);
          } else {
            // Fallback to original link if fetch fails
            html = html.replace(placeholder, `<link rel="stylesheet" href="${url}">`);
          }
        }

        // Inline JS
        for (const [placeholder, url] of jsUrls) {
          const jsContent = await fetchResource(url);
          if (jsContent) {
            html = html.replace(placeholder, `<script>\n${jsContent}\n</script>`);
          } else {
            // Fallback to original script tag if fetch fails
            html = html.replace(placeholder, `<script src="${url}"></script>`);
          }
        }

        // Inline .jsdos files as base64 data URLs
        for (const [placeholder, filePath] of jsdosFiles) {
          let base64Content = null;
          
          // Try to read as local file first
          if (filePath.startsWith('/') || !filePath.startsWith('http')) {
            base64Content = await readLocalJsdosFile(filePath);
          }
          
          // If local read failed and it looks like a URL, try fetching it
          if (!base64Content && filePath.startsWith('http')) {
            base64Content = await fetchBinaryResource(filePath);
          }
          
          if (base64Content) {
            const dataUrl = `data:application/zip;base64,${base64Content}`;
            html = html.replace(`"${placeholder}"`, `"${dataUrl}"`);
          } else {
            // Fallback to original path if inline fails
            html = html.replace(`"${placeholder}"`, `"${filePath}"`);
          }
        }

        // Fetch emulators.js and add it as a script tag with id="emulators-js"
        const emulatorsJsContent = await fetchResource('https://v8.js-dos.com/latest/emulators/emulators.js');
        if (emulatorsJsContent) {
          const emulatorsScript = `<script id="emulators-js">\n${emulatorsJsContent}\n</script>`;
          html = html.replace('<head>', '<head>' + emulatorsScript);
        }

        // For other emulator files, we'll use the hijacking approach as they might be loaded differently
        const otherEmulatorFiles = {};
        for (const url of [
          'https://v8.js-dos.com/latest/emulators/wlibzip.js', 
          'https://v8.js-dos.com/latest/emulators/wlibzip.wasm',
          'https://v8.js-dos.com/latest/emulators/wdosbox.js',
          'https://v8.js-dos.com/latest/emulators/wdosbox.wasm'
        ]) {
          const filename = url.split('/').pop();
          if (filename.endsWith('.wasm')) {
            const base64Content = await fetchBinaryResource(url);
            if (base64Content) {
              otherEmulatorFiles[filename] = `data:application/wasm;base64,${base64Content}`;
            }
          } else {
            const content = await fetchResource(url);
            if (content) {
              const buffer = Buffer.from(content, 'utf8');
              otherEmulatorFiles[filename] = `data:application/javascript;base64,${buffer.toString('base64')}`;
            }
          }
        }

        // Add hijacking code for all emulator files except emulators.js
        const hijackingCode = `<script>
(function() {
  const emulatorFiles = ${JSON.stringify(otherEmulatorFiles)};
  
  console.log('Available inline emulator files:', Object.keys(emulatorFiles));
  
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    console.log('XHR Request:', url);
    
    if (typeof url === 'string') {
      // Handle wlibzip files
      if ((url.includes('wlibzip.js') || url.endsWith('wlibzip.js')) && emulatorFiles['wlibzip.js']) {
        console.log('Redirecting XHR wlibzip.js to inline version');
        url = emulatorFiles['wlibzip.js'];
      }
      if ((url.includes('wlibzip.wasm') || url.endsWith('wlibzip.wasm')) && emulatorFiles['wlibzip.wasm']) {
        console.log('Redirecting XHR wlibzip.wasm to inline version');
        url = emulatorFiles['wlibzip.wasm'];
      }
      // Handle wdosbox files
      if ((url.includes('wdosbox.js') || url.endsWith('wdosbox.js')) && emulatorFiles['wdosbox.js']) {
        console.log('Redirecting XHR wdosbox.js to inline version');
        url = emulatorFiles['wdosbox.js'];
      }
      if ((url.includes('wdosbox.wasm') || url.endsWith('wdosbox.wasm')) && emulatorFiles['wdosbox.wasm']) {
        console.log('Redirecting XHR wdosbox.wasm to inline version');
        url = emulatorFiles['wdosbox.wasm'];
      }
    }
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (resource, ...rest) {
    const url = typeof resource === 'string' ? resource : resource?.url || resource;
    console.log('Fetch Request:', url);
    
    if (typeof resource === 'string') {
      // Handle wlibzip files
      if ((resource.includes('wlibzip.js') || resource.endsWith('wlibzip.js')) && emulatorFiles['wlibzip.js']) {
        console.log('Redirecting fetch wlibzip.js to inline version');
        resource = emulatorFiles['wlibzip.js'];
      }
      if ((resource.includes('wlibzip.wasm') || resource.endsWith('wlibzip.wasm')) && emulatorFiles['wlibzip.wasm']) {
        console.log('Redirecting fetch wlibzip.wasm to inline version');
        resource = emulatorFiles['wlibzip.wasm'];
      }
      // Handle wdosbox files
      if ((resource.includes('wdosbox.js') || resource.endsWith('wdosbox.js')) && emulatorFiles['wdosbox.js']) {
        console.log('Redirecting fetch wdosbox.js to inline version');
        resource = emulatorFiles['wdosbox.js'];
      }
      if ((resource.includes('wdosbox.wasm') || resource.endsWith('wdosbox.wasm')) && emulatorFiles['wdosbox.wasm']) {
        console.log('Redirecting fetch wdosbox.wasm to inline version');
        resource = emulatorFiles['wdosbox.wasm'];
      }
    }
    return originalFetch(resource, ...rest);
  };
})();
</script>`;

        // Insert the hijacking code right after the opening <head> tag
        html = html.replace('<head>', '<head>' + hijackingCode);

        return html;
      } catch (error) {
        console.warn("External resource inlining failed:", error);
        return html;
      }
    },
  };
};

// Custom plugin to apply htmlnano
const htmlNanoPlugin = () => {
  return {
    name: "html-nano",
    enforce: "post",
    apply: "build",
    async transformIndexHtml(html) {
      try {
        const posthtml = await import("posthtml");
        const htmlnanoModule = await import("htmlnano");
        const result = await posthtml
          .default()
          .use(
            htmlnanoModule.default({
              ...htmlnanoModule.default.presets.ampSafe,
            }),
          )
          .process(html);
        return result.html;
      } catch (error) {
        console.warn("HTML minification failed:", error);
        return html;
      }
    },
  };
};

export default defineConfig({
  base: "",
  assetsInclude: "**/*.jsdos",
  plugins: [
    inlineExternalResourcesPlugin(),
    viteSingleFile({
      useRecommendedBuildConfig: false,
      removeViteModuleLoader: true,
    }),
    htmlNanoPlugin(),
  ],
  css: {
    postcss: {
      plugins: [cssnano()],
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "",
    minify: "esbuild", // Use esbuild for JS minification
    cssMinify: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
})