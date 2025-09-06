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
const query = searchInput.value.trim();
    if (!query) {
        featuredSection.classList.remove('hidden');
        searchResults.classList.add('hidden');
        return;
    }
    showLoading('Searching for music...');
    featuredSection.classList.add('hidden');
    searchResults.classList.add('hidden');
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        hideLoading();
        if (data.tracks && data.tracks.length > 0) {
            displaySearchResults(data.tracks);
        } else {
            resultsContainer.innerHTML = '<div style="color:#fff;font-size:1.2rem;padding:2rem;">No results found.</div>';
            searchResults.classList.remove('hidden');
        }
    } catch (error) {
        hideLoading();
        resultsContainer.innerHTML = `<div style="color:#fff;font-size:1.2rem;padding:2rem;">Error searching: ${error.message}</div>`;
        searchResults.classList.remove('hidden');
    }
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
    if (!trackCard || !trackCard.trackData) return;
    const track = trackCard.trackData;
    currentTrack = track;
    playerThumbnail.src = track.thumbnail || '/placeholder-music.jpg';
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    playAudioStream(`https://www.youtube.com/watch?v=${track.videoId}`);
    hidePlayerDownloadButtons();
}
function stopStreaming() {
    // Exit player: Hide main player, hide mini, stop audio, reset state
    audioPlayer.classList.add('hidden');
    miniAudioPlayer.classList.add('hidden');
    audioElement.pause();
    audioElement.currentTime = 0;
    currentTrack = null;
    isPlaying = false;
    hidePlayerDownloadButtons();
}

function minimizePlayer() {
    if (audioPlayer.classList.contains('hidden')) return;
    audioPlayer.classList.add('hidden');
    showMiniPlayer();
    hidePlayerDownloadButtons();
}

function restorePlayer() {
    if (!currentTrack) return;
    miniAudioPlayer.classList.add('hidden');
    audioPlayer.classList.remove('hidden');
    hidePlayerDownloadButtons();
}

function showMiniPlayer() {
    if (!currentTrack) return;
    miniTrackTitle.textContent = currentTrack.title;
    miniAudioPlayer.classList.remove('hidden');
    updateMiniPlayPauseBtn();
}

function hideMiniPlayer() {
    miniAudioPlayer.classList.add('hidden');
}

function updateMiniPlayPauseBtn() {
    const icon = miniPlayPauseBtn.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

async function playAudioStream(url) {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return;
    showLoading('Loading audio...');
    try {
        audioElement.src = `/api/proxy-download/${videoId}?format=mp3`;
        audioElement.load();
        audioElement.oncanplay = () => {
            audioPlayer.classList.remove('hidden');
            miniAudioPlayer.classList.add('hidden');
            isPlaying = true;
            updatePlayButton();
            updateMiniPlayPauseBtn();
            audioElement.play();
            hideLoading();
            hidePlayerDownloadButtons();
        };
        audioElement.onerror = () => {
            hideLoading();
        };
    } catch (error) {
        hideLoading();
    }
}

function playMp4Stream(url) {
    const videoId = extractYouTubeVideoId(url || currentTrack?.url || currentTrack?.videoId);
    if (!videoId) return;
    showLoading('Loading video...');
    showYouTubeModal(videoId, currentTrack?.title || "YouTube Video");
    hideLoading();
    hidePlayerDownloadButtons();
}

function showYouTubeModal(videoId, title) {
    videoModalTitle.textContent = title;
    videoModal.classList.remove('hidden');
    playerContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`;
    iframe.frameBorder = "0";
    iframe.allow = "autoplay; encrypted-media";
    iframe.allowFullscreen = true;
    playerContainer.appendChild(iframe);
}

function seekAudio(seconds) {
    if (audioElement.src && audioElement.duration) {
        let newTime = Math.max(0, Math.min(audioElement.currentTime + seconds, audioElement.duration));
        audioElement.currentTime = newTime;
    }
}

function updateProgress() {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
    } else {
        progressFill.style.width = '0%';
    }
}

function togglePlayPause() {
    if (!currentTrack) return;
    isPlaying = !isPlaying;
    updatePlayButton();
    updateMiniPlayPauseBtn();
    if (isPlaying) {
        audioElement.play();
    } else {
        audioElement.pause();
    }
}

function updatePlayButton() {
    const icon = playPauseBtn.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

function adjustVolume() {
    currentVolume = volumeSlider.value;
    audioElement.volume = currentVolume / 100;
    const icon = volumeBtn.querySelector('i');
    if (currentVolume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (currentVolume < 50) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

async function downloadTrack(format, trackId = null) {
    // Only allow downloads from card actions (never from player/miniplayer)
    const track = trackId ?
        document.querySelector(`[data-testid="card-track-${trackId}"]`)?.trackData :
        null;
    if (!track) return;
    showLoading(`Preparing ${format.toUpperCase()} download...`);
    try {
        const downloadUrl = `/api/proxy-download/${track.videoId}?format=${format}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${sanitizeFilename(track.title)}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        hideLoading();
    } catch (error) {
        hideLoading();
    }
}

// Utility functions
function formatDuration(duration) {
    if (!duration) return '0:00';
    if (/^\d{1,2}:\d{2}$/.test(duration)) return duration;
    const seconds = parseInt(duration);
    if (!isNaN(seconds)) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return duration;
}

function formatViews(views) {
    if (!views) return '0 views';
    const numStr = views.replace(/[^\d]/g, '');
    const num = parseInt(numStr);
    if (isNaN(num)) return views;
    if (num >= 1000000000) {
        return `${(num / 1000000000).toFixed(1)}B views`;
    } else if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M views`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

function showLoading(message) {
    blurOverlay.classList.add('active');
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.querySelector('.loading-text').textContent = message;
}
function hideLoading() {
    loadingSpinner.classList.add('hidden');
    blurOverlay.classList.remove('active');
}
