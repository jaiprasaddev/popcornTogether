const playBtn = document.getElementById("playBtn");
const youtubeLink = document.getElementById("youtubeLink");
const player = document.getElementById("youtubePlayer");

playBtn.addEventListener("click", () => {
  let url = youtubeLink.value.trim();
  if (!url) {
    alert("Please paste a YouTube link!");
    return;
  }

  // Convert normal YouTube link → embed link
  let videoId = "";
  if (url.includes("watch?v=")) {
    videoId = url.split("watch?v=")[1].split("&")[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  }

  if (videoId) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    player.src = embedUrl;
  } else {
    alert("Invalid YouTube link!");
  }
});
