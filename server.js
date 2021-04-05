const express = require('express')
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const glob = require('glob');
const ip = require("ip");

const ipAddress = ip.address();
const port = process.env.PORT || 8080;

const htmlSeparator = '/';
const imagesWhitelist = ['apng', 'avif', 'gif', 'jfif', 'jpeg', 'jpg', 'pjp', 'pjpeg', 'png', 'svg', 'webp'];

function getDirectories(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(v => v.isDirectory())
        .map(v => [dir, v.name].join(path.sep));
}

function getDirectoriesRecursive(dir) {
    return [dir, ...getDirectories(dir).map(getDirectoriesRecursive).flat()];
}

function getDirectoryListing(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .map((v) => {
            let id = path.normalize([dir, v.name].join(path.sep).replace(__dirname, '')).slice(1)
            return {
                isFile: v.isFile(),
                name: v.name,
                id: id.split(path.sep).join(htmlSeparator)
            };
        });
}

class ImageService {
    getImages(startIndex, endIndex) {      
        const images = glob.sync([__dirname, `images${path.sep}**`, `*.{${imagesWhitelist.join(',')}}`].join(path.sep));
        const imageList = [];

        if (startIndex < 0 || startIndex > images.length - 1 || endIndex <= startIndex)
            return imageList;

        endIndex = endIndex < images.length ? endIndex : images.length;

        for (let i = startIndex; i < endIndex; i++) {
            const image = path.normalize(images[i]);
            const pathParts = image.split(path.sep);

            const imageName = pathParts[pathParts.length - 1];
            const stats = fs.statSync(image);

            const day = stats.mtime.getDate();
            const month = stats.mtime.getMonth() + 1;
            const year = stats.mtime.getFullYear();

            let id = `${image.replace(`${__dirname}${path.sep}`, '')}`;
            id = id.split(path.sep).join(htmlSeparator);

            imageList.push({
                id: id,
                name: imageName,
                day: day,
                month: month,
                year: year,
                isLastImage: i === (images.length - 1)
            });
        }

        return imageList;
    }
}

class Server {
    constructor() {
        this.buildPages = new ImageService();
    }

    main() {
        const app = express();

        app.use(cors());
        app.use(express.static(path.join(__dirname, './public')));

        app.get('/image', async (req, res) => {
            try {
                const params = req.query;
                let imageId = params.id;
                imageId = imageId.replace('/', path.sep);

                const img = fs.readFileSync(imageId);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(img, 'binary');
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/images', async (req, res) => {
            try {
                const params = req.query;
                const startIndex = parseInt(params.startIndex);
                const endIndex = parseInt(params.endIndex);

                const images = this.buildPages.getImages(startIndex, endIndex);

                res.json(images);
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/listDirectory', async (req, res) => {
            try {
                // we want html '/' for path joining in result
                const params = req.query;
                const rawDir = params.dir ?? 'images';
                const directory = [__dirname, rawDir.split(htmlSeparator)].flat().join(path.sep);

                const validDirectories = getDirectoriesRecursive([__dirname, 'images'].join(path.sep), []);

                if (!validDirectories.includes(directory)) {
                    res.status(400).send('Invalid path');
                    res.end();
                    return;
                }

                const files = getDirectoryListing(directory);

                res.json(files);
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.all('*', (req, res, next) => {

            const url = path.normalize([__dirname, 'public', req.url].join(path.sep));
            if (fs.existsSync(url)) {
                res.sendFile(path.resolve(url));
                res.end();
            }

            const html = fs.readFileSync('public/error.html');

            res.writeHeader(200, { "Content-Type": "text/html" });
            res.write(html);
            res.end();
        })

        app.listen(port, () => {
            console.log(`Example app listening at http://${ipAddress}:${port} or http://localhost:${port}`);
        })
    }
}


new Server().main();
