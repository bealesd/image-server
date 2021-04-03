

export class Photos {
    photosPerPage = 10;
    photosCurrentPage = 1;

    photoControlsHtml = `
        <div id="photoControls" class="hidden">
            <h1 id="pageNumber"></h1>
            <button class="green-button" id="back">Back</button>
            <button class="green-button" id="next">Next</button>
        </div>
    `;

    constructor(containerElement) {
        this.containerElement = containerElement;
    }

    open() {
        this.container.innerHTML = photoControlsHtml;
        photoControls = document.querySelector('#photoControls');

        this.backButton = document.querySelector('#back');
        this.nextButton = document.querySelector('#next');
    }

    callback() {
        printPageNumber();

        let result = await getImages(getPhotosStartIndex(), getPhotosEndIndex());
        drawImages(result);

        updatePhotoControls(result);


    }

    printPageNumber() {
        document.querySelector('#pageNumber').innerHTML = `Page: ${photosCurrentPage}`;
    }

    updatePageNumber(option) {
        if (option.direction === 'next') {
            photosCurrentPage++;
        }
        else if (option.direction === 'back') {
            photosCurrentPage--;
        }
    }

    getImages(startIndex, endIndex) {
        let req = await fetch(`./images?startIndex=${startIndex}&endIndex=${endIndex}`);
        let images = await req.json();
        return images;
    }

    updatePhotoControls(images) {
        updateBackPage();
        updateNextPage(images);
    }

    updateBackPage() {
        if (photosCurrentPage === 1) {
            backButton.disabled = true;
        }
        else if (photosCurrentPage > 1) {
            backButton.disabled = false;
        }
    }

    updateNextPage(images) {
        if (images.length === 0 || images.slice(-1)[0].isLastImage) {
            nextButton.disabled = true;
        }
        else {
            nextButton.disabled = false;
        }

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
        document.querySelector('#container').innerHTML = content;
    }

} 