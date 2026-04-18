/**
 * @fileoverview Windows 98 sound effects player for Quarzite desktop.
 * Maps sound names to audio files and plays them at the current AppVolume level.
 * @exports window.W98
 */
(function () {
  /** @const {string} Base path for sound effect files */
  const base = "assets/w98sounds/";

  /**
   * @typedef {Object} SoundFiles
   * @property {string} chord - Chord sound file
   * @property {string} recycle - Recycle bin sound file
   * @property {string} click - Click sound file
   * @property {string} hideBar - Hide bar sound file
   * @property {string} microsoft - Easter egg Microsoft sound file
   */
  const files = {
    chord: "CHORD.mp3",
    recycle: "RECYCLE.mp3",
    click: "windows-98-click.wav",
    hideBar: "windows-98-hide-bar.wav",
    microsoft: "The Microsoft Sound.mp3", // Easter Egg sound
  };

  /**
   * Play a named sound effect.
   * @param {string} name - Sound name key from the files map.
   */
  function play(name) {
    const f = files[name];
    if (!f) return;
    const a = new Audio(base + f);
    a.volume = (window.AppVolume ?? 100) / 100;
    a.play().catch(() => {});
  }

  window.W98 = { play };
})();