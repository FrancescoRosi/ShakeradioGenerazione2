window.addEventListener("keydown", e => {
    if (e.code === "Tab") e.preventDefault();
});

const popup = () => {
    if (!document.querySelector("#scroll").classList.contains("visible")) {
        document.querySelector("#scroll").classList.add("visible");
        document.querySelector("#home").classList.add("background");
        document.querySelectorAll(".slideable").forEach(el => {
            el.classList.add("slideDown");
        });
    };
};
const popdown = () => {
    if (document.querySelector("#scroll").classList.contains("visible")) {
        document.querySelector("#scroll").classList.remove("visible");
        document.querySelector("#home").classList.remove("background");
        document.querySelectorAll(".slideable").forEach(el => {
            el.classList.remove("slideDown");
        });
    };
};

window.addEventListener("wheel", e => {
    if (e.wheelDeltaY > 75) {
        popup();
    } else if (e.wheelDeltaY < -75) {
        popdown();
    };
});

document.querySelector("#inviteToScroll").addEventListener("click", () => popup());

let touchStartY = 0;
let touchEndY = 0;
window.addEventListener("touchstart", e => {
    touchStartY = e.changedTouches[0].screenY;
});
window.addEventListener("touchend", e => {
    touchEndY = e.changedTouches[0].screenY;
    if (touchStartY - touchEndY > 75) {
        popup();
    } else if (touchStartY - touchEndY < -75) {
        popdown();
    };
});

const ytIDsArray = ["FN4dMY9YbTE", "f8XMPzp432c", "sIjfVDw_x9s", "mS5-MiXtpco", "rRmSDf_d_lM"];
const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
};

const chosenSuggestion = new Date().getDay() + 1;
if (chosenSuggestion < 6) {
    document.querySelector(`.suggested${chosenSuggestion}`).insertAdjacentHTML("beforeend", `<lite-youtube videoid="${ytIDsArray[chosenSuggestion - 1]}" params="rel=0"></lite-youtube>`);
};
document.querySelector(`.suggested${chosenSuggestion}`).classList.add("visible");

document.querySelectorAll(".modal-close").forEach(el => {
    el.addEventListener("click", e => {
        el.parentElement.parentElement.parentElement.classList.remove("visible");
        document.querySelectorAll(".modal .slideable").forEach(el => {
            el.classList.remove("slideDown");
        });
    });
});

const dbName = "videoDB";
const storeName = "videos";
let videoURL = "";

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(storeName, { keyPath: "id" });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

const saveVideoToDB = async (videoBlob, id) => {
    const db = await openDB();
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.put({ id, blob: videoBlob });

    return transaction.complete;
}

const getVideoFromDB = async (id) => {
    const db = await openDB();
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            resolve(event.target.result?.blob);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

const downloadProgress = ({ loaded, total }) => {
    console.log(loaded, total)
    const percentage = `${(loaded / total * 100).toFixed(2)}%`;
    document.querySelector(".progress .percentage").innerText = percentage;
    document.querySelector(".loaded").style.width = percentage;
};

const resetProgress = (done) => {
    if (!done) {
        document.querySelector(".progress").outerHTML = `<div class="progress loading">
            <div class="percentage">Preparazione download...</div>
            <div class="loaded"></div>
        </div>`;
    } else {
        document.querySelector(".progress").outerHTML =  `<div class="progress done">
            <div class="percentage">Completato!</div>
            <div class="done">Riproduci Shakeradio</div>
            <div class="loaded"></div>
        </div>`;
    }
};

const downloadAndSaveVideo = async ({ url, cobalt, videoId, contentLength }) => {
    window.contentLength = contentLength;
    if (cobalt) {
        const cobalt = await fetch("https://api.cobalt.tools/api/json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                "url": url,
                "vCodec": "h264",
                "vQuality": "1080"
            })
        })
        .then(response => response.json())
        .catch(err => {
            alert(`SI È VERIFICATO UN ERRORE con il componente Cobalt. Per favore segnalalo a quel deficiente di Francesco: ${err}`);
        });
        
        videoURL = cobalt.url;
    } else {
        videoURL = url;
    };
    
    try {
        const videoResponse = await fetch(videoURL)
        .then(response => {
            if (!response.body) {
                throw Error('ReadableStream not yet supported in this browser.')
            } else {
                document.querySelector(".progress").classList.remove("loading");
                const total = parseInt(contentLength, 10);
                let loaded = 0;
                
                return new Response(
                    new ReadableStream({
                        start(controller) {
                            const reader = response.body.getReader();
                            
                            read();
                            function read() {
                                    reader.read().then(({done, value}) => {
                                        if (done) {
                                            controller.close();
                                            return; 
                                        }
                                        loaded += value.byteLength;
                                        downloadProgress({loaded, total})
                                        controller.enqueue(value);
                                        read();
                                    }).catch(error => {
                                        console.error(error);
                                        controller.error(error)
                                    })
                                }
                            }
                        })
                    );
                };
            });

        const videoBlob = await videoResponse.blob();

        await saveVideoToDB(videoBlob, videoId);
    } catch (err) {
        alert(`SI È VERIFICATO UN ERRORE con il componente IndexedDB. Per favore segnalalo a quel deficiente di Francesco: ${err}`);
    };
}
    
    window.onload = async () => {
    try {
        document.querySelector("#play").addEventListener("click", () => play());
        const play = async () => {
            const shakerandoBlob = await getVideoFromDB("Shakerando");
            const bumperBlob = await getVideoFromDB("Bumper");

            if (shakerandoBlob && bumperBlob) {
                const shakerandoObjectURL = URL.createObjectURL(shakerandoBlob);
                const bumperObjectURL = URL.createObjectURL(bumperBlob);

                document.querySelector(".modal").classList.remove("visible");
                document.querySelectorAll(".modal .slideable").forEach(el => {
                    el.classList.remove("slideDown");
                });
                document.querySelector(".video-player").classList.add("visible");

                const player = new Plyr("#player", {
                    controls: ["play", "mute", "volume", "fullscreen"],
                    iconUrl: "/images/plyr.svg"
                });
                document.querySelector("#bumper-preload").src = bumperObjectURL;
                document.querySelector(".plyr").insertAdjacentElement("afterbegin", document.querySelector(".player-overlays"));
                
                window.playShakerando = () => {
                    document.querySelector("#player").src = shakerandoObjectURL;
                    currentVideo = "shakerando";
                    console.log("shakerando")
                    document.querySelector("#player").load();
                    document.querySelector("#player").play();
                    document.querySelector("#player").addEventListener("ended", () => playBumper());
                }
                window.playBumper = () => {
                    document.querySelector("#player").src = bumperObjectURL;
                    currentVideo = "bumper";
                    console.log("bumper")
                    document.querySelector("#player").load();
                    document.querySelector("#player").play();
                    document.querySelector("#player").addEventListener("ended", () => playShakerando());
                };

                let currentVideo = "";
                
                document.querySelector(`[data-plyr="play"]`).addEventListener("click", () => window.location.reload());
                window.addEventListener("keydown", e => {
                    if (e.code === "MediaPlayPause") window.location.reload();
                });

                const intervalFunction = () => {
                    const syncedVideoLength = (Date.now() / 210240 - Math.floor(Date.now() / 210240)) * 210.24;
                    if (syncedVideoLength <= 196.68) {
                        if (currentVideo !== "shakerando") {
                            document.querySelector("#player").currentTime = syncedVideoLength;
                            playShakerando();
                        }
                    } else {
                        if (currentVideo !== "bumper") {
                            document.querySelector("#player").currentTime = 210.24 - syncedVideoLength;
                            playBumper();
                        }
                    }
                    /*if (syncedVideoLength <= 196.68) {
                        if (currentVideo !== "shakerando") {
                            clearTimeout(timeoutId);
                            document.querySelector("#player").currentTime = syncedVideoLength;
                            playShakerando();
                        }
                    } else if (currentVideo !== "bumper") {
                        const remainingTime = (syncedVideoLength - 196.68) * 1000;
                        timeoutId = setTimeout(() => {
                            document.querySelector("#player").currentTime = syncedVideoLength;
                            playBumper();
                        }, remainingTime);
                    };*/
                }
                const interval = setInterval(() => {
                    intervalFunction();
                }, 1000);

                intervalFunction();
            } else {
                document.querySelector(".modal").classList.add("visible");
                document.querySelectorAll(".modal .slideable").forEach(el => {
                    el.classList.add("slideDown");
                });

                document.querySelector("#component-progress").innerText = 1;
                await downloadAndSaveVideo({
                    url: "https://www.youtube.com/watch?v=U6VMjHJ18a0",
                    cobalt: true,
                    videoId: "Shakerando",
                    contentLength: 54393219
                });
                resetProgress();

                document.querySelector("#component-progress").innerText = 2;
                await downloadAndSaveVideo({
                    url: "https://shakeradio.francescoro.si/videos/bumper.mp4",
                    videoId: "Bumper",
                    contentLength: 3577569
                });
                resetProgress(true);

                document.querySelector(".progress").addEventListener("click", () => play());
            };
        };
    } catch (error) {
        console.error("Error loading the videos from IndexedDB:", error);
    }
}