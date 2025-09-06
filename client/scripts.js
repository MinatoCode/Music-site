let currentTrack = null;
let isPlaying = false;
let currentVolume = 50;
let seeking = false;

// ...your DOM element selectors as before...
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const searchResults = document.getElementById('searchResults');
const featuredSection = document.getElementById('featuredSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const blurOverlay = document.getElementById('blurOverlay');
const audioPlayer = document.getElementById('audioPlayer');
const closeAudioPlayer = document.getElementById('closeAudioPlayer');
const miniAudioPlayer = document.getElementById('miniAudioPlayer');
const miniTrackTitle = document.getElementById('miniTrackTitle');
const miniBackwardBtn = document.getElementById('miniBackwardBtn');
const miniPlayPauseBtn = document.getElementById('miniPlayPauseBtn');
const miniForwardBtn = document.getElementById('miniForwardBtn');
const audioElement = document.getElementById('audioElement');
const playerThumbnail = document.getElementById('playerThumbnail');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const playPauseBtn = document.getElementById('playPauseBtn');
const playVideoBtn = document.getElementById('playVideoBtn');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const progressBar = document.querySelector('.progress-bar');
const progressFill = document.getElementById('progressFill');
const backwardBtn = document.getElementById('backwardBtn');
const forwardBtn = document.getElementById('forwardBtn');
const videoModal = document.getElementById('videoModal');
const videoModalTitle = document.getElementById('videoModalTitle');
const playerContainer = document.getElementById('youtube-player-container');
const closeVideoModal = document.getElementById('closeVideoModal');
    
function hidePlayerDownloadButtons() {
    const downloadMp3Btn = document.getElementById('downloadMp3Btn');
    const downloadMp4Btn = document.getElementById('downloadMp4Btn');
    if (downloadMp3Btn) downloadMp3Btn.style.display = 'none';
    if (downloadMp4Btn) downloadMp4Btn.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setInitialVolume();
    hidePlayerDownloadButtons();
});

function initializeEventListeners() {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    searchBtn.addEventListener('click', performSearch);

    playPauseBtn.addEventListener('click', togglePlayPause);
    playVideoBtn.addEventListener('click', function() {
        playMp4Stream(currentTrack?.url);
    });

    volumeSlider.addEventListener('input', adjustVolume);

    backwardBtn.addEventListener('click', () => seekAudio(-10));
    forwardBtn.addEventListener('click', () => seekAudio(10));
    miniBackwardBtn.addEventListener('click', () => seekAudio(-10));
    miniForwardBtn.addEventListener('click', () => seekAudio(10));
    miniPlayPauseBtn.addEventListener('click', function(e) {
        togglePlayPause();
        updateMiniPlayPauseBtn();
        e.stopPropagation();
    });

    progressBar.addEventListener('click', function(e) {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        if (audioElement.src && audioElement.duration) {
            audioElement.currentTime = percent * audioElement.duration;
        }
    });
    progressBar.addEventListener('mousedown', () => seeking = true);
    document.addEventListener('mouseup', () => seeking = false);
    progressBar.addEventListener('mousemove', function(e) {
        if (seeking && audioElement.src && audioElement.duration) {
            const rect = progressBar.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(x / rect.width, 1));
            audioElement.currentTime = percent * audioElement.duration;
        }
    });

    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateProgress);

    audioElement.addEventListener('ended', () => {
        hideMiniPlayer();
        stopStreaming();
    });

    videoModal.addEventListener('mousedown', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
            playerContainer.innerHTML = '';
        }
    });

    closeVideoModal.addEventListener('click', function() {
        videoModal.classList.add('hidden');
        playerContainer.innerHTML = '';
    });

    // Minimize player if clicking outside player
    document.addEventListener('mousedown', function(e) {
        if (!audioPlayer.classList.contains('hidden')) {
            let node = e.target;
            let inside = false;
            while (node) {
                if (node === audioPlayer) { inside = true; break; }
                node = node.parentElement;
            }
            if (!inside) {
                minimizePlayer();
            }
        }
    });

    // Restore full player on mini player click
    miniAudioPlayer.addEventListener('click', function(e) {
        restorePlayer();
    });
                                  }

function setInitialVolume() {
    audioElement.volume = currentVolume / 100;
    volumeSlider.value = currentVolume;
}

async function performSearch() {
    // ...as before, shows results...
}

function displaySearchResults(tracks) {
    resultsContainer.innerHTML = '';
    tracks.forEach(track => {
        const card = createTrackCard(track);
        resultsContainer.appendChild(card);
    });
    searchResults.classList.remove('hidden');
}

function createTrackCard(track) {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.setAttribute('data-testid', `card-track-${track.id}`);
    card.innerHTML = `
        <img src="${track.thumbnail || '/placeholder-music.jpg'}"
             alt="${track.title}"
             class="card-thumbnail"
             data-testid="img-thumbnail-${track.id}"
             onerror="this.src='/placeholder-music.jpg'">
        <h3 class="card-title" data-testid="text-title-${track.id}">${escapeHtml(track.title)}</h3>
        <p class="card-artist" data-testid="text-artist-${track.id}">${escapeHtml(track.artist)}</p>
        <div class="card-info">
            <span data-testid="text-duration-${track.id}">${formatDuration(track.duration)}</span>
            <span data-testid="text-views-${track.id}">${formatViews(track.views)}</span>
        </div>
        <div class="card-actions">
            <button class="card-btn primary" data-testid="button-play-${track.id}" onclick="playTrack('${track.id}')">
                <i class="fas fa-play"></i>
                Stream
            </button>
            <button class="card-btn" data-testid="button-download-mp3-${track.id}" onclick="downloadTrack('mp3', '${track.id}')">
                <i class="fas fa-download"></i>
                MP3
            </button>
            <button class="card-btn" data-testid="button-download-mp4-${track.id}" onclick="downloadTrack('mp4', '${track.id}')">
                <i class="fas fa-video"></i>
                MP4
            </button>
        </div>
    `;
    card.trackData = track;
    return card;
}

function playTrack(trackId) {
    // ...as before...
    hidePlayerDownloadButtons();
}

// ...rest of your script.js logic as previously provided, but no cross/close button logic...
