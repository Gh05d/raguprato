<script>
  import { onMount } from "svelte";

  const context = new AudioContext();
  const analyserNode = new AnalyserNode(context, { fftSize: 256 });
  let canvas;
  let canvasContext;
  let height = 650;
  let pixelRatio = typeof window === "undefined" ? 2 : window.devicePixelRatio;

  function getGuitar() {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        latency: 0,
      },
    });
  }

  async function setupContext() {
    const guitar = await getGuitar();
    const source = context.createMediaStreamSource(guitar);
    source.connect(analyserNode).connect(context.destination);
  }

  function drawVisualizer() {
    if (!canvas || !context) {
      return;
    }
    requestAnimationFrame(drawVisualizer);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    const { width, height: canvasHeight } = canvas;

    const barWidth = width / bufferLength;
    canvasContext.clearRect(0, 0, width, canvasHeight);

    dataArray.forEach((item, i) => {
      const y = (item / 255) * canvasHeight * 0.75;
      const x = barWidth * i * 2;

      canvasContext.fillStyle = `hsl(${(y / canvasHeight) * 400}, 100%, 50%)`;
      canvasContext.fillRect(x, canvasHeight - y, barWidth, y);
    });
  }

  onMount(() => {
    canvasContext = canvas.getContext("2d");
    setupContext();
    drawVisualizer();
  });
</script>

<canvas bind:this={canvas} height={height * pixelRatio} />

<style lang="scss">
  canvas {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: 1;
    pointer-events: none;
  }
</style>
