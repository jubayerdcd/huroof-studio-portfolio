const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');

async function renameFolder(oldPath, newPath) {
    if (fs.existsSync(oldPath) && oldPath !== newPath) {
        console.log(`Renaming folder: ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
        fs.renameSync(oldPath, newPath);
    }
}

function seoFriendly(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getSeoName(filePath) {
    const basename = path.basename(filePath, path.extname(filePath));
    const dir = path.dirname(filePath);
    
    let seoBase = seoFriendly(basename);
    
    // Add suffixes based on parent folder context
    if (dir.includes('logo-branding') || dir.includes('logo and brandig')) {
        if (!seoBase.includes('logo-and-brand-identity')) seoBase += '-logo-and-brand-identity';
    } else if (dir.includes('packaging-works') || dir.includes('packagin works')) {
        if (!seoBase.includes('packaging-design')) seoBase += '-packaging-design';
    } else if (dir.includes('artworks')) {
        if (!seoBase.includes('calligraphy-artwork')) seoBase += '-calligraphy-artwork';
    }
    
    seoBase = seoBase.replace(/-+/g, '-');
    return seoBase;
}

const replacements = new Map();

function getFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, filesList);
        } else {
            filesList.push(fullPath);
        }
    }
    return filesList;
}

async function run() {
    renameFolder(
        path.join(assetsDir, 'revisions', 'works', 'logo and brandig'), 
        path.join(assetsDir, 'revisions', 'works', 'logo-branding')
    );
    renameFolder(
        path.join(assetsDir, 'revisions', 'works', 'packagin works'), 
        path.join(assetsDir, 'revisions', 'works', 'packaging-works')
    );
    renameFolder(
        path.join(assetsDir, 'animaion layers'), 
        path.join(assetsDir, 'animation-layers')
    );
    renameFolder(
        path.join(assetsDir, 'revisions', 'Client Logos'), 
        path.join(assetsDir, 'revisions', 'client-logos')
    );
    renameFolder(
        path.join(assetsDir, 'final outcome carholder images'), 
        path.join(assetsDir, 'final-outcome-carholder-images')
    );

    const allFiles = getFiles(assetsDir);
    
    for (const file of allFiles) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.jfif', '.mp4'].includes(ext)) {
            const dir = path.dirname(file);
            const seoBase = getSeoName(file);
            let newExt = ext;
            let convertToWebP = false;
            
            if (['.jpg', '.jpeg', '.png', '.jfif'].includes(ext)) {
                newExt = '.webp';
                convertToWebP = true;
            }
            
            const newFilename = seoBase + newExt;
            const newPath = path.join(dir, newFilename);
            
            const oldRelativePath = file.replace(__dirname + path.sep, '').replace(/\\/g, '/');
            const newRelativePath = newPath.replace(__dirname + path.sep, '').replace(/\\/g, '/');
            
            let originalRelativePath = oldRelativePath
                .replace('logo-branding', 'logo and brandig')
                .replace('packaging-works', 'packagin works')
                .replace('animation-layers', 'animaion layers')
                .replace('client-logos', 'Client Logos')
                .replace('final-outcome-carholder-images', 'final outcome carholder images');
                
            replacements.set(originalRelativePath, newRelativePath);
            
            if (newPath !== file) {
                if (convertToWebP) {
                    console.log(`Compressing: ${path.basename(file)} -> ${newFilename}`);
                    await sharp(file).webp({ quality: 80, effort: 6 }).toFile(newPath);
                    fs.unlinkSync(file);
                } else {
                    console.log(`Renaming: ${path.basename(file)} -> ${newFilename}`);
                    fs.renameSync(file, newPath);
                }
            }
        }
    }
    
    const targetFiles = [
        path.join(__dirname, 'index.html'), 
        path.join(__dirname, 'works.html'),
        path.join(__dirname, 'css', 'style.css'),
        path.join(__dirname, 'js', 'main.js')
    ];
    
    for (const target of targetFiles) {
        if (!fs.existsSync(target)) continue;
        console.log(`Updating HTML/CSS/JS references in: ${path.basename(target)}`);
        let content = fs.readFileSync(target, 'utf8');
        
        const keys = Array.from(replacements.keys()).sort((a, b) => b.length - a.length);
        
        for (const oldPath of keys) {
            const newPath = replacements.get(oldPath);
            const oldPathEncoded = oldPath.split('/').map(encodeURIComponent).join('/');
            
            content = content.split(oldPath).join(newPath);
            content = content.split(oldPathEncoded).join(newPath);
        }
        
        fs.writeFileSync(target, content);
    }
    
    console.log("Optimization successfully completed.");
}

run().catch(console.error);
