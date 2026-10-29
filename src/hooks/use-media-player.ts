import { useCallback, useEffect, useRef, useState } from 'react'

interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  getPlayerState(): number
  destroy(): void
}

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
 * One interface over a YouTube embed or a native <audio>/<video> element:
 * current time (polled ~4×/s), total duration once known, seeking and play state.
 */
export function useMediaPlayer(url: string, startAt: number | null) {
  const ytId = youtubeId(url)
  const ytHost = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const ytPlayer = useRef<YTPlayer | null>(null)
  const [time, setTime] = useState(0)
  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!ytId || !ytHost.current) return
    let cancelled = false
    let poll: number | undefined
    const host = document.createElement('div')
    ytHost.current.appendChild(host)

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return
      ytPlayer.current = new window.YT.Player(host, {
        videoId: ytId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: startAt ? Math.floor(startAt) : undefined },
        events: {
          onReady: () => {
            setReady(true)
            poll = window.setInterval(() => {
              setTime(ytPlayer.current?.getCurrentTime() ?? 0)
              // YouTube reports 0 until the video's metadata has loaded
              setDuration(ytPlayer.current?.getDuration() ?? 0)
            }, 250)
          },
        },
      })
    })

    return () => {
      cancelled = true
      window.clearInterval(poll)
      ytPlayer.current?.destroy()
      ytPlayer.current = null
      host.remove()
      setReady(false)
    }
    // startAt is only applied when the player is created
  }, [ytId])

  const seek = useCallback(
    (seconds: number, play = true) => {
      if (ytId) {
        ytPlayer.current?.seekTo(seconds, true)
        if (play) ytPlayer.current?.playVideo()
      } else if (mediaRef.current) {
        mediaRef.current.currentTime = seconds
        if (play) mediaRef.current.play().catch(() => {})
      }
      setTime(seconds)
    },
    [ytId],
  )

  const onNativeReady = useCallback((e: React.SyntheticEvent<HTMLMediaElement>) => {
    setReady(true)
    // live streams report Infinity
    if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration)
    if (startAt && mediaRef.current) mediaRef.current.currentTime = startAt
  }, [startAt])

  return {
    kind: ytId ? ('youtube' as const) : ('native' as const),
    ytHost,
    mediaRef,
    time,
    duration,
    ready,
    seek,
    nativeProps: {
      onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => setTime(e.currentTarget.currentTime),
      onLoadedMetadata: onNativeReady,
    },
  }
}
