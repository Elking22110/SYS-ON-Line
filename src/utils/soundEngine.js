/**
 * Sound Engine for the POS System
 * Provides high-quality UI sound effects
 */

const SOUND_URLS = {
  // Premium UI Sounds from common CDNs
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Subtle click
  pop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',   // Soft pop
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Success chime
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',   // Error thud
  warning: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // Warning ping
  notification: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3', // Notification ping
  startup: 'https://assets.mixkit.co/active_storage/sfx/2581/2581-preview.mp3' // Startup wash
};

class SoundEngine {
  constructor() {
    this.audioCache = {};
    this.isMuted = localStorage.getItem('app_muted') === 'true';
    this.volume = parseFloat(localStorage.getItem('app_volume') || '0.5');
  }

  /**
   * Preload critical sounds
   */
  preload() {
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.load();
      this.audioCache[key] = audio;
    });
  }

  /**
   * Play a sound by key
   * @param {string} key - Sound key from SOUND_URLS
   * @param {number} forceVolume - Optional volume override (0-1)
   */
  play(key, forceVolume = null) {
    if (this.isMuted) return;

    try {
      const url = SOUND_URLS[key];
      if (!url) return;

      // Create a new instance every time to allow overlapping sounds (e.g. rapid clicks)
      const audio = new Audio(url);
      audio.volume = forceVolume !== null ? forceVolume : this.volume;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play policy might block this if user hasn't interacted yet
          console.debug('Sound play blocked or failed:', error);
        });
      }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }

  /**
   * Special handler for global click sound
   */
  playClick() {
    this.play('click', 0.2); // Lower volume for frequent clicks
  }

  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('app_muted', muted);
  }

  setVolume(volume) {
    this.volume = volume;
    localStorage.setItem('app_volume', volume);
  }
}

export const soundEngine = new SoundEngine();
