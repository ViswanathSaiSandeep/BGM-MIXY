from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import json
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import time

app = Flask(__name__)

# Constants
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
SONGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'songs.json')

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Create songs.json if it doesn't exist
if not os.path.exists(SONGS_FILE):
    with open(SONGS_FILE, 'w') as f:
        json.dump([], f)

# Allowed extensions
ALLOWED_AUDIO = {'mp3', 'wav', 'ogg'}
ALLOWED_IMAGE = {'jpg', 'jpeg', 'png', 'gif'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

@app.route('/')
def admin_panel():
    # Load songs for display in the admin panel
    songs = []
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r') as f:
            songs = json.load(f)
            
    return render_template('admin_panel.html', tracks=songs)

@app.route('/upload', methods=['POST'])
def upload_song():
    # Check if files are present
    if 'music' not in request.files or 'cover' not in request.files:
        return jsonify({'error': 'Both music and cover files are required'}), 400
    
    music_file = request.files['music']
    cover_file = request.files['cover']
    
    # Check if files are selected
    if music_file.filename == '' or cover_file.filename == '':
        return jsonify({'error': 'Both music and cover files must be selected'}), 400
    
    # Check file types
    if not allowed_file(music_file.filename, ALLOWED_AUDIO):
        return jsonify({'error': 'Invalid audio file format. Allowed formats: mp3, wav, ogg'}), 400
    
    if not allowed_file(cover_file.filename, ALLOWED_IMAGE):
        return jsonify({'error': 'Invalid image file format. Allowed formats: jpg, jpeg, png, gif'}), 400
    
    # Get form data
    title = request.form.get('title', '').strip()
    artist = request.form.get('artist', '').strip()
    album = request.form.get('album', '').strip()
    
    if not title or not artist:
        return jsonify({'error': 'Title and artist are required'}), 400
    
    # Generate unique filenames
    song_id = str(uuid.uuid4())
    timestamp = int(time.time())
    music_filename = f"{timestamp}_{secure_filename(music_file.filename)}"
    cover_filename = f"{timestamp}_{secure_filename(cover_file.filename)}"
    
    # Save files
    music_path = os.path.join(UPLOAD_FOLDER, music_filename)
    cover_path = os.path.join(UPLOAD_FOLDER, cover_filename)
    
    music_file.save(music_path)
    cover_file.save(cover_path)
    
    # Resize cover image if needed
    try:
        with Image.open(cover_path) as img:
            # Resize to 300x300 if larger
            if img.width > 300 or img.height > 300:
                img = img.resize((300, 300), Image.LANCZOS)
                img.save(cover_path)
    except Exception as e:
        print(f"Error resizing image: {e}")
    
    # Add to songs.json
    song_entry = {
        'id': song_id,
        'title': title,
        'artist': artist,
        'album': album,
        'filename': music_filename,
        'cover_filename': cover_filename,
        'upload_time': timestamp
    }
    
    songs = []
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r') as f:
            songs = json.load(f)
    
    songs.append(song_entry)
    
    with open(SONGS_FILE, 'w') as f:
        json.dump(songs, f, indent=4)
    
    return jsonify({'success': True, 'message': 'Song uploaded successfully', 'song': song_entry}), 200

@app.route('/delete/<song_id>', methods=['DELETE'])
def delete_song(song_id):
    if not os.path.exists(SONGS_FILE):
        return jsonify({'error': 'No songs found'}), 404
    
    with open(SONGS_FILE, 'r') as f:
        songs = json.load(f)
    
    # Find song with given ID
    song_to_delete = None
    for song in songs:
        if song.get('id') == song_id:
            song_to_delete = song
            break
    
    if not song_to_delete:
        return jsonify({'error': 'Song not found'}), 404
    
    # Delete the files
    try:
        music_path = os.path.join(UPLOAD_FOLDER, song_to_delete['filename'])
        cover_path = os.path.join(UPLOAD_FOLDER, song_to_delete['cover_filename'])
        
        if os.path.exists(music_path):
            os.remove(music_path)
        
        if os.path.exists(cover_path):
            os.remove(cover_path)
    except Exception as e:
        print(f"Error deleting files: {e}")
    
    # Remove from songs list
    songs = [song for song in songs if song.get('id') != song_id]
    
    # Save updated songs list
    with open(SONGS_FILE, 'w') as f:
        json.dump(songs, f, indent=4)
    
    return jsonify({'success': True, 'message': 'Song deleted successfully'}), 200

@app.route('/api/songs')
def get_songs():
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r') as f:
            songs = json.load(f)
        return jsonify(songs)
    return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=5001)
