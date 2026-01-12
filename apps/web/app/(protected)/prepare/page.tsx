'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMediaSession } from '@/lib/media/MediaSessionProvider'
import TopBar from '@/components/TopBar'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type MediaDevice = Pick<MediaDeviceInfo, 'deviceId' | 'kind' | 'label'>

export default function PreparePage() {
  const router = useRouter()
  const search = useSearchParams()
  const type = search.get('type') || 'self_intro'
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // 裝置清單與選擇
  const [devices, setDevices] = useState<MediaDevice[]>([])
  const audioInputs = useMemo(
    () => devices.filter(d => d.kind === 'audioinput'),
    [devices]
  )
  const videoInputs = useMemo(
    () => devices.filter(d => d.kind === 'videoinput'),
    [devices]
  )
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>()
  const [selectedCamId, setSelectedCamId] = useState<string | undefined>()

  // 下拉開關
  const [openMicMenu, setOpenMicMenu] = useState(false)
  const [openCamMenu, setOpenCamMenu] = useState(false)

  const {
    stream,
    ensureStream,
    audioEnabled,
    videoEnabled,
    setAudioEnabled,
    setVideoEnabled,
  } = useMediaSession()

  // 預設開啟音訊
  useEffect(() => {
    if (!audioEnabled) {
      setAudioEnabled(true)
      stream?.getAudioTracks().forEach(t => (t.enabled = true)) // 保持音訊開啟
    }
  }, [audioEnabled, stream, setAudioEnabled])

 

  // 監聽裝置變更（插拔裝置）
  useEffect(() => {
    const handler = async () => {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.map(({ deviceId, kind, label }) => ({ deviceId, kind, label })))
    }
    navigator.mediaDevices.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', handler)
  }, [])

  // 1) 掛載當下：確保取得 MediaStream、綁到 <video>、初始化裝置清單
  useEffect(() => {
    (async () => {
      const s = await ensureStream()                // 確保有同一個 MediaStream
      if (videoRef.current && videoRef.current.srcObject !== s) {
        videoRef.current.srcObject = s              // 綁到 <video>
        videoRef.current.muted = true
        ;(videoRef.current as any).playsInline = true
        try { await videoRef.current.play() } catch {}
      }
      // 有權限後，label 才會有值；此時初始化裝置清單
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        setDevices(list.map(({ deviceId, kind, label }) => ({ deviceId, kind, label })))
      } catch {}
    })().catch(e => alert(`無法取得相機/麥克風：${String(e)}`))
  }, [ensureStream])


  // 工具：以指定 deviceId 置換 track（保留原 stream 物件）
  const replaceTrack = useCallback(
    async (kind: 'audioinput' | 'videoinput', deviceId: string) => {
      const constraints: MediaStreamConstraints =
        kind === 'audioinput'
          ? { audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } }
          : { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } }

      const tmp = await navigator.mediaDevices.getUserMedia(constraints)

      if (!stream) return
      if (kind === 'audioinput') {
        const newTrack = tmp.getAudioTracks()[0]
        if (!newTrack) return
        stream.getAudioTracks().forEach(t => stream.removeTrack(t))
        stream.addTrack(newTrack)
        // 保持開關狀態一致
        newTrack.enabled = audioEnabled
      } else {
        const newTrack = tmp.getVideoTracks()[0]
        if (!newTrack) return
        stream.getVideoTracks().forEach(t => stream.removeTrack(t))
        stream.addTrack(newTrack)
        newTrack.enabled = videoEnabled
        // 重新綁定預覽
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      }
    },
    [stream, audioEnabled, videoEnabled]
  )

  // 切換音訊（僅改 enabled）
  const toggleAudio = useCallback(() => {
    setAudioEnabled(!audioEnabled)
    stream?.getAudioTracks().forEach(t => (t.enabled = !audioEnabled))
  }, [audioEnabled, setAudioEnabled, stream])
  
  const toggleVideo = useCallback(async () => {
    const s = stream ?? (await ensureStream())    // 取得最新可用的 stream
    const next = !videoEnabled
  
    // 若目前沒有 video track，開啟時補一條
    let vt = s.getVideoTracks()[0]
    if (!vt && next) {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      vt = tmp.getVideoTracks()[0]
      if (vt) s.addTrack(vt)
    }
  
    // 只切 enabled，不 stop
    s.getVideoTracks().forEach(t => (t.enabled = next))
    setVideoEnabled(next)
  
    // 確保 <video> 已綁到 s，開啟時主動觸發播放
    if (videoRef.current && videoRef.current.srcObject !== s) {
      videoRef.current.srcObject = s
    }
    if (next) {
      try { await videoRef.current?.play() } catch {}
    }
  }, [stream, videoEnabled, setVideoEnabled, ensureStream])
  

  // 選擇麥克風
  const handleSelectMic = useCallback(async (id: string) => {
    setSelectedMicId(id)
    await replaceTrack('audioinput', id)
    setOpenMicMenu(false)
  }, [replaceTrack])

  // 選擇相機
  const handleSelectCam = useCallback(async (id: string) => {
    setSelectedCamId(id)
    await replaceTrack('videoinput', id)
    setOpenCamMenu(false)
  }, [replaceTrack])

  // 顯示用的簡短標籤
  const currentMicLabel = useMemo(() => {
    const l = audioInputs.find(d => d.deviceId === selectedMicId)?.label || '預設麥克風'
    return l.replace(/\s*\(.*\)$/, '') // 去掉括號內冗餘描述
  }, [audioInputs, selectedMicId])

  const currentCamLabel = useMemo(() => {
    const l = videoInputs.find(d => d.deviceId === selectedCamId)?.label || '預設相機'
    return l.replace(/\s*\(.*\)$/, '')
  }, [videoInputs, selectedCamId])

  const handleStart = useCallback(() => {
    router.push(`/interview?type=${encodeURIComponent(type)}`)
  }, [router, type])

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-gray-900">
      <main className="mx-auto max-w-7xl px-8 py-8">
      <TopBar />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* 左：視訊預覽（佔 7 欄） */}
          <section className="lg:col-span-7">
          <div className="relative mx-auto rounded-[20px] overflow-hidden border border-black/10 bg-black shadow-xl w-[960px] max-w-full aspect-[16/9] min-h-[360px]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                style={{ opacity: videoEnabled ? 1 : 0.18 }}
              />

              {/* 左上：名稱徽章 */}
              <div className="absolute top-3 left-3 select-none">
                <div className="px-2.5 py-1 rounded-full bg-black/55 text-white text-xs border border-white/10 shadow-sm">
                  攝影 Yung
                </div>
              </div>

              {/* 右上：解析度徽章（可改為 track.getSettings() 實測值） */}
              <div className="absolute top-3 right-3 select-none">
                <div className="px-2 py-1 rounded-full bg-black/55 text-white text-[11px] border border-white/10 shadow-sm">
                  1080p
                </div>
              </div>

              {/* 底部：控制列（分裂按鈕＋下拉） */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[260px]">
                <div className="flex items-center justify-center gap-3 px-3 py-2 rounded-full bg-black/55 backdrop-blur-md border border-white/10 shadow-lg">


                  {/* 麥克風分裂按鈕 */}
                  <div className="relative">
                    <div className="flex items-center">
                      <button
                        type="button"
                        aria-label="切換麥克風"
                        title={currentMicLabel}
                        onClick={toggleAudio}
                        className={`w-12 h-12 rounded-l-full rounded-r-none flex items-center justify-center transition ring-1
                          ${audioEnabled ? 'bg-white text-black ring-white/40 hover:bg-white' : 'bg-red-600 text-white ring-red-500 hover:bg-red-700'}
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                          {audioEnabled ? (
                            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
                          ) : (
                            <path d="M3.28 2.22 2.22 3.28l4.1 4.1A6.97 6.97 0 0 0 5 11h2a5 5 0 0 1 .62-2.4l1.56 1.56V11a3 3 0 0 0 3 3c.28 0 .55-.04.8-.1l1.6 1.6A6.98 6.98 0 0 1 12 17a7 7 0 0 1-7-6h2a5 5 0 0 0 8.66 3.54l1.9 1.9 1.06-1.06L3.28 2.22zM9 6a3 3 0 0 1 5.22-2.05l-1.46 1.46A1.98 1.98 0 0 0 12 5a2 2 0 0 0-2 2v.88L9 6z"/>
                          )}
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="選擇麥克風裝置"
                        onClick={() => {
                          setOpenMicMenu(o => !o)
                          setOpenCamMenu(false)
                        }}
                        className={`w-10 h-12 rounded-r-full rounded-l-none flex items-center justify-center ring-1 transition
                          ${audioEnabled ? 'bg-white text-black ring-white/40 hover:bg-white' : 'bg-red-600 text-white ring-red-500 hover:bg-red-700'}
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                      </button>
                    </div>
                    {/* 當前裝置小標籤 */}
                    <div className="text-[10px] mt-1 text-center text-white/80 w-full truncate max-w-[88px]">{currentMicLabel}</div>

                    {/* 下拉清單 */}
                    {openMicMenu && (
                      <div className="absolute bottom-14 left-0 z-20 w-56 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/80 backdrop-blur p-1 shadow-2xl">
                        {audioInputs.length === 0 && (
                          <div className="px-3 py-2 text-xs text-white/70">無可用麥克風</div>
                        )}
                        {audioInputs.map(d => (
                          <button
                            key={d.deviceId}
                            onClick={() => handleSelectMic(d.deviceId)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                              d.deviceId === selectedMicId ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10'
                            }`}
                          >
                            {d.label || '未命名裝置'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 相機分裂按鈕 */}
                  <div className="relative">
                    <div className="flex items-center">
                      <button
                        type="button"
                        aria-label="切換相機"
                        title={currentCamLabel}
                        onClick={toggleVideo}
                        className={`w-12 h-12 rounded-l-full rounded-r-none flex items-center justify-center transition ring-1
                          ${videoEnabled ? 'bg-white text-black ring-white/40 hover:bg-white' : 'bg-gray-700 text-white ring-gray-600 hover:bg-gray-800'}
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                          {videoEnabled ? (
                            <path d="M15 8l5-3v14l-5-3v2H3V6h12v2z"/>
                          ) : (
                            <path d="M2.28 2.22 1.22 3.28 3 5.06V19h12v-3.94l4.72 4.72 1.06-1.06L2.28 2.22zM15 8.06V6H5.94L15 15.06V8.06zM20 5l-4 2.4V9l4-2.4V5z"/>
                          )}
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="選擇相機裝置"
                        onClick={() => {
                          setOpenCamMenu(o => !o)
                          setOpenMicMenu(false)
                        }}
                        className={`w-10 h-12 rounded-r-full rounded-l-none flex items-center justify-center ring-1 transition
                          ${videoEnabled ? 'bg-white text-black ring-white/40 hover:bg-white' : 'bg-gray-700 text-white ring-gray-600 hover:bg-gray-800'}
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                      </button>
                    </div>
                    {/* 當前裝置小標籤 */}
                    <div className="text-[10px] mt-1 text-center text-white/80 w-full truncate max-w-[88px]">{currentCamLabel}</div>

                    {/* 下拉清單 */}
                    {openCamMenu && (
                      <div className="absolute bottom-14 left-0 z-20 w-56 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/80 backdrop-blur p-1 shadow-2xl">
                        {videoInputs.length === 0 && (
                          <div className="px-3 py-2 text-xs text-white/70">無可用相機</div>
                        )}
                        {videoInputs.map(d => (
                          <button
                            key={d.deviceId}
                            onClick={() => handleSelectCam(d.deviceId)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                              d.deviceId === selectedCamId ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10'
                            }`}
                          >
                            {d.label || '未命名裝置'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* 右：開始面試面板（佔 5 欄） */}
          <aside className="lg:col-span-5">
            <div className="w-full max-w-md ml-auto p-6 pt-0">
              <h2 className="text-lg font-semibold mb-1">準備開始面試</h2>
              <p className="text-sm text-gray-500 mb-5">面試類型：{type}</p>

              <div className="mb-5">
                <p className="text-sm text-gray-600 mb-4">
                  請確認您的音訊和視訊設定，然後點擊下方按鈕開始面試。
                </p>
              </div>

              <button
                type="button"
                onClick={handleStart}
                className="w-full h-11 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                開始面試
              </button>

              <p className="mt-4 text-sm text-gray-600">
                點擊後，將進入 interview 頁面。音訊預設開啟，視訊預設關閉，可於左側控制列切換。
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
