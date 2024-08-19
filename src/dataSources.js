function GetHackerNewsText(setMessage, setSpinner, count = 30) {
    setSpinner(true);
    fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
        .then(response => response.json())
        .then(topStoryIds => {
            shuffle(topStoryIds);
            const storyPromises = topStoryIds.slice(0, count).map(id => {
                return fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(response => response.json());
            });
            return Promise.all(storyPromises);
        })
        .then(stories => {
            const message = stories.map(story => story.title).join("\n");
            setMessage(message);
            setSpinner(false);
        });
}

function shuffle(array) {
    let currentIndex = array.length;
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}
