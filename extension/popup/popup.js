const serverUrl = "http://localhost:3000";
const withUserId = async (callback) => {
    chrome.storage.sync.get(["userId"], async (result) => {
        console.log(
            { result },
            result.userId !== null &&
                result.userId !== undefined &&
                result.userId.length > 0
        );
        if (
            !(
                result.userId !== null &&
                result.userId !== undefined &&
                result.userId.length > 0
            )
        )
            return;
        await callback(result.userId);
    });
};
document.querySelector(".reportBtn").addEventListener("click", async () => {
    const url = document.querySelector("#urlInput").value;
    withUserId(async (userId) => {
        try {
            console.log("adding url");
            const res = await fetch(`${serverUrl}/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url,
                    userId,
                }),
            });
            const data = await res.json();
            console.log(`${url} reported`, data);
            document.querySelector("#urlInput").value = "";
        } catch (err) {
            console.log(err);
        }
    });
});

const attachEventListeners = () => {
    document.querySelectorAll(".itemRow").forEach((row) => {
        console.log(row, row.querySelector(".itemUpvote img"));
        row.querySelector(".itemUpvote img").addEventListener(
            "click",
            async () => {
                const urlId = row.dataset.urlid;
                withUserId(async (userId) => {
                    try {
                        const res = await fetch(`${serverUrl}/block`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                id: urlId,
                                userId,
                            }),
                        });
                        const data = await res.json();
                        console.log(`${urlId} blocked by ${userId}`, data);
                        refreshRepo();
                    } catch (err) {
                        console.log(first);
                    }
                });
            }
        );

        row.querySelector(".itemDownvote img").addEventListener(
            "click",
            async () => {
                const urlId = row.dataset.urlid;
                withUserId(async (userId) => {
                    try {
                        const res = await fetch(`${serverUrl}/whitelist`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                id: urlId,
                                userId,
                            }),
                        });
                        const data = await res.json();
                        console.log(`${urlId} whitelisted by ${userId}`, data);
                        refreshRepo();
                    } catch (err) {
                        console.log(first);
                    }
                });
            }
        );
    });
};

const refreshRepo = async () => {
    const repoBody = document.querySelector(".repoBody");
    repoBody.innerHTML = "Loading...";
    try {
        const res = await fetch(`${serverUrl}/all`);
        const data = await res.json();
        console.log("data", data);
        repoBody.innerHTML = data
            ?.map((url) => {
                return `
        <div class="tripleRow itemRow" data-urlid="${url._id}">
          <div class="itemUrl" title="${url.url}">${url.url}</div>
          <div class="itemUpvote"><img src="assets/thumbsUpDark.svg" alt="Thumbs Up"/>${url.blockedBy.length}</div>
          <div class="itemDownvote"><img src="assets/thumbsDownDark.svg" alt="Thumbs Down"/>${url.whitelistedBy.length}</div>
        </div>`;
            })
            .join("");
        attachEventListeners();
    } catch (err) {
        console.log(err);
    }
};

document.querySelector(".listBtn").addEventListener("click", () => {
    document.querySelector(".wrapper-1").style.display = "none";
    document.querySelector(".wrapper-2").style.display = "block";
    refreshRepo();
});

document.querySelector(".backBtn").addEventListener("click", () => {
    document.querySelector(".wrapper-1").style.display = "block";
    document.querySelector(".wrapper-2").style.display = "none";
});
