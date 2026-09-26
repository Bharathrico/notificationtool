import { useRef } from 'react'
import './App.css'

const SOUNDS = [
  { id: 'notify', label: 'Notify', waveform: 'sine', notes: [455, 1000], hoverFreq: 400 },
  { id: 'success', label: 'Success', waveform: 'triangle', notes: [660, 880], hoverFreq: 500 },
  { id: 'error', label: 'Error', waveform: 'sawtooth', notes: [300, 220], hoverFreq: 250 },
  { id: 'alert', label: 'Alert', waveform: 'square', notes: [900, 1200, 900], hoverFreq: 600 },
]

function App() {
  const ctxRef = useRef(null)

  const getContext = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!ctxRef.current) ctxRef.current = new AudioContextClass()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx
  }

  const playClick = async ({ waveform, notes }) => {
    const ctx = await getContext()

    const now = ctx.currentTime
    notes.forEach((freq, i) => {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const osc2Gain = ctx.createGain()
      const env = ctx.createGain()
      const softener = ctx.createBiquadFilter()

      osc1.type = waveform
      osc1.frequency.value = freq

      osc2.type = 'triangle'
      osc2.frequency.value = freq / 2
      osc2Gain.gain.value = 0.35 // sub-oscillator sits under the main tone, not level with it

      softener.type = 'lowpass'
      softener.frequency.value = 2500 // rounds off the harsher edges of sawtooth/square

      const start = now + i * 0.09
      env.gain.setValueAtTime(0, start)
      env.gain.linearRampToValueAtTime(0.25, start + 0.012)
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

      osc1.connect(env)
      osc2.connect(osc2Gain)
      osc2Gain.connect(env)
      env.connect(softener)
      softener.connect(ctx.destination)
      osc1.start(start)
      osc2.start(start)
      osc1.stop(start + 0.24)
      osc2.stop(start + 0.24)
    })
  }

  const playHover = async (freq) => {
    const ctx = await getContext()

    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq

    const start = ctx.currentTime
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(0.06, start + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.09)

    osc.connect(env)
    env.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.1)
  }

  return (
    <div className="app">
      {SOUNDS.map((sound) => (
        <button
          key={sound.id}
          className="play-btn"
          onClick={() => playClick(sound)}
          onMouseEnter={() => playHover(sound.hoverFreq)}
        >
          {sound.label}
        </button>
      ))}
    </div>
  )
}

export default App
