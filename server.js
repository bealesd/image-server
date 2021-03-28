const express = require('express')
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const HTMLParser = require('node-html-parser');
const glob = require('glob');

function getDirectories(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(v => v.isDirectory()).map(v => [dir, v.name].join(path.sep));
}

function getDirectoryListing(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).map(file => file.name);
}

function getDirectoriesRecursive(dir) {
    return [dir, ...getDirectories(dir).map(getDirectoriesRecursive).flat()];
}

class BuildPages {
    getImages(startIndex, number) {
        const images = glob.sync("public/assets/images/*.jpg");
        const imagesHtml = [];
        
        if(startIndex < 0 || startIndex > images.length -1 ){
            return null;
        }

        let endIndex = (startIndex + number) < images.length ? startIndex + number : images.length;

        for (let i = startIndex; i < endIndex; i++) {
            const image = images[i];
            const pathParts = path.normalize(image).split(path.sep);

            const imageName = pathParts[pathParts.length - 1];
            const stats = fs.statSync(image);

            const day = stats.mtime.getDate();
            const month = stats.mtime.getMonth() + 1;
            const year = stats.mtime.getFullYear();

            imagesHtml.push(
                `<div class="responsive">
                    <div class="gallery">
                        <a target="" href="./assets/images/${imageName}">
                            <img src="./assets/images/${imageName}" alt="${imageName}" width="600" height="400">
                        </a>
                        <div class="desc">${day}/${month}/${year}</div>
                    </div>
                </div>`);

        }

        return imagesHtml;
    }
}

class Server {
    constructor(){
        this.buildPages = new BuildPages();
    }
    main() {
        const port = process.env.PORT || 8080;
        const app = express();

        app.use(cors());
        app.use(express.static(path.join(__dirname, './public')));

        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, './index.html'));
        });

        app.get('/index.html', async (req, res) => {
            try {
                const html = fs.readFileSync('index.html');

                res.writeHeader(200, { "Content-Type": "text/html" });
                res.write(html);
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/images', async (req, res) => {
            try {
                const params = req.query;
                const startIndex = parseInt(params.start);
                const number = parseInt(params.number);

                let html = this.buildPages.getImages(startIndex, number);
                if(html === null){
                    res.status(400).send('No more images!');
                }
                html = html.length > 0 ? html.join('\n') : html;

                res.writeHeader(200, { "Content-Type": "text" });
                res.write(html);
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/listDirectory', async (req, res) => {
            try {
                const params = req.query;
                const rawDir = params.dir ?? 'assets';

                const directory = [__dirname, 'public', rawDir.split(',')].flat().join(path.sep);
                const validDirectories = getDirectoriesRecursive([__dirname, 'public', 'assets'].join(path.sep), []);

                if (!validDirectories.includes(directory))
                    res.status(400).send('Invalid path');

                const files = getDirectoryListing(directory);

                res.writeHeader(200, { "Content-Type": "text" });
                res.write(JSON.stringify(files));
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.all('*', (req, res, next) => {
            const html = fs.readFileSync('error.html');

            res.writeHeader(200, { "Content-Type": "text/html" });
            res.write(html);
            res.end();
        })

        app.listen(port, () => {
            console.log(`Example app listening at http://localhost:${port}`);
        })
    }
}

new Server().main();
