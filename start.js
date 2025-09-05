// Simple startup script to run the server
const { spawn } = require('child_process');

console.log('🎵 Starting YT Music Streaming App...');
console.log('📂 Server will serve static files from client/ directory');
console.log('🔗 App will be available at http://localhost:3001');

// Start the server
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || 3001 }
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
});

server.on('exit', (code) => {
  console.log(`🔄 Server exited with code ${code}`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit(0);
});