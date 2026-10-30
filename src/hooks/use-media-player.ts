import { useCallback, useEffect, useRef, useState } from 'react'

interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  getVideoLoadedFraction(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  getPlayerState(): number
  setVolume(volume: number): void
  mute(): void
  unMute(): void
  setPlaybackRate(rate: number): void
  unloadModule?(name: string): void
  setOption?(module: string, option: string, value: unknown): void
  destroy(): void
}

/** YT.PlayerState values */
const YT_PLAYING = 1
const YT_BUFFERING = 3
/** Polls (of 250ms) that the clock may stand still while "playing" before we take it for an ad. */
const AD_STALL_POLLS = 6

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

export function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return match?.[1] ?? null
}

let ytPromise: Promise<void> | null = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve()
  ytPromise ??= new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return ytPromise
}

/**
 * One interface over a YouTube embed or a native <audio>/<video> element, for the page's own controls:
 * current time (polled ~4×/s on YouTube), duration, buffered end, play state, volume and speed.
 * YouTube's own controls, captions, cards and keyboard handling are switched off.
 */
export function useMediaPlayer(url: string, startAt: number | null) {
  const ytId = youtubeId(url)
  const ytHost = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const ytPlayer = useRef<YTPlayer | null>(null)
  const [time, setTime] = useState(0)
  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [volume, setVolumeState] = useState(100)
  const [muted, setMuted] = useState(false)
  const [rate, setRateState] = useState(1)
  // YouTube doesn't say when an ad runs; a clock that stands still while "playing" is the tell
  const [ad, setAd] = useState(false)

  useEffect(() => {
    if (!ytId || !ytHost.current) return
    let cancelled = false
    let poll: number | undefined
    const host = document.createElement('div')
    ytHost.current.appendChild(host)
    // not in YouTube's documented API, but the long-standing way to keep its captions off
    const hideCaptions = () => {
      ytPlayer.current?.setOption?.('captions', 'track', {})
      ytPlayer.current?.unloadModule?.('captions')
    }

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return
      ytPlayer.current = new window.YT.Player(host, {
        videoId: ytId,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          start: startAt ? Math.floor(startAt) : undefined,
        },
        events: {
          onReady: () => {
            setReady(true)
            hideCaptions()
            let last = -1
            let still = 0
            poll = window.setInterval(() => {
              const p = ytPlayer.current
              if (!p) return
              const t = p.getCurrentTime() ?? 0
              const state = p.getPlayerState()
              setTime(t)
              // YouTube reports 0 until the video's metadata has loaded
              const d = p.getDuration() ?? 0
              setDuration(d)
              setBuffered((p.getVideoLoadedFraction() ?? 0) * d)
              setPlaying(state === YT_PLAYING)
              setWaiting(state === YT_BUFFERING)
              still = state === YT_PLAYING && Math.abs(t - last) < 0.01 ? still + 1 : 0
              last = t
              setAd(still >= AD_STALL_POLLS)
            }, 250)
          },
          // the captions module loads again once playback starts, and on some later state changes
          onApiChange: hideCaptions,
          onStateChange: hideCaptions,
        },
      })
    })

    // a click inside the embed moves focus into it, where the page's shortcuts can't hear keys
    const onBlur = () =>
      window.setTimeout(() => {
        if (document.activeElement instanceof HTMLIFrameElement && ytHost.current?.contains(document.activeElement)) document.activeElement.blur()
      })
    window.addEventListener('blur', onBlur)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      window.removeEventListener('blur', onBlur)
      ytPlayer.current?.destroy()
      ytPlayer.current = null
      host.remove()
      setReady(false)
    }
    // startAt is only applied when the player is created
  }, [ytId])

  const play = useCallback(() => {
    if (ytId) ytPlayer.current?.playVideo()
    else mediaRef.current?.play().catch(() => {})
  }, [ytId])

  const pause = useCallback(() => {
    if (ytId) ytPlayer.current?.pauseVideo()
    else mediaRef.current?.pause()
  }, [ytId])

  const toggle = useCallback(() => {
    const isPlaying = ytId ? ytPlayer.current?.getPlayerState() === YT_PLAYING : mediaRef.current && !mediaRef.current.paused
    if (isPlaying) pause()
    else play()
    // YouTube only reports the change on the next poll; show it now
    if (ytId) setPlaying(!isPlaying)
  }, [ytId, play, pause])

  const seek = useCallback(
    (seconds: number, play = true) => {
      const to = Math.max(0, duration ? Math.min(seconds, duration) : seconds)
      if (ytId) {
        ytPlayer.current?.seekTo(to, true)
        if (play) ytPlayer.current?.playVideo()
      } else if (mediaRef.current) {
        mediaRef.current.currentTime = to
        if (play) mediaRef.current.play().catch(() => {})
      }
      setTime(to)
    },
    [ytId, duration],
  )

  /** 0–100 */
  const setVolume = useCallback(
    (v: number) => {
      const next = Math.max(0, Math.min(100, Math.round(v)))
      if (ytId) {
        ytPlayer.current?.setVolume(next)
        if (next > 0) ytPlayer.current?.unMute()
        setVolumeState(next)
        setMuted(next === 0)
      } else if (mediaRef.current) {
        mediaRef.current.volume = next / 100
        mediaRef.current.muted = next === 0
      }
    },
    [ytId],
  )

  const toggleMute = useCallback(() => {
    if (ytId) {
      if (muted) ytPlayer.current?.unMute()
      else ytPlayer.current?.mute()
      setMuted(!muted)
    } else if (mediaRef.current) {
      mediaRef.current.muted = !mediaRef.current.muted
      // unmuting at zero volume would still be silent
      if (!mediaRef.current.muted && mediaRef.current.volume === 0) mediaRef.current.volume = 0.5
    }
  }, [ytId, muted])

  const setRate = useCallback(
    (r: number) => {
      if (ytId) ytPlayer.current?.setPlaybackRate(r)
      else if (mediaRef.current) mediaRef.current.playbackRate = r
      setRateState(r)
    },
    [ytId],
  )

  const onNativeReady = useCallback((e: React.SyntheticEvent<HTMLMediaElement>) => {
    setReady(true)
    // live streams report Infinity
    if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration)
    if (startAt && mediaRef.current) mediaRef.current.currentTime = startAt
  }, [startAt])

  const onNativeProgress = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const b = e.currentTarget.buffered
    if (b.length) setBuffered(b.end(b.length - 1))
  }

  return {
    kind: ytId ? ('youtube' as const) : ('native' as const),
    ytHost,
    mediaRef,
    time,
    duration,
    buffered,
    ready,
    playing,
    waiting,
    volume,
    muted,
    rate,
    ad,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    toggleMute,
    setRate,
    nativeProps: {
      onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => setTime(e.currentTarget.currentTime),
      onLoadedMetadata: onNativeReady,
      onDurationChange: (e: React.SyntheticEvent<HTMLMediaElement>) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration),
      onProgress: onNativeProgress,
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onEnded: () => setPlaying(false),
      onWaiting: () => setWaiting(true),
      onPlaying: () => {
        setWaiting(false)
        setPlaying(true)
      },
      onCanPlay: () => setWaiting(false),
      onVolumeChange: (e: React.SyntheticEvent<HTMLMediaElement>) => {
        setVolumeState(Math.round(e.currentTarget.volume * 100))
        setMuted(e.currentTarget.muted || e.currentTarget.volume === 0)
      },
      onRateChange: (e: React.SyntheticEvent<HTMLMediaElement>) => setRateState(e.currentTarget.playbackRate),
    },
  }
}

export type MediaPlayer = ReturnType<typeof useMediaPlayer>
