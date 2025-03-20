from flask import Flask, render_template, jsonify, request, send_from_directory, url_for, abort
import os
import json
from datetime import datetime
import uuid

app = Flask(__name__)

# Constants
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
SONGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'songs.json')

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Create songs.json if it doesn't exist
if not os.path.exists(SONGS_FILE):
    with open(SONGS_FILE, 'w') as f:
        json.dump([], f)

@app.route('/')
def index():
    # Load songs data to pass to template
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r') as f:
            songs = json.load(f)
        
        # Add file paths for frontend
        for song in songs:
            song['file'] = url_for('serve_upload', filename=song["filename"])
            song['cover'] = url_for('serve_upload', filename=song["cover_filename"])
        
        # Group songs by album
        albums = {}
        for song in songs:
            album_name = song['album']
            if album_name not in albums:
                albums[album_name] = {
                    'name': album_name,
                    'songs': [],
                    'cover': song['cover']  # Use the first song's cover as album cover
                }
            albums[album_name]['songs'].append(song)
        
        # Convert to list for the template
        albums_list = list(albums.values())
    else:
        songs = []
        albums_list = []
    
    return render_template('index.html', songs=songs, albums=albums_list)

@app.route('/api/songs')
def get_songs():
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r') as f:
            songs = json.load(f)
        # Add file paths for frontend
        for song in songs:
            song['file'] = url_for('serve_upload', filename=song["filename"])
            song['cover'] = url_for('serve_upload', filename=song["cover_filename"])
        return jsonify(songs)
    return jsonify([])

@app.route('/static/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/admin')
def admin_panel():
    # Load songs data to pass to template
    if os.path.exists(SONGS_FILE):
        with open(SONGS_FILE, 'r') as f:
            tracks = json.load(f)
    else:
        tracks = []
    return render_template('admin_panel.html', tracks=tracks)

@app.route('/api/songs/<string:song_id>', methods=['DELETE'])
def delete_song(song_id):
    print(f"Delete request received for song ID: {song_id}")
    
    try:
        # Ensure the songs file exists
        if not os.path.exists(SONGS_FILE):
            print("Songs file not found")
            return jsonify({"error": "Songs database not found"}), 500
        
        # Read the current songs data
        with open(SONGS_FILE, 'r') as f:
            songs = json.load(f)
        
        # Find the song to delete
        song_to_delete = None
        song_index = None
        
        for i, song in enumerate(songs):
            if song.get('id') == song_id:
                song_to_delete = song
                song_index = i
                break
        
        # If song not found, return 404
        if song_to_delete is None:
            print(f"Song with ID {song_id} not found")
            return jsonify({"error": "Song not found"}), 404
        
        print(f"Found song to delete: {song_to_delete['title']} at index {song_index}")
        
        # Try to delete the files
        try:
            # Delete music file if it exists
            if song_to_delete.get('filename'):
                music_path = os.path.join(UPLOAD_FOLDER, song_to_delete['filename'])
                if os.path.exists(music_path):
                    os.remove(music_path)
                    print(f"Deleted music file: {music_path}")
                else:
                    print(f"Music file not found: {music_path}")
            
            # Delete cover image if it exists
            if song_to_delete.get('cover_filename'):
                cover_path = os.path.join(UPLOAD_FOLDER, song_to_delete['cover_filename'])
                if os.path.exists(cover_path):
                    os.remove(cover_path)
                    print(f"Deleted cover file: {cover_path}")
                else:
                    print(f"Cover file not found: {cover_path}")
                    
        except Exception as e:
            print(f"Error deleting files: {str(e)}")
            # Continue with song deletion from database even if file deletion fails
        
        # Remove the song from the list
        removed_song = songs.pop(song_index)
        print(f"Removed song from list: {removed_song['title']}")
        
        # Save the updated songs list
        with open(SONGS_FILE, 'w') as f:
            json.dump(songs, f, indent=4)
        
        print("Updated songs file saved")
        
        return jsonify({
            "success": True,
            "message": f"Song '{removed_song['title']}' successfully deleted",
            "deleted_song": removed_song
        })
        
    except Exception as e:
        print(f"Error in delete_song: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
