const DEEZER_API = 'https://api.deezer.com';

class Song {
    constructor(id, title, artist, cover, previewUrl) {
        this.id = id;
        this.title = title;
        this.artist = artist;
        this.cover = cover;
        this.previewUrl = previewUrl || '';
    }
}

class Playlist {
    constructor(id, name, songs = []) {
        this.id = id;
        this.name = name;
        this.songs = songs;
    }

    addSong(song) {
        if (!this.songs.find(s => s.id === song.id)) {
            this.songs.push(song);
        }
    }

    removeSong(id) {
        this.songs = this.songs.filter(s => s.id !== id);
    }
}

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.playlist = [];

        this.audio.volume = 0.85;

        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
    }

    loadPlaylist(songs) {
        this.playlist = songs;
        this.currentSongIndex = 0;
    }

    playSong(index) {
        if (index < 0 || index >= this.playlist.length) {
            console.warn("Неверный индекс трека:", index);
            return;
        }

        this.currentSongIndex = index;
        const song = this.playlist[index];

        if (!song.previewUrl) {
            alert(`У трека "${song.title}" нет preview (30 сек)`);
            return;
        }

        this.audio.src = song.previewUrl;
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updateNowPlaying();
            this.updatePlayButton();
        }).catch(err => {
            console.error("Playback error:", err);
            alert("Не удалось воспроизвести трек. Попробуйте другой.");
        });
    }

    togglePlay() {
        if (!this.playlist.length) return;
        if (this.audio.paused) {
            this.audio.play();
            this.isPlaying = true;
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
        this.updatePlayButton();
    }

    updatePlayButton() {
        const btn = document.getElementById('play-pause-btn');
        btn.classList.toggle('fa-play-circle', !this.isPlaying);
        btn.classList.toggle('fa-pause-circle', this.isPlaying);
    }

    updateNowPlaying() {
        const song = this.playlist[this.currentSongIndex];
        if (!song) return;

        document.getElementById('now-title').textContent = song.title;
        document.getElementById('now-artist').textContent = song.artist;

        const coverEl = document.getElementById('now-cover');
        coverEl.innerHTML = song.cover && song.cover.startsWith('http') 
            ? `<img src="${song.cover}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
            : `<span style="font-size:28px;">${song.cover}</span>`;
    }

    updateProgress() {
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('progress').style.width = percent + '%';

        document.getElementById('current-time').textContent = this.formatTime(this.audio.currentTime);
        document.getElementById('duration').textContent = this.formatTime(this.audio.duration);
    }

    seek(e) {
        const bar = document.getElementById('progress-bar');
        const percent = e.offsetX / bar.offsetWidth;
        this.audio.currentTime = percent * this.audio.duration;
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    nextTrack() {
        let next = this.currentSongIndex + 1;
        if (next >= this.playlist.length) {
            next = this.isRepeat ? 0 : this.currentSongIndex;
        }
        this.playSong(next);
    }

    prevTrack() {
        let prev = this.currentSongIndex - 1;
        if (prev < 0) prev = this.playlist.length - 1;
        this.playSong(prev);
    }

    handleTrackEnd() {
        if (this.isRepeat) {
            this.playSong(this.currentSongIndex);
        } else {
            this.nextTrack();
        }
    }

    setVolume(val) {
        this.audio.volume = val / 100;
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
    }
}

let allSongs = [];
let playlists = [];

let userProfile = {
    name: "Вика Бурмистрова",
    status: "Premium",
    avatar: "🌸",
    bio: "Люблю атмосферную музыку, кофе и закаты"
};

let isEditingProfile = false;

const PROXIES = [
    "https://proxy.corsfix.com/?",
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://api.allorigins.win/get?url="
];

async function searchTracks(query = "top hits 2025") {
    const loadingHTML = `
        <div style="text-align:center;padding:80px;color:#777;">
            <i class="fas fa-spinner fa-spin" style="font-size:42px;margin-bottom:16px;"></i>
            <p>Загрузка треков из Deezer...</p>
        </div>`;

    document.getElementById('song-list').innerHTML = loadingHTML;

    for (let proxy of PROXIES) {
        try {
            let fullUrl = proxy.includes('allorigins') 
                ? proxy + encodeURIComponent(`${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=25`)
                : proxy + `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=25`;

            const res = await fetch(fullUrl);
            if (!res.ok) continue;

            let data;
            const text = await res.text();

            if (proxy.includes('allorigins')) {
                const json = JSON.parse(text);
                data = JSON.parse(json.contents);
            } else {
                data = JSON.parse(text);
            }

            if (data?.data?.length > 0) {
                allSongs = data.data.map(track => new Song(
                    track.id,
                    track.title,
                    track.artist.name,
                    track.album.cover_medium,
                    track.preview
                ));

                renderSongList(allSongs);
                console.log(`✅ Успешно загружено через ${proxy}`);
                return;
            }
        } catch (e) {
            console.log(`Прокси ${proxy} не сработал`);
        }
    }

    console.error("Все прокси не сработали");
    document.getElementById('song-list').innerHTML = `
        <div style="text-align:center;padding:60px;color:#ff6666;">
            <p>Не удалось загрузить треки из API</p>
            <button onclick="loadDemoData()" 
                    style="margin-top:20px;padding:12px 28px;background:#7b4dff;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
                Загрузить демо-треки
            </button>
        </div>`;
}

function loadDemoData() {
    allSongs = [
        new Song(1, "Blinding Lights", "The Weeknd", "🌃", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"),
        new Song(2, "Levitating", "Dua Lipa", "✨", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"),
        new Song(3, "Save Your Tears", "The Weeknd", "💧", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"),
        new Song(4, "Kiss Me More", "Doja Cat", "💋", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"),
        new Song(5, "Stay", "The Kid LAROI", "🕯️", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"),
    ];
    renderSongList(allSongs);
}

function renderSongList(songs) {
    const container = document.getElementById('song-list');
    container.innerHTML = '';

    if (songs.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:60px;color:#777;">Треки не найдены</div>`;
        return;
    }

    songs.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <div class="song-cover">
                ${song.cover && song.cover.startsWith('http') 
                    ? `<img src="${song.cover}" alt="cover" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` 
                    : song.cover || '🎵'}
            </div>
            <div class="song-info">
                <h4>${song.title}</h4>
                <p>${song.artist}</p>
            </div>
            <div></div>
            <div class="song-actions">
                <div class="btn-icon btn-play" onclick="playSongFromList(${index}); event.stopImmediatePropagation();">
                    <i class="fas fa-play"></i>
                </div>
                <div class="btn-icon btn-delete" onclick="deleteSong(${song.id}); event.stopImmediatePropagation();">
                    <i class="fas fa-trash"></i>
                </div>
                <div class="btn-icon btn-add" onclick="addToPlaylist(${song.id}); event.stopImmediatePropagation();">
                    <i class="fas fa-plus"></i>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderPlaylists() {
    const container = document.getElementById('playlist-list');
    container.innerHTML = '';

    playlists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <i class="fas fa-list"></i>
            <span>${pl.name}</span>
            <span style="margin-left:auto;color:#777;font-size:13px;">${pl.songs.length}</span>
        `;
        div.onclick = () => loadPlaylist(pl);
        container.appendChild(div);
    });
}

function renderAllPlaylists() {
    const container = document.getElementById('song-list');
    
    let html = `
        <div style="margin-bottom: 30px;">
            <h2 style="margin-bottom: 20px;">Мои плейлисты</h2>
            <button onclick="createPlaylist()" style="padding:10px 20px; background:#7b4dff; color:white; border:none; border-radius:8px; cursor:pointer; margin-bottom:20px;">
                <i class="fas fa-plus"></i> Создать новый плейлист
            </button>
        </div>
    `;

    if (playlists.length === 0) {
        html += `<p style="color:#777; text-align:center; padding:40px;">У вас пока нет плейлистов</p>`;
    } else {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">`;
        
        playlists.forEach(pl => {
            html += `
                <div onclick="openPlaylist(${pl.id})" style="background:#1a1a22; border-radius:12px; padding:16px; cursor:pointer; transition:0.2s;">
                    <div style="height:160px; background:#2a2a35; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                        <i class="fas fa-list" style="font-size:48px; opacity:0.6;"></i>
                    </div>
                    <h3 style="margin:0 0 6px 0;">${pl.name}</h3>
                    <p style="margin:0; color:#aaa; font-size:14px;">${pl.songs.length} треков</p>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

function openPlaylist(id) {
    const playlist = playlists.find(pl => pl.id === id);
    if (playlist) {
        loadPlaylist(playlist);
    }
}

function renderProfile() {
    const container = document.getElementById('song-list');
    
    if (isEditingProfile) {
        container.innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="profile-avatar big" onclick="changeAvatar()">${userProfile.avatar}</div>
                    <div>
                        <input 
                            type="text" 
                            id="edit-name" 
                            value="${userProfile.name}" 
                            class="profile-name-input"
                            autocomplete="off"
                            spellcheck="false">
                        <p class="profile-status">Premium</p>
                    </div>
                </div>
                
                <div class="profile-bio-edit">
                    <label>О себе</label>
                    <textarea id="edit-bio" placeholder="Напишите о себе...">${userProfile.bio}</textarea>
                </div>
                
                <div class="profile-actions">
                    <button class="save-btn" onclick="saveProfileChanges()">Сохранить изменения</button>
                    <button class="cancel-btn" onclick="cancelProfileEdit()">Отмена</button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="profile-avatar big" onclick="startEditing()">${userProfile.avatar}</div>
                    <div>
                        <h1 class="profile-name">${userProfile.name}</h1>
                        <p class="profile-status">Premium</p>
                    </div>
                </div>
                
                <div class="profile-bio">
                    <p>${userProfile.bio || "Здесь будет информация о вас..."}</p>
                </div>
                
                <button class="edit-profile-btn" onclick="startEditing()">
                    <i class="fas fa-edit"></i> Редактировать профиль
                </button>
            </div>
        `;
    }
}

function startEditing() { isEditingProfile = true; renderProfile(); }
function saveProfileChanges() {
    const newName = document.getElementById('edit-name').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();

    if (newName) userProfile.name = newName;
    if (newBio !== null) userProfile.bio = newBio;

    isEditingProfile = false;
    saveProfile();
    renderProfile();
}
function cancelProfileEdit() { isEditingProfile = false; renderProfile(); }
function changeAvatar() {
    const newAvatar = prompt("Введите новый аватар (эмодзи или букву):", userProfile.avatar);
    if (newAvatar && newAvatar.trim() !== "") {
        userProfile.avatar = newAvatar.trim();
        renderProfile();
    }
}

function loadPlaylist(playlist) {
    player.loadPlaylist(playlist.songs);
    renderSongList(playlist.songs);
    document.querySelector('.section-title span').textContent = playlist.name;
}

function playSongFromList(index) {
    if (player.playlist !== allSongs || player.playlist.length === 0) {
        player.loadPlaylist(allSongs);
    }
    player.playSong(index);
}

function togglePlay() { player.togglePlay(); }
function nextTrack() { player.nextTrack(); }
function prevTrack() { player.prevTrack(); }
function seek(e) { player.seek(e); }
function setVolume(val) { player.setVolume(val); }
function toggleShuffle() { player.toggleShuffle(); }
function toggleRepeat() { player.toggleRepeat(); }

function addToPlaylist(id) {
    const song = allSongs.find(s => s.id === id);
    if (!song) return;

    const playlistName = prompt('В какой плейлист добавить трек?', playlists[0]?.name || "Новый плейлист");
    if (!playlistName) return;

    let playlist = playlists.find(p => p.name === playlistName);
    if (!playlist) {
        playlist = new Playlist(Date.now(), playlistName);
        playlists.push(playlist);
    }

    playlist.addSong(song);
    saveToLocalStorage();
    renderPlaylists();
    alert(`Трек добавлен в "${playlist.name}"`);
}

function createPlaylist() {
    const name = prompt('Введите название нового плейлиста:');
    if (name && name.trim()) {
        playlists.push(new Playlist(Date.now(), name.trim()));
        saveToLocalStorage();
        renderPlaylists();
        if (document.querySelector('.section-title span').textContent === 'Мои плейлисты') {
            renderAllPlaylists();
        }
    }
}

function deleteSong(id) {
    if (!confirm('Удалить этот трек из библиотеки?')) return;
    
    allSongs = allSongs.filter(s => s.id !== id);
    playlists.forEach(pl => pl.removeSong(id));
    saveToLocalStorage();
    renderSongList(allSongs);
    renderPlaylists();
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) searchTracks(query);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[tab].classList.add('active');

    const titleEl = document.querySelector('.section-title span');

    if (tab === 0) {
        titleEl.textContent = 'Популярное сегодня';
        renderSongList(allSongs);
    } else if (tab === 1) {
        titleEl.textContent = 'Мои плейлисты';
        renderAllPlaylists();
    } else if (tab === 2) {
        titleEl.textContent = 'Профиль';
        renderProfile();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('melodix_playlists', JSON.stringify(playlists));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('melodix_playlists');
    if (saved) {
        playlists = JSON.parse(saved).map(pl => new Playlist(pl.id, pl.name, pl.songs));
    } else {
        playlists = [
            new Playlist(1, "Любимые треки"),
            new Playlist(2, "Для тренировок"),
            new Playlist(3, "Chill Vibes")
        ];
    }
}

function saveProfile() {
    localStorage.setItem('melodix_user_profile', JSON.stringify(userProfile));
}

function loadProfile() {
    const saved = localStorage.getItem('melodix_user_profile');
    if (saved) {
        Object.assign(userProfile, JSON.parse(saved));
    }
}

const player = new MusicPlayer();

function init() {
    loadFromLocalStorage();
    loadProfile();
    renderPlaylists();

    searchTracks("top hits 2025");


    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && 
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            player.togglePlay();
        }
        if (e.code === 'ArrowRight') player.nextTrack();
        if (e.code === 'ArrowLeft') player.prevTrack();
    });

    console.log('%cMelodix успешно запущен ✅', 'color:#7b4dff;font-size:16px;font-weight:bold;');
}

window.onload = init;