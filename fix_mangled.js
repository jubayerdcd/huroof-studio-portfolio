const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');
const outDir = __dirname;
const cssDir = path.join(outDir, 'css');

// Fresh read
let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');

// 1. Extract CSS precisely
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
if (styleMatch) {
    let css = styleMatch[1].trim();
    // Only touch url()
    css = css.replace(/url\(([\'\"]?)(.*?)\1\)/g, (m, quote, innerPath) => {
        if (!innerPath.startsWith('http') && !innerPath.startsWith('data:')) {
            return `url(${quote}../assets/${innerPath}${quote})`;
        }
        return m;
    });
    fs.writeFileSync(path.join(cssDir, 'style.css'), css);
    // Remove the style block from HTML
    html = html.replace(styleMatch[0], '');
}

// 2. Extract JS precisely
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
if (scriptMatch) {
    // We already have js/main.js which was perfectly extracted. So just remove it from HTML.
    html = html.replace(scriptMatch[0], '');
}

// 3. Assemble new HTML structure safely
// Add head injections safely before </head>
const headEnd = html.indexOf('</head>');
if (headEnd !== -1) {
    const injections = `
    <!-- SEO and Performance Meta Tags -->
    <meta name="description" content="Abdullah Jubayer — Professional Calligraphy & Design Portfolio. Expert in Logo Design, Branding, Packaging, and Artworks.">
    <meta name="keywords" content="Calligraphy, Design, Logo Design, Brand Identity, Packaging Design, Abdullah Jubayer">
    <meta property="og:title" content="Abdullah Jubayer — Calligraphy & Design">
    <meta property="og:description" content="Professional Calligraphy & Design Portfolio. Explore Branding, Packaging, and Artworks.">
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="css/style.css">
`;
    html = html.substring(0, headEnd) + injections + html.substring(headEnd);
}

// Add script safe before </body>
const bodyEnd = html.indexOf('</body>');
if (bodyEnd !== -1) {
    html = html.substring(0, bodyEnd) + '    <script src="js/main.js" defer></script>\n' + html.substring(bodyEnd);
}

// Properly prefix relative paths using DOM manipulation logic or simple safe regexes
html = html.replace(/src=([\"\'])(?!http|data:|#|css\/|js\/|assets\/)([^\"\']+)[\"\']/g, (m, quote, innerPath) => {
    return `src=${quote}assets/${innerPath}${quote} loading="lazy"`;
});

// Revert loading="lazy" on logo for LCP
html = html.replace(/<img(.*?src=[\'\"]assets\/revisions\/huroof studio logo-01\.svg[\'\"]?[^>]*)loading=\"lazy\"/g, '<img$1');

fs.writeFileSync(path.join(outDir, 'index.html'), html);

console.log('Successfully repaired CSS and HTML parsing.');
