const serverUrl = "http://localhost:3000";
let blockedUrls = [];
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
const updateBlockedUrls = async () => {
    withUserId(async (userId) => {
        try {
            const res = await fetch(`${serverUrl}/allBlocked`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                }),
            });
            const data = await res.json();
            blockedUrls = data.urls;
        } catch (error) {
            console.log("Err bg.js", error);
        }
    });
};
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        const url = details.url;
        if (url.includes(serverUrl)) {
            return;
        }
        const blockedUrl = blockedUrls.find((blockedUrl) => {
            console.log("blocking url", blockedUrl.url, url);
            return url.startsWith(blockedUrl.url);
        });
        console.log("blockedUrl", blockedUrl);
        if (blockedUrl) {
            return {
                cancel: true,
            };
        }
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);
setInterval(updateBlockedUrls, 5000);

const generateUser = async () => {
    chrome.identity.getProfileUserInfo(async (userInfo) => {
        const id =
            userInfo.id === undefined || userInfo.id === ""
                ? crypto.randomUUID()
                : userInfo.id;
        console.log("using id", id);
        const res = await fetch(`${serverUrl}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id,
            }),
        });
        const data = await res.json();
        console.log(data);
        chrome.storage.sync.set({ userId: data.id }, () => {
            console.log(`setting userId to ${data.id}`);
        });
    });
};
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("installed", details);
    if (details.reason === "install") {
        console.log("generating user");
        await generateUser();
    } else if (details.reason === "update") {
        console.log("getting userId");
        chrome.storage.sync.get(["userId"], async (result) => {
            console.log({ result });
            if (
                result.userId !== null &&
                result.userId !== undefined &&
                result.userId.length > 0
            )
                return;
            console.log("generating user");
            await generateUser();
        });
    }
});
