// Global state
let currentTrack = null;
let isPlaying = false;
let currentVolume = 50;

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const searchResults = document.getElementById('searchResults');
const featuredSection = document.getElementById('featuredSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audioElement');
const toastContainer = document.getElementById('toastContainer');

// Player elements
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
const progressFill = document.getElementById('progressFill');

// Video modal elements
const videoModal = document.getElementById('videoModal');
const videoModalTitle = document.getElementById('videoModalTitle');
const closeVideoModal = document.getElementById('closeVideoModal');
const modalVideoElement = document.getElementById('modalVideoElement');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setInitialVolume();
});

function initializeEventListeners() {
    // Search functionality
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    searchBtn.addEventListener('click', performSearch);
    
    // Player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    playVideoBtn.addEventListener('click', playVideo);
    downloadMp3Btn.addEventListener('click', () => downloadTrack('mp3'));
    downloadMp4Btn.addEventListener('click', () => downloadTrack('mp4'));
    volumeSlider.addEventListener('input', adjustVolume);
    
    // Video modal controls
    closeVideoModal.addEventListener('click', closeVideo);
    videoModal.addEventListener('click', function(e) {
        if (e.target === videoModal) {
            closeVideo();
        }
    });
    
    // Audio element events
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateDuration);
    audioElement.addEventListener('ended', onTrackEnded);
    audioElement.addEventListener('error', onAudioError);
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
        
        if (!response.ok) {
            throw new Error(data.error || 'Search failed');
        }
        
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
    
    // Format duration and views
    const duration = formatDuration(track.duration);
    const views = formatViews(track.views);
    
    card.innerHTML = `
        <img src="${track.thumbnail || '/placeholder-music.jpg'}" 
             alt="${track.title}" 
             class="card-thumbnail"
             data-testid="img-thumbnail-${track.id}"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjMzMzIiByeD0iNCIvPgo8cGF0aCBkPSJNOSAxMkwyMSA2VjE4TDkgMTJaIiBmaWxsPSIjNjY3RUVBIi8+Cjwvc3ZnPg=='">
        <h3 class="card-title" data-testid="text-title-${track.id}">${escapeHtml(track.title)}</h3>
        <p class="card-artist" data-testid="text-artist-${track.id}">${escapeHtml(track.artist)}</p>
        <div class="card-info">
            <span data-testid="text-duration-${track.id}">${duration}</span>
            <span data-testid="text-views-${track.id}">${views}</span>
        </div>
        <div class="card-actions">
            <button class="card-btn primary" data-testid="button-play-${track.id}" onclick="playTrack('${track.id}')">
                <i class="fas fa-play"></i>
                Play
            </button>
            <button class="card-btn" data-testid="button-download-mp3-${track.id}" onclick="downloadTrack('mp3', '${track.id}')">
                <i class="fas fa-download"></i>
                MP3
            </button>
            <button class="card-btn" data-testid="button-play-video-${track.id}" onclick="playVideo('${track.id}')">
                <i class="fas fa-play"></i>
                Video
            </button>
            <button class="card-btn" data-testid="button-download-mp4-${track.id}" onclick="downloadTrack('mp4', '${track.id}')">
                <i class="fas fa-video"></i>
                MP4
            </button>
        </div>
    `;
    
    // Store track data
    card.trackData = track;
    
    return card;
}

function playTrack(trackId) {
    // Find the track in the current results
    const trackCard = document.querySelector(`[data-testid="card-track-${trackId}"]`);
    if (!trackCard || !trackCard.trackData) {
        showToast('Track not found', 'error');
        return;
    }
    
    const track = trackCard.trackData;
    currentTrack = track;
    
    // Update player UI
    playerThumbnail.src = track.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjMzMzIiByeD0iNCIvPgo8cGF0aCBkPSJNOSAxMkwyMSA2VjE4TDkgMTJaIiBmaWxsPSIjNjY3RUVBIi8+Cjwvc3ZnPg==';
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    
    // For demo purposes, we'll simulate playing (no actual audio streaming from YouTube due to CORS)
    // In a real app, you'd need a proper audio streaming service
    audioElement.src = ''; // Clear any existing source
    
    // Show player
    audioPlayer.classList.remove('hidden');
    
    // Update play button
    isPlaying = true;
    updatePlayButton();
    
    showToast(`Now playing: ${track.title}`, 'success');
    
    // Simulate progress for demo
    simulatePlayback();
}

function simulatePlayback() {
    if (!currentTrack) return;
    
    let currentSeconds = 0;
    const totalSeconds = parseDuration(currentTrack.duration);
    
    const interval = setInterval(() => {
        if (!isPlaying || !currentTrack) {
            clearInterval(interval);
            return;
        }
        
        currentSeconds += 1;
        
        if (currentSeconds >= totalSeconds) {
            clearInterval(interval);
            onTrackEnded();
            return;
        }
        
        // Update progress
        const progress = (currentSeconds / totalSeconds) * 100;
        progressFill.style.width = `${progress}%`;
        currentTime.textContent = formatTime(currentSeconds);
        totalTime.textContent = formatTime(totalSeconds);
    }, 1000);
}

function parseDuration(duration) {
    if (!duration) return 180; // Default 3 minutes
    
    const parts = duration.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 180;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function togglePlayPause() {
    if (!currentTrack) return;
    
    // If YouTube player is active, use it
    if (window.youtubePlayer) {
        if (isPlaying) {
            window.youtubePlayer.pauseVideo();
            isPlaying = false;
            showToast('Paused', 'success');
        } else {
            window.youtubePlayer.playVideo();
            isPlaying = true;
            showToast('Resumed', 'success');
        }
        updatePlayButton();
        return;
    }
    
    // Fallback to simulated playback
    isPlaying = !isPlaying;
    updatePlayButton();
    
    if (isPlaying) {
        showToast('Resumed', 'success');
        simulatePlayback();
    } else {
        showToast('Paused', 'success');
    }
}

function updatePlayButton() {
    const icon = playPauseBtn.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }
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
        // Use proxy download for direct download without redirects
        const downloadUrl = `/api/proxy-download/${track.videoId}?format=${format}`;
        
        // Create download link that triggers immediate download
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
        console.error('Download error:', error);
        showToast(`Failed to download ${format.toUpperCase()}. Please try again.`, 'error');
    }
}

async function playVideo(trackId = null) {
    const track = trackId ? 
        document.querySelector(`[data-testid="card-track-${trackId}"]`)?.trackData :
        currentTrack;
    
    if (!track) {
        showToast('No track selected', 'error');
        return;
    }
    
    showLoading('Loading video...');
    currentTrack = track;
    
    // Initialize YouTube IFrame player for direct streaming
    initializeYouTubePlayer(track);
}

function closeVideo() {
    videoModal.classList.add('hidden');
    if (window.youtubePlayer) {
        window.youtubePlayer.pauseVideo();
    }
    modalVideoElement.pause();
    modalVideoElement.src = '';
}

// Initialize YouTube IFrame API for direct streaming
function initializeYouTubePlayer(track) {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Set up callback for when API is ready
        window.onYouTubeIframeAPIReady = () => {
            createYouTubePlayer(track);
        };
    } else {
        createYouTubePlayer(track);
    }
}

function createYouTubePlayer(track) {
    hideLoading();
    
    // Create YouTube player container if it doesn't exist
    let playerContainer = document.getElementById('youtube-player-container');
    if (!playerContainer) {
        playerContainer = document.createElement('div');
        playerContainer.id = 'youtube-player-container';
        playerContainer.style.width = '100%';
        playerContainer.style.height = '100%';
        
        // Replace video element with YouTube player
        const videoContainer = document.querySelector('.video-container');
        videoContainer.innerHTML = '';
        videoContainer.appendChild(playerContainer);
    }
    
    // Create or update YouTube player
    if (window.youtubePlayer) {
        window.youtubePlayer.loadVideoById(track.videoId);
    } else {
        window.youtubePlayer = new window.YT.Player('youtube-player-container', {
            height: '100%',
            width: '100%',
            videoId: track.videoId,
            playerVars: {
                autoplay: 1,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                showinfo: 0
            },
            events: {
                onReady: (event) => {
                    // Update player UI
                    updatePlayerUI(track);
                    showToast('Now streaming: ' + track.title, 'success');
                    
                    // Hide download buttons since streaming started
                    hideDownloadButtons();
                },
                onStateChange: (event) => {
                    if (event.data === window.YT.PlayerState.PLAYING) {
                        isPlaying = true;
                        updatePlayButton();
                    } else if (event.data === window.YT.PlayerState.PAUSED) {
                        isPlaying = false;
                        updatePlayButton();
                    }
                }
            }
        });
    }
    
    // Show video modal
    videoModalTitle.textContent = track.title;
    videoModal.classList.remove('hidden');
}

function updatePlayerUI(track) {
    playerThumbnail.src = track.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjMzMzIiByeD0iNCIvPgo8cGF0aCBkPSJNOSAxMkwyMSA2VjE4TDkgMTJaIiBmaWxsPSIjNjY3RUVBIi8+Cjwvc3ZnPg==';
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    
    // Show audio player
    audioPlayer.classList.remove('hidden');
}

function hideDownloadButtons() {
    // Hide download buttons in the current player
    downloadMp3Btn.style.display = 'none';
    downloadMp4Btn.style.display = 'none';
    
    // Hide download buttons in all search result cards
    document.querySelectorAll('[data-testid^="button-download-"]').forEach(btn => {
        btn.style.display = 'none';
    });
    
    showToast('Download options hidden - streaming mode active', 'success');
}

function updateProgress() {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTime.textContent = formatTime(Math.floor(audioElement.currentTime));
    }
}

function updateDuration() {
    if (audioElement.duration) {
        totalTime.textContent = formatTime(Math.floor(audioElement.duration));
    }
}

function onTrackEnded() {
    isPlaying = false;
    updatePlayButton();
    progressFill.style.width = '0%';
    currentTime.textContent = '0:00';
    showToast('Track ended', 'success');
}

function onAudioError() {
    showToast('Audio playback error', 'error');
    isPlaying = false;
    updatePlayButton();
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
    // Remove or replace invalid characters for filenames
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

function showLoading(message) {
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.querySelector('.loading-text').textContent = message;
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('data-testid', `toast-${type}`);
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}