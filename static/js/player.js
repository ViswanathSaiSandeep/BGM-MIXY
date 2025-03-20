class MusicPlayer {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.songs = [];
        this.currentSongIndex = -1;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.volume = 1;
        this.initializeElements();
        this.setupEventListeners();
        this.loadSongs();
        this.updateVolumeUI();
    }

    initializeElements() {
        // Mini player elements
        this.miniCover = document.getElementById('miniCover');
        this.miniTitle = document.getElementById('miniTitle');
        this.miniArtist = document.getElementById('miniArtist');
        this.miniPlayPause = document.getElementById('miniPlayPause');
        this.miniPrevious = document.getElementById('miniPrevious');
        this.miniNext = document.getElementById('miniNext');
        
        // Full player elements
        this.fullCover = document.getElementById('fullCover');
        this.fullTitle = document.getElementById('fullTitle');
        this.fullArtist = document.getElementById('fullArtist');
        this.albumName = document.getElementById('albumName');
        this.fullPlayPause = document.getElementById('fullPlayPause');
        this.previous = document.getElementById('previous');
        this.next = document.getElementById('next');
        
        // Progress elements
        this.progressBar = document.getElementById('progressBar');
        this.progress = document.getElementById('progress');
        this.currentTime = document.getElementById('currentTime');
        this.duration = document.getElementById('duration');
        
        // Volume elements
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.volumeLevel = document.getElementById('volumeLevel');
        
        // Player toggle
        this.togglePlayer = document.getElementById('togglePlayer');
        this.musicPlayer = document.getElementById('musicPlayer');
        
        // Additional controls
        this.shuffleBtn = document.getElementById('shuffle');
        this.repeatBtn = document.getElementById('repeat');
    }

    setupEventListeners() {
        // Playback controls
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('ended', () => this.handleSongEnd());
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        
        // Play/Pause buttons
        [this.miniPlayPause, this.fullPlayPause].forEach(btn => {
            btn.addEventListener('click', () => this.togglePlay());
        });
        
        // Previous/Next buttons
        [this.miniPrevious, this.previous].forEach(btn => {
            btn.addEventListener('click', () => this.playPrevious());
        });
        [this.miniNext, this.next].forEach(btn => {
            btn.addEventListener('click', () => this.playNext());
        });
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.volumeIcon.addEventListener('click', () => this.toggleMute());
        
        // Player toggle
        this.togglePlayer.addEventListener('click', () => this.togglePlayerView());
        
        // Shuffle and repeat
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Background music support
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Keep playing when tab is not active
                this.audioPlayer.play().catch(() => {});
            }
        });
    }

    async loadSongs() {
        try {
            const response = await fetch('/api/songs');
            this.songs = await response.json();
            this.renderSongs();
        } catch (error) {
            console.error('Error loading songs:', error);
        }
    }

    renderSongs() {
        const container = document.getElementById('songsContainer');
        container.innerHTML = '';
        
        this.songs.forEach((song, index) => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.innerHTML = `
                <img src="${song.cover}" alt="${song.title} cover">
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                    <p class="album-text">${song.album || ''}</p>
                </div>
            `;
            songCard.addEventListener('click', () => this.playSong(index));
            container.appendChild(songCard);
        });
    }

    playSong(index) {
        if (index >= 0 && index < this.songs.length) {
            this.currentSongIndex = index;
            const song = this.songs[index];
            
            this.audioPlayer.src = song.file;
            this.audioPlayer.play();
            this.isPlaying = true;
            
            // Update UI
            this.updatePlayerInfo(song);
            this.updatePlayPauseButtons();
        }
    }

    updatePlayerInfo(song) {
        // Mini player
        this.miniCover.src = song.cover;
        this.miniTitle.textContent = song.title;
        this.miniArtist.textContent = song.artist;
        
        // Full player
        this.fullCover.src = song.cover;
        this.fullTitle.textContent = song.title;
        this.fullArtist.textContent = song.artist;
        this.albumName.textContent = song.album || '';
    }

    togglePlay() {
        if (this.currentSongIndex === -1 && this.songs.length > 0) {
            this.playSong(0);
        } else {
            if (this.isPlaying) {
                this.audioPlayer.pause();
            } else {
                this.audioPlayer.play();
            }
            this.isPlaying = !this.isPlaying;
            this.updatePlayPauseButtons();
        }
    }

    updatePlayPauseButtons() {
        const icon = this.isPlaying ? 'fa-pause' : 'fa-play';
        [this.miniPlayPause, this.fullPlayPause].forEach(btn => {
            btn.innerHTML = `<i class="fas ${icon}"></i>`;
        });
    }

    playPrevious() {
        let newIndex = this.currentSongIndex - 1;
        if (newIndex < 0) newIndex = this.songs.length - 1;
        this.playSong(newIndex);
    }

    playNext() {
        let newIndex = this.currentSongIndex + 1;
        if (newIndex >= this.songs.length) newIndex = 0;
        this.playSong(newIndex);
    }

    handleSongEnd() {
        if (this.repeatMode === 'one') {
            this.audioPlayer.play();
        } else if (this.repeatMode === 'all') {
            this.playNext();
        } else if (this.currentSongIndex < this.songs.length - 1) {
            this.playNext();
        }
    }

    updateProgress() {
        const { currentTime, duration } = this.audioPlayer;
        const progressPercent = (currentTime / duration) * 100;
        this.progress.style.width = `${progressPercent}%`;
        this.currentTime.textContent = this.formatTime(currentTime);
        this.duration.textContent = this.formatTime(duration);
    }

    seek(e) {
        const width = this.progressBar.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audioPlayer.duration;
        this.audioPlayer.currentTime = (clickX / width) * duration;
    }

    setVolume(value) {
        this.volume = value;
        this.audioPlayer.volume = value;
        this.updateVolumeUI();
    }

    updateVolumeUI() {
        this.volumeSlider.value = this.volume * 100;
        this.volumeLevel.style.width = `${this.volume * 100}%`;
        
        // Update volume icon
        const iconClass = this.volume === 0 ? 'fa-volume-mute' :
                         this.volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up';
        this.volumeIcon.className = `fas ${iconClass}`;
    }

    toggleMute() {
        if (this.audioPlayer.volume > 0) {
            this.lastVolume = this.audioPlayer.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.lastVolume || 1);
        }
    }

    togglePlayerView() {
        this.musicPlayer.classList.toggle('expanded');
        const isExpanded = this.musicPlayer.classList.contains('expanded');
        this.togglePlayer.innerHTML = `<i class="fas fa-chevron-${isExpanded ? 'down' : 'up'}"></i>`;
        
        // Hide mini controls when expanded
        document.querySelector('.mini-controls').style.display = isExpanded ? 'none' : 'flex';
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active');
    }

    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        this.repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
        const icon = this.repeatMode === 'one' ? 'fa-redo-alt' : 'fa-redo';
        this.repeatBtn.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // Check user authentication status
    fetch('/api/user')
        .then(response => response.json())
        .then(user => {
            const userSection = document.getElementById('userSection');
            if (user.authenticated) {
                userSection.innerHTML = `
                    <div class="user-profile">
                        <span class="user-name">${user.username}</span>
                    </div>
                    ${user.is_admin ? '<a href="/admin" class="auth-btn admin-btn">Admin Panel</a>' : ''}
                    <a href="/logout" class="auth-btn logout-btn">Logout</a>
                `;
            } else {
                userSection.innerHTML = `
                    <a href="/login" class="auth-btn login-btn">Login</a>
                `;
            }
        })
        .catch(error => console.error('Error checking auth status:', error));
});
