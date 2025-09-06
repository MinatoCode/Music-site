let currentTrack = null;
let isPlaying = false;
let currentVolume = 1;
let seeking = false;

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const audioPlayer = document.getElementById("audioPlayer");
const videoPlayer = document.getElementById("videoPlayer");
const playerOverlay = document.getElementById("playerOverlay");
const player = document.getElementById("player");
const trackTitle = document.getElementById("trackTitle");
const trackThumbnail = document.getElementById("trackThumbnail");
const playPauseBtn = document.getElementById("playPauseBtn");
const volumeSlider = document.getElementById("volumeSlider");
const progressBar = document.getElementById("progressBar");
const currentTimeDisplay = document.getElementById("currentTime");
const durationDisplay = document.getElementById("duration");
const mp3DownloadBtn = document.getElementById("mp3DownloadBtn");
const mp4DownloadBtn = document.getElementById("mp4DownloadBtn");

function hidePlayerDownloadButtons() {
    mp3DownloadBtn.style.display = "none";
    mp4DownloadBtn.style.display = "none";
}

function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function initializeEventListeners() {
    searchInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            performSearch(searchInput.value);
        }
    });

    playPauseBtn.addEventListener("click", togglePlayPause);
    volumeSlider.addEventListener("input", adjustVolume);

    progressBar.addEventListener("input", function () {
        seeking = true;
        const duration = audioPlayer.style.display !== "none" ? audioPlayer.duration : videoPlayer.duration;
        const seekTime = (progressBar.value / 100) * duration;
        if (audioPlayer.style.display !== "none") {
            audioPlayer.currentTime = seekTime;
        } else {
            videoPlayer.currentTime = seekTime;
        }
    });

    progressBar.addEventListener("change", function () {
        seeking = false;
    });

    setInterval(updateProgress, 500);
}

function performSearch(query) {
    showLoading("Searching...");
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            displaySearchResults(data);
        })
        .catch(error => {
            hideLoading();
            console.error("Search error:", error);
        });
}

function displaySearchResults(results) {
    searchResults.innerHTML = "";
    results.forEach(result => {
        const div = document.createElement("div");
        div.className = "search-result";
        div.innerHTML = `
            <img src="${escapeHtml(result.thumbnail)}" alt="Thumbnail">
            <div>
                <h3>${escapeHtml(result.title)}</h3>
                <p>${formatDuration(result.duration)} • ${formatViews(result.views)} views</p>
            </div>
        `;
        div.addEventListener("click", () => playTrack(result.id));
        searchResults.appendChild(div);
    });
}

function playTrack(trackId) {
    showLoading("Loading track...");
    fetch(`/api/track/${trackId}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            currentTrack = data;
            trackTitle.textContent = data.title;
            trackThumbnail.src = data.thumbnail;
            playerOverlay.style.display = "block";
            player.style.display = "block";

            if (data.type === "audio") {
                playAudioStream(data.streamUrl);
                mp3DownloadBtn.href = data.downloadUrl;
                mp3DownloadBtn.style.display = "inline-block";
                mp4DownloadBtn.style.display = "none";
            } else {
                playMp4Stream(data.streamUrl);
                mp4DownloadBtn.href = data.downloadUrl;
                mp4DownloadBtn.style.display = "inline-block";
                mp3DownloadBtn.style.display = "none";
            }
        })
        .catch(error => {
            hideLoading();
            console.error("Track load error:", error);
        });
}

function playAudioStream(url) {
    videoPlayer.pause();
    videoPlayer.style.display = "none";
    audioPlayer.src = url;
    audioPlayer.style.display = "block";
    audioPlayer.play();
    isPlaying = true;
}

function playMp4Stream(url) {
    audioPlayer.pause();
    audioPlayer.style.display = "none";
    videoPlayer.src = url;
    videoPlayer.style.display = "block";
    videoPlayer.play();
    isPlaying = true;
}

function togglePlayPause() {
    if (audioPlayer.style.display !== "none") {
        if (audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
        } else {
            audioPlayer.pause();
            isPlaying = false;
        }
    } else {
        if (videoPlayer.paused) {
            videoPlayer.play();
            isPlaying = true;
        } else {
            videoPlayer.pause();
            isPlaying = false;
        }
    }
}

function adjustVolume() {
    currentVolume = volumeSlider.value;
    audioPlayer.volume = currentVolume;
    videoPlayer.volume = currentVolume;
}

function updateProgress() {
    if (seeking) return;

    const playerRef = audioPlayer.style.display !== "none" ? audioPlayer : videoPlayer;
    const currentTime = playerRef.currentTime;
    const duration = playerRef.duration;

    if (!isNaN(currentTime) && !isNaN(duration)) {
        const progress = (currentTime / duration) * 100;
        progressBar.value = progress;
        currentTimeDisplay.textContent = formatDuration(currentTime);
        durationDisplay.textContent = formatDuration(duration);
    }
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatViews(views) {
    return views.toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeFilename(name) {
    return name.replace(/[\/\\?%*:|"<>]/g, "-");
}

function showLoading(message) {
    const loading = document.getElementById("loading");
    loading.textContent = message;
    loading.style.display = "block";
}

function hideLoading() {
    const loading = document.getElementById("loading");
    loading.style.display = "none";
}

initializeEventListeners();
      
