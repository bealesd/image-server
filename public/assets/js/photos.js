import { Utilities } from './utilities.js';
// todo, resizing the screen stops new images being fetched
// listen to page resizes, then recalculate calculateViewableThumbnails()
export class Photos {
    photosPerColumn = 1;
    startIndex = 0;

    active = true;

    scrollY = {
        current: 0,
        max: 0,
        ticking: true
    };

    photoControlsContainerHtml = `<div class="photos-container"></div>`;

    constructor(containerElement) {
        this.container = containerElement;
    }

    load() {
        this.active = true;
        this.container.innerHTML = this.photoControlsContainerHtml;

        this.photosContainer = document.querySelector('.photos-container');

        this.loadPage();
        this.registerEventListeners();
    }

    unload() {
        this.active = false;
        this.container.innerHTML = '';

        this.unregisterEventListeners();
    }

    registerEventListeners() {
        document.addEventListener('scroll', async () => {
            if(this.scrollY.ticking){
                console.log('ticking');
                return;
            }

            const previousScrollY = this.scrollY.current;
            this.scrollY.current = window.scrollY;

            const actualMaxScrollHeight = document.body.scrollHeight - window.innerHeight;

            if (this.scrollY.current > previousScrollY && this.scrollY.current > this.scrollY.max && (actualMaxScrollHeight - this.scrollY.current) < 100){
                this.scrollY.max = this.scrollY.current;
                console.log('get images');
                this.updatePage();
            }
            else {
                console.log('dont get images');
            }
        });
    }

    unregisterEventListeners(){
        // todo, unregister scroll event
    }

    calculateViewableThumbnails() {
        // the number of thumbnails that can be shown on page
        const usedHeight = document.body.offsetHeight
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        const availableHeight = windowHeight - usedHeight;
        const availableWidth = windowWidth;

        const thumbnailHeight = Utilities.getCSSVariable('thumbnail-total-height');
        const thumbnailWidth = Utilities.getCSSVariable('thumbnail-total-width');
        const thumbnailMargin = Utilities.getCSSVariable('thumbnail-margin');

        return {
            rows: Math.ceil(availableHeight / (thumbnailHeight + thumbnailMargin * 2)),
            columns: Math.floor(availableWidth / (thumbnailWidth + thumbnailMargin * 2))
        }
    }

    async loadPage() {
        let viewableThumbnails = this.calculateViewableThumbnails();
        this.startIndex = 0;
        this.photosPerColumn = viewableThumbnails.columns > 0 ? viewableThumbnails.columns : 1;

        const rows = viewableThumbnails.rows > 0 ? viewableThumbnails.rows : 1;

        let endIndex = rows * this.photosPerColumn;

        let result = await this.getImages(this.startIndex, endIndex);
        this.startIndex = endIndex;

        this.drawImages(result);
    }

    async updatePage() {
        let endIndex = this.startIndex + 1 * this.photosPerColumn;

        let result = await this.getImages(this.startIndex, endIndex);
        this.startIndex = endIndex;

        this.drawImages(result);
    }

    async getImages(startIndex, endIndex) {
        this.scrollY.ticking = true;

        let req = await fetch(`./images?startIndex=${startIndex}&endIndex=${endIndex}`);
        let images = await req.json();

        this.scrollY.ticking = false;

        return images;
    }

    createThumbnail(id, name) {
        return `<div class="thumbnail" onclick="window.open('image?id=${id}')">
                    <div class="image">
                        <img src="image?id=${id}" alt="${name}" title="${id}">
                    </div>
                    <div class="desc">${name}</div>
                </div>`;
    }

    drawImages(images) {
        if (!this.active) return;

        let content = '';
        images.forEach((img) => {
            let imageDiv = this.createThumbnail(img.id, img.name);
            content += imageDiv;
        })
        this.photosContainer.innerHTML += content;
    }
}
