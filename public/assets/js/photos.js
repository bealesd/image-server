export class Photos {
    photosPerPage = 10;
    photosCurrentPage = 1;

    photoControlsContainerHtml = `
        <div class="photo-controls-container">
            <h1 class="page-number"></h1>
            <button class="green-button" id="back">Back</button>
            <button class="green-button" id="next">Next</button>
        </div>
        <div class="photos-container"></div>
    `;

    constructor(containerElement) {
        this.container = containerElement;
    }

    load() {
        this.container.innerHTML = this.photoControlsContainerHtml;

        this.photoControlsContainer = document.querySelector('.photo-controls-container');
        this.photosContainer = document.querySelector('.photos-container');

        this.backButton = document.querySelector('#back');
        this.nextButton = document.querySelector('#next');

        this.pageNumber = document.querySelector('.page-number');

        this.loadPage();
        this.registerEventListeners();
    }

    unload(){
        this.container.innerHTML = '';
    }

    registerEventListeners() {
        this.backButton.addEventListener('click', async () => {
            this.updatePageNumber({ direction: 'back' });
            await this.loadPage();
        });

        this.nextButton.addEventListener('click', async () => {
            this.updatePageNumber({ direction: 'next' });
            await this.loadPage();
        });
    }

    async loadPage() {
        this.printPageNumber();

        let result = await this.getImages(this.getPhotosStartIndex(), this.getPhotosEndIndex());
        this.drawImages(result);

        this.updatePhotoControlsContainer(result);
    }

    printPageNumber() {
        this.pageNumber.innerHTML = `Page ${this.photosCurrentPage}`;
    }

    updatePageNumber(option) {
        if (option.direction === 'next')
            this.photosCurrentPage++;
        else if (option.direction === 'back')
            this.photosCurrentPage--;
    }

    async getImages(startIndex, endIndex) {
        let req = await fetch(`./images?startIndex=${startIndex}&endIndex=${endIndex}`);
        let images = await req.json();
        return images;
    }

    updatePhotoControlsContainer(images) {
        this.updateBackPage();
        this.updateNextPage(images);
    }

    updateBackPage() {
        if (this.photosCurrentPage === 1)
            this.backButton.disabled = true;
        else if (this.photosCurrentPage > 1)
            this.backButton.disabled = false;
    }

    updateNextPage(images) {
        if (images.length === 0 || images.slice(-1)[0].isLastImage)
            this.nextButton.disabled = true;
        else
            this.nextButton.disabled = false;
    }

    drawImages(images) {
        let content = '';
        images.forEach((img) => {
            let imageDiv = `
            <div class="responsive" onclick="window.open('image?id=${img.id}')">
                <div class="gallery">
                    <img align="middle" src="image?id=${img.id}" alt="${img.name}" title="${img.day}/${img.month}/${img.year}">
                </div>
                <div class="desc">${img.name}</div>
            </div>
            `;
            content += imageDiv;
        })
        this.photosContainer.innerHTML = content;
    }

    getPhotosStartIndex() {
        if (this.photosCurrentPage === 1)
            return 0;
        else
            return (this.photosCurrentPage - 1) * this.photosPerPage;
    }

    getPhotosEndIndex() {
        return this.getPhotosStartIndex() + this.photosPerPage;
    }
}
