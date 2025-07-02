function videoPlayer() {
  return {
    video: null,
    poster: null,
    firstFrame: null,
    isPlaying: false,
    isMuted: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    progress: 0,
    isVideoLoaded: false,

    init() {
      console.log("init video player", this.$refs.video)
      this.video = this.$refs.video;
      this.poster = this.video.getAttribute('data-poster');
      this.isMuted = this.video.muted;
      this.volume = this.video.volume;
      
      // 如果提供了 poster，直接标记为已加载
      if (this.poster) {
        this.video.poster = this.poster;
        this.isVideoLoaded = true;
      }
    },

    async onVideoLoaded() {
      console.log("onVideoLoaded")
      if (!this.poster) {
        // 等待一小段时间确保视频帧已经准备好
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 确保视频尺寸有效
        if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = this.video.videoWidth;
          canvas.height = this.video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          // 将视频时间设置到开始位置
          this.video.currentTime = 0;
          
          // 等待视频帧更新
          await new Promise(resolve => {
            this.video.onseeked = () => {
              ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
              this.firstFrame = canvas.toDataURL('image/jpeg');
              this.video.poster = this.firstFrame;
              resolve();
            };
          });
        }
      }
      this.isVideoLoaded = true;
    },

    togglePlay() {
      console.log("togglePlay", this.$refs.video)
      if (this.video.paused) {
        // 如果视频还未加载，先加载视频
        if (!this.isVideoLoaded) {
          this.video.load();
        }
        this.video.play();
        this.isPlaying = true;
      } else {
        this.video.pause();
        this.isPlaying = false;
      }
    },

    toggleMute() {
      console.log("toggleMute")
      this.video.muted = !this.video.muted;
      this.isMuted = this.video.muted;
    },

    updateVolume() {
      console.log("updateVolume")
      this.video.volume = this.volume;
      this.isMuted = this.volume === 0;
    },

    updateProgress() {
      console.log("updateProgress")
      this.currentTime = this.video.currentTime;
      this.progress = (this.currentTime / this.duration) * 100;
    },

    seekVideo(e) {
      console.log("seekVideo")
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      this.video.currentTime = pos * this.duration;
    },

    setDuration() {
      console.log("setDuration")
      this.duration = this.video.duration;
    },

    onVideoEnd() {
      console.log("onVideoEnd")
      this.isPlaying = false;
      this.progress = 0;
    },

    toggleFullscreen() {
      console.log("toggleFullscreen")
      if (!document.fullscreenElement) {
        this.video.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    },

    formatTime(seconds) {
      console.log("formatTime")
      const minutes = Math.floor(seconds / 60);
      seconds = Math.floor(seconds % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    },
  };
}

export default videoPlayer;
