import { ref, watch, onUnmounted, type Ref } from 'vue';

export function useAudioAnalyser(stream: Ref<MediaStream | null>) {
  const isSpeaking = ref(false);

  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let rafId: number | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;

  const SILENCE_THRESHOLD = 15;
  const SILENCE_DELAY = 300;

  function start() {
    if (!stream.value) return;

    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    source = audioCtx.createMediaStreamSource(stream.value);
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      if (!analyser) return;

      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > SILENCE_THRESHOLD) {
        isSpeaking.value = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (isSpeaking.value && !silenceTimer) {
        silenceTimer = setTimeout(() => {
          isSpeaking.value = false;
          silenceTimer = null;
        }, SILENCE_DELAY);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    source?.disconnect();
    source = null;
    analyser = null;
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close();
    }
    audioCtx = null;
    isSpeaking.value = false;
  }

  watch(stream, (newStream, oldStream) => {
    if (oldStream) stop();
    if (newStream) start();
  });

  onUnmounted(() => {
    stop();
  });

  return { isSpeaking };
}
