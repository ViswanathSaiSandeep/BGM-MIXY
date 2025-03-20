document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const musicInput = document.getElementById('music');
    const coverInput = document.getElementById('cover');
    const coverPreview = document.getElementById('coverPreview');
    const musicFileInfo = document.getElementById('musicFileInfo');
    const musicFileName = document.getElementById('musicFileName');
    const coverFileName = document.getElementById('coverFileName');
    const songsTableBody = document.getElementById('songsTableBody');
    const notification = document.getElementById('notification');

    // Load songs
    loadSongs();

    // Handle file input changes
    coverInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            coverFileName.textContent = file.name;
            
            // Create preview
            const reader = new FileReader();
            reader.onload = function(e) {
                coverPreview.innerHTML = `<img src="${e.target.result}" alt="Cover Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            coverFileName.textContent = 'No file chosen';
            coverPreview.innerHTML = `
                <i class="fas fa-image"></i>
                <span>Cover Preview</span>
            `;
        }
    });

    musicInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            musicFileName.textContent = file.name;
            
            // Update file info
            const fileSize = formatFileSize(file.size);
            musicFileInfo.innerHTML = `
                <i class="fas fa-music"></i>
                <span>${file.name}</span>
                <span class="file-size">${fileSize}</span>
            `;
        } else {
            musicFileName.textContent = 'No file chosen';
            musicFileInfo.innerHTML = `
                <i class="fas fa-music"></i>
                <span>No file selected</span>
            `;
        }
    });

    // Handle form submission
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(uploadForm);
        const uploadBtn = document.getElementById('uploadBtn');
        
        // Disable button and show loading state
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Track uploaded successfully!', 'success');
                uploadForm.reset();
                coverPreview.innerHTML = `
                    <i class="fas fa-image"></i>
                    <span>Cover Preview</span>
                `;
                musicFileInfo.innerHTML = `
                    <i class="fas fa-music"></i>
                    <span>No file selected</span>
                `;
                musicFileName.textContent = 'No file chosen';
                coverFileName.textContent = 'No file chosen';
                loadSongs();
            } else {
                showNotification(data.error || 'Upload failed. Please try again.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        })
        .finally(() => {
            // Re-enable button
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Track';
        });
    });

    function loadSongs() {
        fetch('/api/songs')
            .then(response => response.json())
            .then(songs => {
                songsTableBody.innerHTML = '';
                
                if (songs.length === 0) {
                    songsTableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="no-songs">No tracks available. Upload your first track!</td>
                        </tr>
                    `;
                    return;
                }
                
                songs.forEach((song, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><img src="${song.cover}" alt="${song.title}" class="song-thumbnail"></td>
                        <td>${song.title}</td>
                        <td>${song.artist}</td>
                        <td>
                            <button class="action-btn play-btn" title="Play" data-index="${index}">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="action-btn delete-btn" title="Delete" data-id="${song.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    songsTableBody.appendChild(row);
                });
                
                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const songId = this.dataset.id;
                        if (confirm('Are you sure you want to delete this track?')) {
                            deleteSong(songId);
                        }
                    });
                });
                
                // Add event listeners to play buttons
                document.querySelectorAll('.play-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const index = parseInt(this.dataset.index);
                        playSong(songs[index]);
                    });
                });
            })
            .catch(error => {
                console.error('Error loading songs:', error);
                showNotification('Failed to load tracks. Please refresh the page.', 'error');
            });
    }

    function deleteSong(songId) {
        fetch(`/api/songs/${songId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Track deleted successfully!', 'success');
                loadSongs();
            } else {
                showNotification(data.error || 'Failed to delete track.', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting song:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    }

    function playSong(song) {
        // Create a temporary audio element to play the song
        const audio = new Audio(song.file);
        audio.play();
    }

    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
