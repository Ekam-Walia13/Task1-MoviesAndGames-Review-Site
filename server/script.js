document.addEventListener('DOMContentLoaded', () => {
    const createCarousel = (carouselId, leftArrowId, rightArrowId) => {
        const carousel = document.getElementById(carouselId);
        const leftArrow = document.getElementById(leftArrowId);
        const rightArrow = document.getElementById(rightArrowId);
        let currentIndex = 0;

        const items = carousel.children;
        const totalItems = items.length;
        const itemsToShow = 5;
        const step = 1;

        const updateCarousel = () => {
            for (let i = 0; i < totalItems; i++) {
                items[i].style.display = 'none';
            }
            for (let i = currentIndex; i < currentIndex + itemsToShow; i++) {
                items[i % totalItems].style.display = 'block';
            }
        };

        leftArrow.addEventListener('click', () => {
            currentIndex = (currentIndex - step + totalItems) % totalItems;
            updateCarousel();
        });

        rightArrow.addEventListener('click', () => {
            currentIndex = (currentIndex + step) % totalItems;
            updateCarousel();
        });

        updateCarousel();
    };

    createCarousel('movies-carousel', 'movies-left-arrow', 'movies-right-arrow');
    
});
