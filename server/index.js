const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// In-memory storage for tracks and playlists
const storage = {
  tracks: new Map(),
  playlists: new Map(),
  
  generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// YouTube search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    console.log('Searching for:', query);

    // Call the YouTube search API
    const response = await axios.get(`https://yt-search-psi.vercel.app/api/ytsearch?q=${encodeURIComponent(query)}`, {
      timeout: 10000
    });

    console.log('API Response:', JSON.stringify(response.data, null, 2));

    // Check if response is successful and has track data
    if (response.data.success && response.data.track) {
      const track = response.data.track;
      const tracks = [{
        id: track.videoId || track.id || storage.generateId(),
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        duration: track.duration || '0:00',
        thumbnail: track.thumbnail || '',
        videoId: track.videoId || track.id,
        views: track.views || '0',
        publishedTime: track.publishedTime || '',
        url: track.url || `https://www.youtube.com/watch?v=${track.videoId || track.id}`
      }];

      console.log('Found track:', tracks[0]);

      res.json({
        tracks,
        totalResults: tracks.length
      });
    } else {
      console.log('No track found in response');
      res.json({
        tracks: [],
        totalResults: 0
      });
    }
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Failed to search YouTube', details: error.message });
  }
});

// Get download URLs for MP3 and MP4
app.get('/api/download/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { format } = req.query; // 'mp3' or 'mp4'
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`Getting ${format} download URL for:`, youtubeUrl);

    let downloadResponse;
    
    if (format === 'mp3') {
      // Get MP3 download URL
      downloadResponse = await axios.get(`https://minato-mp3.vercel.app/api/ytmp3?url=${youtubeUrl}`, {
        timeout: 15000
      });
    } else if (format === 'mp4') {
      // Get MP4 download URL
      downloadResponse = await axios.get(`https://minato-dl.vercel.app/api/alldl?url=${youtubeUrl}`, {
        timeout: 15000
      });
    } else {
      return res.status(400).json({ error: 'Format must be mp3 or mp4' });
    }

    if (downloadResponse.data.success) {
      res.json({
        success: true,
        downloadUrl: downloadResponse.data.download_url,
        format,
        videoId
      });
    } else {
      res.status(500).json({ error: 'Failed to get download URL' });
    }
  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({ error: 'Failed to get download URL', details: error.message });
  }
});

// Proxy download to enable direct download without redirects
app.get('/api/proxy-download/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { format } = req.query; // 'mp3' or 'mp4'
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`Proxying ${format} download for:`, youtubeUrl);

    let downloadResponse;
    
    if (format === 'mp3') {
      downloadResponse = await axios.get(`https://minato-mp3.vercel.app/api/ytmp3?url=${youtubeUrl}`, {
        timeout: 15000
      });
    } else if (format === 'mp4') {
      downloadResponse = await axios.get(`https://minato-dl.vercel.app/api/alldl?url=${youtubeUrl}`, {
        timeout: 15000
      });
    } else {
      return res.status(400).json({ error: 'Format must be mp3 or mp4' });
    }

    if (downloadResponse.data.success && downloadResponse.data.download_url) {
      // Get the actual file and stream it
      const fileResponse = await axios.get(downloadResponse.data.download_url, {
        responseType: 'stream',
        timeout: 30000
      });

      // Set appropriate headers for download
      const filename = `${videoId}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      
      // Pipe the stream directly to response
      fileResponse.data.pipe(res);
    } else {
      res.status(500).json({ error: 'Failed to get download URL' });
    }
  } catch (error) {
    console.error('Proxy download error:', error.message);
    res.status(500).json({ error: 'Failed to proxy download', details: error.message });
  }
});

// Get stream URL for direct video playback
app.get('/api/stream/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log('Getting stream URL for:', youtubeUrl);

    // Get MP4 stream URL
    const streamResponse = await axios.get(`https://minato-dl.vercel.app/api/alldl?url=${youtubeUrl}`, {
      timeout: 15000
    });

    if (streamResponse.data.success && streamResponse.data.download_url) {
      res.json({
        success: true,
        streamUrl: streamResponse.data.download_url,
        videoId,
        youtubeUrl
      });
    } else {
      res.status(500).json({ error: 'Failed to get stream URL' });
    }
  } catch (error) {
    console.error('Stream error:', error.message);
    res.status(500).json({ error: 'Failed to get stream URL', details: error.message });
  }
});

// Track routes
app.get('/api/tracks', async (req, res) => {
  try {
    const tracks = Array.from(storage.tracks.values());
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tracks' });
  }
});

app.get('/api/tracks/:id', async (req, res) => {
  try {
    const track = storage.tracks.get(req.params.id);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json(track);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get track' });
  }
});

app.post('/api/tracks', async (req, res) => {
  try {
    const track = {
      ...req.body,
      id: req.body.id || storage.generateId()
    };
    storage.tracks.set(track.id, track);
    res.status(201).json(track);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create track' });
  }
});

app.delete('/api/tracks/:id', async (req, res) => {
  try {
    const success = storage.tracks.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete track' });
  }
});

// Playlist routes
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = Array.from(storage.playlists.values());
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = storage.playlists.get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

app.post('/api/playlists', async (req, res) => {
  try {
    const now = new Date();
    const playlist = {
      ...req.body,
      id: req.body.id || storage.generateId(),
      tracks: req.body.tracks || [],
      createdAt: now,
      updatedAt: now
    };
    storage.playlists.set(playlist.id, playlist);
    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.post('/api/playlists/:id/tracks', async (req, res) => {
  try {
    const playlist = storage.playlists.get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    playlist.tracks.push(req.body);
    playlist.updatedAt = new Date();
    storage.playlists.set(req.params.id, playlist);
    
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
});

app.delete('/api/playlists/:id/tracks/:trackId', async (req, res) => {
  try {
    const playlist = storage.playlists.get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    playlist.tracks = playlist.tracks.filter(t => t.id !== req.params.trackId);
    playlist.updatedAt = new Date();
    storage.playlists.set(req.params.id, playlist);
    
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
});

app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const success = storage.playlists.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main HTML file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});