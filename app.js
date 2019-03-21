const hnApiBaseUrl = 'https://hacker-news.firebaseio.com/v0'

let newStoriesIds

/**
 * Fetch and remember (allowing repeated calls for an easier workflow later) the
 * ids of the 500 most recent stories.
 */
function fetchNewStoriesIds() {
    if (newStoriesIds) {
        return Promise.resolve(newStoriesIds)
    }
    return fetch(`${hnApiBaseUrl}/newstories.json`)
        .then(res => res.json())
        .then(ids => {
            newStoriesIds = ids
            return newStoriesIds
        })
}

function fetchStoryById(id) {
    return fetch(`${hnApiBaseUrl}/item/${id}.json`)
        .then(res => res.json())
}

/**
 * Helper function for the concise and readable creation of HTML elements and
 * trees. Should suffice for a project this size.
 */
function h(tag, props = {}, children = []) {
    const elem = document.createElement(tag)
    Object.assign(elem, props)
    elem.append(...children)
    return elem
}

function renderStoriesList() {
    return h('ol')
}

function renderStory(story) {
    return h('li', {className: 'story'}, [
        h('a', {className: 'title', href: story.url}, [
            story.title
        ]),
        h('div', {className: 'metadata'}, [
            h('span', {}, [
                'by ',
                h('b', {}, [story.by])
            ]),
            h('span', {}, [
                ' at ',
                h('b', {}, [new Date(story.time * 1000).toLocaleString()])
            ])
        ])
    ])
}

const pageSize = 30
let lastStoryIdx = 0
let loadingStories = false

function loadNextStories(storiesList) {
    // Prevent loading extra pages if the user scrolls while the stories are
    // still being loaded.
    if (loadingStories) {
        return Promise.resolve()
    }
    loadingStories = true

    return fetchNewStoriesIds()
        .then(ids => {
            const nextStoriesIds = ids.slice(lastStoryIdx, lastStoryIdx + pageSize)
            lastStoryIdx += pageSize

            // Guarantee the order of the stories, sacrificing some speed.
            return nextStoriesIds.reduce((priorPromise, nextId) => {
                return priorPromise
                    .then(() => fetchStoryById(nextId))
                    .then(story => storiesList.append(renderStory(story)))
            }, Promise.resolve())

            // Load stories as fast as possible, sacrificing exact time order.
            // const storyPromises = nextStoriesIds.map(fetchStoryById)
            // storyPromises.forEach(p => p.then(story => storiesList.append(renderStory(story))))
            // return Promise.all(storyPromises)
        })
        .finally(() => loadingStories = false)
}

function isScrollAtTheBottom() {
    return window.innerHeight + Math.ceil(window.scrollY) >= document.body.scrollHeight
}


// Register service worker for offline support on subsequent visits to the site.
navigator.serviceWorker.register('./sw.js')

const storiesList = renderStoriesList()
document.body.append(
    h('h1', {}, ['Hacker News Reader']),
    storiesList
)

loadNextStories(storiesList).then(() => {
    // For big screens, load more content right away.
    if (isScrollAtTheBottom()) {
        loadNextStories(storiesList)
    }

    window.addEventListener('scroll', () => {
        if (isScrollAtTheBottom()) {
            loadNextStories(storiesList)
        }
    })
})
