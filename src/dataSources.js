function GetHackerNewsText(setMessage, setSpinner, count = 30) {
    setSpinner(true);
    fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
        .then(response => response.json())
        .then(topStoryIds => {
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