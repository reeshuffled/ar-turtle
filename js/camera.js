export function initCamera() {
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  window.__ar_video = video;

  const cameraCanvas = document.getElementById("camera");
  const cameraCtx = cameraCanvas.getContext("2d");
  let rafId = null;
  let cameraOn = false;
  let currentStream = null;

  const drawFrame = () => {
    rafId = requestAnimationFrame(drawFrame);
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
    }
  };

  const populateCameras = (devices) => {
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    const select = document.getElementById("cameraSelect");
    const current = select.value;
    select.innerHTML = "";
    videoDevices.forEach((device, i) => {
      const opt = document.createElement("option");
      opt.value = device.deviceId;
      opt.text = device.label || `Camera ${i + 1}`;
      if (opt.value === current) opt.selected = true;
      select.appendChild(opt);
    });
    document.getElementById("cameraWrapper").style.display = videoDevices.length > 1 ? "" : "none";
  };

  const startCamera = (deviceId) => {
    currentStream?.getTracks().forEach((t) => t.stop());
    currentStream = null;
    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { width: { ideal: 1920 }, height: { ideal: 1080 } },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        currentStream = stream;
        video.srcObject = stream;
        document.getElementById("cameraToggle").style.display = "";
        if (cameraOn && !rafId) drawFrame();
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(populateCameras)
      .catch((err) => console.warn("Camera unavailable:", err.message));
  };

  document.getElementById("cameraToggle").addEventListener("click", () => {
    cameraOn = !cameraOn;
    const toggle = document.getElementById("cameraToggle");
    toggle.textContent = cameraOn ? "Turn Camera Off" : "Turn Camera On";
    toggle.classList.toggle("active", cameraOn);
    if (cameraOn) {
      if (!rafId) drawFrame();
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
      cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
    }
  });

  document.getElementById("cameraSelect").addEventListener("change", function () {
    startCamera(this.value);
  });

  if (navigator.mediaDevices?.getUserMedia) {
    startCamera(null);
  }
}
