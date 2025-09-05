let currentTrack = null;
let isPlaying = false;
let currentVolume = 50;
let seeking = false;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const searchResults = document.getElementById('searchResults');
const featuredSection = document.getElementById('featuredSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const blurOverlay = document.getElementById('blurOverlay');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audioElement');
const toastContainer = document.getElementById('toastContainer');
const playerThumbnail = document.getElementById('playerThumbnail');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const playPauseBtn = document.getElementById('playPauseBtn');
const playVideoBtn = document.getElementById('playVideoBtn');
const downloadMp3Btn = document.getElementById('downloadMp3Btn');
const downloadMp4Btn = document.getElementById('downloadMp4Btn');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const progressBar = document.querySelector('.progress-bar');
const progressFill = document.getElementById('progressFill');
const backwardBtn = document.getElementById('backwardBtn');
const forwardBtn = document.getElementById('forwardBtn');
const videoModal = document.getElementById('videoModal');
const videoModalTitle = document.getElementById('videoModalTitle');
const playerContainer = document.getElementById('youtube-player-container');
const closeVideoModal = document.getElementById('closeVideoModal');

function extractYouTubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|watch\?.+&v=)([^#&?]{11}).*/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
}

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setInitialVolume();
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
    downloadMp3Btn.addEventListener('click', function() {
        downloadTrack('mp3');
    });
    downloadMp4Btn.addEventListener('click', function() {
        downloadTrack('mp4');
    });
    volumeSlider.addEventListener('input', adjustVolume);

    if (backwardBtn) backwardBtn.addEventListener('click', () => seekAudio(-10));
    if (forwardBtn) forwardBtn.addEventListener('click', () => seekAudio(10));

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
        downloadMp3Btn.style.display = '';
        downloadMp4Btn.style.display = '';
    });

    document.addEventListener('click', function(e) {
        if (!audioPlayer.classList.contains('hidden')) {
            if (!audioPlayer.contains(e.target)) {
                stopStreaming();
            }
        }
    });

    closeVideoModal.addEventListener('click', function() {
        videoModal.classList.add('hidden');
        playerContainer.innerHTML = '';
        downloadMp3Btn.style.display = '';
        downloadMp4Btn.style.display = '';
    });
    videoModal.addEventListener('mousedown', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
            playerContainer.innerHTML = '';
            downloadMp3Btn.style.display = '';
            downloadMp4Btn.style.display = '';
        }
    });
}

function setInitialVolume() {
    audioElement.volume = currentVolume / 100;
    volumeSlider.value = currentVolume;
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        showToast('Please enter a search term', 'error');
        return;
    }
    showLoading('Searching for music...');
    featuredSection.classList.add('hidden');
    searchResults.classList.add('hidden');
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        hideLoading();
        if (!response.ok) throw new Error(data.error || 'Search failed');
        if (data.tracks && data.tracks.length > 0) {
            displaySearchResults(data.tracks);
            showToast(`Found ${data.tracks.length} tracks`, 'success');
        } else {
            showToast('No tracks found. Try a different search term.', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Search error:', error);
        showToast('Failed to search. Please try again.', 'error');
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
                Play
            </button>
            <button class="card-btn video-btn" data-testid="button-play-video-${track.id}" onclick="playMp4Stream('https://www.youtube.com/watch?v=${track.videoId}')">
                <i class="fas fa-video"></i>
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
    const trackCard = document.querySelector(`[data-testid="card-track-${trackId}"]`);
    if (!trackCard || !trackCard.trackData) {
        showToast('Track not found', 'error');
        return;
    }
    const track = trackCard.trackData;
    currentTrack = track;
    playerThumbnail.src = track.thumbnail || '/placeholder-music.jpg';
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    downloadMp3Btn.style.display = 'none';
    downloadMp4Btn.style.display = 'none';
    playAudioStream(`https://www.youtube.com/watch?v=${track.videoId}`);
}

function stopStreaming() {
    audioPlayer.classList.add('hidden');
    audioElement.pause();
    audioElement.currentTime = 0;
    downloadMp3Btn.style.display = '';
    downloadMp4Btn.style.display = '';
}

async function playAudioStream(url) {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        return;
    }
    showLoading('Loading audio...');
    try {
        audioElement.src = `/api/proxy-download/${videoId}?format=mp3`;
        audioElement.load();
        audioElement.oncanplay = () => {
            audioPlayer.classList.remove('hidden');
            isPlaying = true;
            updatePlayButton();
            audioElement.play();
            hideLoading();
            showToast('Now streaming audio', 'success');
        };
        audioElement.onerror = () => {
            hideLoading();
            showToast('Audio stream error. Try video instead.', 'error');
        };
    } catch (error) {
        hideLoading();
        showToast('Audio stream error', 'error');
    }
}

function playMp4Stream(url) {
    const videoId = extractYouTubeVideoId(url || currentTrack?.url || currentTrack?.videoId);
    if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        return;
    }
    showLoading('Loading video...');
    downloadMp3Btn.style.display = 'none';
    downloadMp4Btn.style.display = 'none';
    showYouTubeModal(videoId, currentTrack?.title || "YouTube Video");
    hideLoading();
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
        audioElement.currentTime = Math.max(0, Math.min(audioElement.currentTime + seconds, audioElement.duration));
    }
}

function updateProgress() {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTime.textContent = formatTime(Math.floor(audioElement.currentTime));
        totalTime.textContent = formatTime(Math.floor(audioElement.duration));
    } else {
        progressFill.style.width = '0%';
        currentTime.textContent = '0:00';
        totalTime.textContent = '0:00';
    }
}

function togglePlayPause() {
    if (!currentTrack) return;
    isPlaying = !isPlaying;
    updatePlayButton();
    if (isPlaying) {
        showToast('Resumed', 'success');
        audioElement.play();
    } else {
        showToast('Paused', 'success');
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
    const track = trackId ?
        document.querySelector(`[data-testid="card-track-${trackId}"]`)?.trackData :
        currentTrack;
    if (!track) {
        showToast('No track selected', 'error');
        return;
    }
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
        showToast(`${format.toUpperCase()} download started!`, 'success');
    } catch (error) {
        hideLoading();
        showToast(`Failed to download ${format.toUpperCase()}. Please try again.`, 'error');
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

function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('data-testid', `toast-${type}`);
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 5000);
                                            }
