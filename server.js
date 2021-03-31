const express = require('express')
const fs = require('fs');
const cors = require('cors');
const path = require('path');
// const HTMLParser = require('node-html-parser');
const glob = require('glob');
const ip = require("ip");

const ipAddress = ip.address();
const port = process.env.PORT || 8081;

function getDirectories(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(v => v.isDirectory()).map(v => [dir, v.name].join(path.sep));
}

function getDirectoriesRecursive(dir) {
    return [dir, ...getDirectories(dir).map(getDirectoriesRecursive).flat()];
}

function getDirectoryListing(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .map((v) => {
            return {
                isFile: v.isFile(),
                name: v.name,
                id: path.normalize([dir, v.name].join(path.sep).replace(__dirname, '')).slice(1)
            };
        });
}

class BuildPages {
    // generateConfig() {
    //     const config =
    //         `export class Config {
    //         ipAddress = '${ipAddress}';
    //         port =  '${port}';
    //     }`
    //     fs.writeFileSync([ 'public', 'assets', 'js', 'config.js'].join(path.sep), config, { flag: 'w' });
    // }

    getImages(startIndex, number) {
        const images = glob.sync([__dirname, 'images', '*.jpg'].join(path.sep));
        const imagesJson = {};

        if (startIndex < 0 || startIndex > images.length - 1) {
            return {};
        }

        let endIndex = (startIndex + number) < images.length ? startIndex + number : images.length;

        for (let i = startIndex; i < endIndex; i++) {
            const image = path.normalize(images[i]);
            const pathParts = image.split(path.sep);

            const imageName = pathParts[pathParts.length - 1];
            const stats = fs.statSync(image);

            const day = stats.mtime.getDate();
            const month = stats.mtime.getMonth() + 1;
            const year = stats.mtime.getFullYear();

            const id = `${image.replace(`${__dirname}${path.sep}`, '')}`;

            imagesJson[id] = {
                name: imageName,
                day: day,
                month: month,
                year: year
            };
        }

        return imagesJson;
    }
}

class Server {
    constructor() {
        this.buildPages = new BuildPages();
        // this.buildPages.generateConfig();
    }

    main() {
        const app = express();

        app.use(cors());
        app.use(express.static(path.join(__dirname, './public')));

        app.get('/image', async (req, res) => {
            try {
                // get image
                const params = req.query;
                const imageId = params.id;

                const img = fs.readFileSync(imageId);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(img, 'binary');
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/images', async (req, res) => {
            try {
                //list images
                const params = req.query;
                const startIndex = parseInt(params.start);
                const number = parseInt(params.number);

                let imagesJson = this.buildPages.getImages(startIndex, number);

                res.json(imagesJson);
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/listDirectory', async (req, res) => {
            try {
                // list image directory
                // return directory and if file or folder
                const params = req.query;
                const rawDir = params.dir ?? 'images';
                const directory = [__dirname, rawDir.split(',')].flat().join(path.sep);

                const validDirectories = getDirectoriesRecursive([__dirname, 'images'].join(path.sep), []);

                if (!validDirectories.includes(directory)) {
                    res.status(400).send('Invalid path');
                    res.end();
                    return;
                }
                
                const fileJson = {};
                getDirectoryListing(directory).forEach((file) => {
                    fileJson[file.id] = {
                        isFile: file.isFile,
                        name: file.name
                    }
                });

                res.json(fileJson);
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
