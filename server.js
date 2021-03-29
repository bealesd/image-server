const express = require('express')
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const HTMLParser = require('node-html-parser');
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
    return fs.readdirSync(dir, { withFileTypes: true }).map(v => path.normalize([dir, v.name].join(path.sep)));
}

class BuildPages {
    generateConfig(){
        const config = 
        `export class Config {
            ipAddress = '${ipAddress}';
            port =  '${port}';
        }`
        fs.writeFileSync([__dirname, 'public', 'config.js'].join(path.sep), config, {flag: 'w'});
    }

    getImages(startIndex, number) {
        const images = glob.sync([__dirname, 'images', '*.jpg'].join(path.sep));
        const imagesJson = {};
        
        if(startIndex < 0 || startIndex > images.length -1 ){
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
    constructor(){
        this.buildPages = new BuildPages();
        this.buildPages.generateConfig();
    }

    main() {
        const app = express();

        app.use(cors());
        app.use(express.static(path.join(__dirname, './public')));

        app.get('/', (req, res) => {
            try {
                res.sendFile(path.join(__dirname, './index.html'));
            } catch (error) {
                res.status(400).send(error.message);
            }
        });

        app.get('/index.html', async (req, res) => {
            try {
                res.sendFile(path.join(__dirname, './index.html'));
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/image', async (req, res) => {
            try {
                const params = req.query;
                const imageId = params.id;

                const img = fs.readFileSync(imageId);
                res.writeHead(200, {'Content-Type': 'image/jpeg' });
                res.end(img, 'binary');
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.get('/images', async (req, res) => {
            try {
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
                const params = req.query;
                const rawDir = params.dir ?? 'assets';

                const validDirectories = getDirectoriesRecursive([__dirname, 'public', 'assets'].join(path.sep), []);

                const directory = [__dirname, 'public', rawDir.split(',')].flat().join(path.sep);

                if (!validDirectories.includes(directory))
                    res.status(400).send('Invalid path');

                const baseDirectory = path.normalize([__dirname, 'public', ''].join(path.sep));

                const files = getDirectoryListing(directory).map((file)=>{
                    return file.replace(baseDirectory, '');
                });

                res.writeHeader(200, { "Content-Type": "text" });
                res.write(JSON.stringify(files));
                res.end();
            } catch (error) {
                res.status(400).send(error.message);
            }
        })

        app.all('*', (req, res, next) => {
            
            const url = path.normalize([__dirname, 'public',req.url].join(path.sep));
            if(fs.existsSync(url)){
                res.sendFile(path.resolve(url));
                res.end();
            }

            const html = fs.readFileSync('error.html');

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
