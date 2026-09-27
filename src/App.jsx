import { useRef, useState } from 'react'
import { useSoundStore } from './store'
import './App.css'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const FILTERS = ['none', 'lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf']
// gain in dB only applies to these filter types
const GAIN_FILTERS = ['peaking', 'lowshelf', 'highshelf']

// sounds saved before filters existed lack the filter fields, so everything is merged over these
const DEFAULTS = {
  waveform: 'sine',
  frequency: 440,
  gain: 0.25,
  duration: 0.3,
  pan: 0,
  filterType: 'none',
  filterFrequency: 1000,
  filterQ: 1,
  filterGain: 0,
  echoMix: 0,
  echoTime: 0.25,
  echoFeedback: 0.4,
}

// Approximation of a trophy-style chime: overlapping bell notes rising into a bright shimmer
const TROPHY_NOTES = [
  { frequency: 1318.5, at: 0, decay: 0.6 },
  { frequency: 1975.5, at: 0.08, decay: 0.6 },
  { frequency: 2637, at: 0.16, decay: 0.8 },
  { frequency: 1568, at: 0.38, decay: 1.2 },
  { frequency: 2349.3, at: 0.46, decay: 1.4 },
  { frequency: 3136, at: 0.54, decay: 1.8 },
]

function App() {
  const ctxRef = useRef(null)
  const [current, setCurrent] = useState(DEFAULTS)
  const [editingId, setEditingId] = useState(null)
  const { sounds, add, update, clear } = useSoundStore()
  const { waveform, frequency, gain, duration, pan, filterType, filterFrequency, filterQ, filterGain,
    echoMix, echoTime, echoFeedback } = current

  // while a saved sound is selected, control changes are written straight back to it
  const setField = (field, value) => {
    setCurrent((c) => ({ ...c, [field]: value }))
    if (editingId !== null) update(editingId, { [field]: value })
  }

  const selectSound = (sound) => {
    if (sound.id === editingId) {
      setEditingId(null)
      return
    }
    const { id, ...settings } = sound
    setEditingId(id)
    setCurrent({ ...DEFAULTS, ...settings })
    play(sound)
  }

  const clearAll = () => {
    clear()
    setEditingId(null)
  }

  const getContext = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!ctxRef.current) ctxRef.current = new AudioContextClass()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx
  }

  const schedule = (ctx, saved, start) => {
    const sound = { ...DEFAULTS, ...saved }
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = sound.waveform
    osc.frequency.value = sound.frequency

    const end = start + sound.duration
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(sound.gain, start + 0.01)
    env.gain.setValueAtTime(sound.gain, Math.max(start + 0.01, end - 0.02))
    env.gain.linearRampToValueAtTime(0, end) // short fade avoids a click at the cutoff

    const panner = ctx.createStereoPanner()
    panner.pan.value = sound.pan
    panner.connect(ctx.destination)

    osc.connect(env)
    let source = env
    if (sound.filterType !== 'none') {
      const filter = ctx.createBiquadFilter()
      filter.type = sound.filterType
      filter.frequency.value = sound.filterFrequency
      filter.Q.value = sound.filterQ
      filter.gain.value = sound.filterGain
      env.connect(filter)
      source = filter
    }
    source.connect(panner)

    if (sound.echoMix > 0) {
      const delay = ctx.createDelay(2)
      delay.delayTime.value = sound.echoTime
      const feedback = ctx.createGain()
      feedback.gain.value = sound.echoFeedback // kept below 1 by the slider so repeats always die out
      const wet = ctx.createGain()
      wet.gain.value = sound.echoMix

      source.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(wet)
      wet.connect(panner)
    }

    osc.start(start)
    osc.stop(end)
    return end
  }

  const play = async (sound) => {
    const ctx = await getContext()
    schedule(ctx, sound, ctx.currentTime)
  }

  const playTrophy = async () => {
    const ctx = await getContext()
    const now = ctx.currentTime
    TROPHY_NOTES.forEach(({ frequency, at, decay }) => {
      const start = now + at
      // fundamental plus a quiet octave partial gives the bell-like shimmer
      ;[[frequency, 0.18], [frequency * 2, 0.05]].forEach(([freq, peak]) => {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        env.gain.setValueAtTime(0, start)
        env.gain.linearRampToValueAtTime(peak, start + 0.005)
        env.gain.exponentialRampToValueAtTime(0.0001, start + decay)
        osc.connect(env)
        env.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + decay + 0.02)
      })
    })
  }

  const playSequence = async () => {
    const ctx = await getContext()
    let t = ctx.currentTime
    sounds.forEach((s) => {
      t = schedule(ctx, s, t)
    })
  }

  return (
    <div className="app">
      <div className="controls">
        <label>
          Oscillation
          <select value={waveform} onChange={(e) => setField('waveform', e.target.value)}>
            {WAVEFORMS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>

        <label>
          Frequency: {frequency} Hz
          <input type="range" min="50" max="2000" step="1" value={frequency}
            onChange={(e) => setField('frequency', Number(e.target.value))} />
        </label>

        <label>
          Gain: {gain.toFixed(2)}
          <input type="range" min="0" max="1" step="0.01" value={gain}
            onChange={(e) => setField('gain', Number(e.target.value))} />
        </label>

        <label>
          Time limit: {duration.toFixed(2)} s
          <input type="range" min="0.05" max="3" step="0.05" value={duration}
            onChange={(e) => setField('duration', Number(e.target.value))} />
        </label>

        <label>
          Pan: {pan === 0 ? 'center' : `${Math.abs(pan * 100).toFixed(0)}% ${pan < 0 ? 'left' : 'right'}`}
          <input type="range" min="-1" max="1" step="0.05" value={pan}
            onChange={(e) => setField('pan', Number(e.target.value))} />
        </label>

        <label>
          Filter
          <select value={filterType} onChange={(e) => setField('filterType', e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        {filterType !== 'none' && (
          <>
            <label>
              Filter frequency: {filterFrequency} Hz
              <input type="range" min="20" max="10000" step="1" value={filterFrequency}
                onChange={(e) => setField('filterFrequency', Number(e.target.value))} />
            </label>

            <label>
              Q: {filterQ.toFixed(1)}
              <input type="range" min="0.1" max="20" step="0.1" value={filterQ}
                onChange={(e) => setField('filterQ', Number(e.target.value))} />
            </label>

            {GAIN_FILTERS.includes(filterType) && (
              <label>
                Filter gain: {filterGain} dB
                <input type="range" min="-24" max="24" step="1" value={filterGain}
                  onChange={(e) => setField('filterGain', Number(e.target.value))} />
              </label>
            )}
          </>
        )}

        <label>
          Echo mix: {echoMix === 0 ? 'off' : echoMix.toFixed(2)}
          <input type="range" min="0" max="1" step="0.05" value={echoMix}
            onChange={(e) => setField('echoMix', Number(e.target.value))} />
        </label>

        {echoMix > 0 && (
          <>
            <label>
              Echo time: {echoTime.toFixed(2)} s
              <input type="range" min="0.05" max="1" step="0.01" value={echoTime}
                onChange={(e) => setField('echoTime', Number(e.target.value))} />
            </label>

            <label>
              Echo feedback: {echoFeedback.toFixed(2)}
              <input type="range" min="0" max="0.9" step="0.05" value={echoFeedback}
                onChange={(e) => setField('echoFeedback', Number(e.target.value))} />
            </label>
          </>
        )}

        <div className="buttons">
          <button onClick={() => play(current)}>Test Sound</button>
          {editingId === null
            ? <button onClick={() => add(current)}>Add</button>
            : <button onClick={() => setEditingId(null)}>Done</button>}
        </div>
        <div className="buttons">
          <button onClick={playSequence} disabled={sounds.length === 0}>Play Sequence</button>
          <button onClick={clearAll} disabled={sounds.length === 0}>Clear Sequence</button>
        </div>
        <button onClick={playTrophy}>Platinum Trophy</button>
      </div>

      {sounds.length > 0 && (
        <ul className="saved">
          {sounds.map((s) => (
            <li key={s.id}>
              <button className={s.id === editingId ? 'editing' : ''} onClick={() => selectSound(s)}>
                {s.waveform} · {s.frequency} Hz · {s.gain.toFixed(2)} · {s.duration.toFixed(2)}s
                {s.pan ? ` · pan ${s.pan > 0 ? '+' : ''}${s.pan.toFixed(2)}` : ''}
                {s.echoMix > 0 && ` · echo ${s.echoTime.toFixed(2)}s`}
                {s.filterType && s.filterType !== 'none' && ` · ${s.filterType} ${s.filterFrequency} Hz`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
