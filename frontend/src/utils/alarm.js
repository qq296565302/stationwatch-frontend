// ========================================
// 警报声（Web Audio 合成，无需音频文件）
// 模块级单例 AudioContext：懒创建 + 自动播放策略解锁（首次用户交互后 resume）
// 供超时工单 / 遗留问题等强提醒共用，避免同时触发时叠加创建 context
// ========================================

let audioCtx = null

export function playAlarm() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      audioCtx = new AC()
      // 自动播放策略：须在用户交互后 resume
      const unlock = () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume() }
      window.addEventListener('pointerdown', unlock, { once: true })
      window.addEventListener('keydown', unlock, { once: true })
      window.addEventListener('click', unlock, { once: true })
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const beep = (at) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + at + 0.35)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(audioCtx.currentTime + at)
      osc.stop(audioCtx.currentTime + at + 0.4)
    }
    beep(0)
    beep(0.45)
  } catch { /* 音频不可用仅弹 toast，不阻塞 */ }
}
