require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
app.use(bodyParser.json());
app.use(cors());

const host = process.env.HOST || "http://localhost";
const port = process.env.PORT || 3000;
/* CONNECTING TO DATABASE */
const dbPwd = encodeURIComponent(process.env.DB_PWD);
const dbUrl = process.env.DB_URL?.replace("<password>", dbPwd);
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/* SCHEMAS */
const userSchema = new mongoose.Schema({
  id: String,
});
const User = mongoose.model("User", userSchema);
const urlSchema = new mongoose.Schema({
  url: String,
  blockedBy: [String],
  whitelistedBy: [String],
});
const Url = mongoose.model("Url", urlSchema);

/* ROUTES */
app.get("/", (req, res) => {
  res.send("CROWDSOURCED FIREWALL API");
});

app.post("/register", async (req, res) => {
  console.log("register", req.body);
  const { id } = req.body;
  try {
    const userExists = await User.findOne({ id });
    if (userExists) {
      console.log(`user ${id} already exists`);
      res.send(userExists);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
  console.log("Adding user:", id);
  const newUser = new User({ id });
  try {
    await newUser.save();
    res.send(newUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/add", async (req, res) => {
  console.log(req.body);
  const { url, userId } = req.body;
  try {
    const urlExists = await Url.findOne({ url, blockedBy: userId });
    if (urlExists) {
      console.log(`url ${url} already exists`);
      res.send(urlExists);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
  console.log("Adding url:", url);
  const newUrl = new Url({ url, blockedBy: [userId] });
  try {
    await newUrl.save();
    res.send(newUrl);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/block", async (req, res) => {
  const { id, url, userId } = req.body;
  console.log(`Blocking url: ${url} with id: ${id}`);
  try {
    let foundUrl;
    if (id) {
      foundUrl = await Url.findOne({
        id,
      });
    } else if (url) {
      foundUrl = await Url.findOne({ url });
    } else {
      return res.status(400).send("Bad request");
    }
    if (foundUrl) {
      foundUrl.blockedBy = [
        ...foundUrl.blockedBy.filter((id) => id !== userId),
        userId,
      ];
      foundUrl.whitelistedBy = [
        ...foundUrl.whitelistedBy.filter((id) => id !== userId),
      ];
      await foundUrl.save();
      return res.send(foundUrl);
    } else if (userId) {
      const newUrl = new Url({ url, blockedBy: [userId] });
      await newUrl.save();
      return res.send(newUrl);
    } else {
      res.status(404).send("URL not found");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/whitelist", async (req, res) => {
  const { id, url, userId } = req.body;
  console.log(`Whitelisting url: ${url} with id: ${id}`);
  try {
    let foundUrl;
    if (id) {
      foundUrl = await Url.findOne({
        id,
      });
    } else if (url) {
      foundUrl = await Url.findOne({ url });
    } else {
      return res.status(400).send("Bad request");
    }
    console.log("foundUrl", foundUrl);
    if (foundUrl) {
      foundUrl.blockedBy = [
        ...foundUrl.blockedBy.filter((id) => id !== userId),
      ];
      foundUrl.whitelistedBy = [
        ...foundUrl.whitelistedBy.filter((id) => id !== userId),
        userId,
      ];
      console.log(foundUrl);
      const result = await foundUrl.save();
      console.log(result);
      return res.send(foundUrl);
    } else if (userId && url) {
      const newUrl = new Url({ url, blockedBy: [userId] });
      await newUrl.save();
      return res.send(newUrl);
    } else {
      res.status(404).send("URL not found");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/all", async (req, res) => {
  console.log("Getting all urls");
  try {
    const urls = await Url.find();
    console.log("Sending all urls: ", urls.length);
    res.send(urls);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/allBlocked", async (req, res) => {
  const { userId } = req.body;
  console.log("Getting all blocked urls");
  try {
    const urls = await Url.find();
    const blockedUrls = urls.filter((url) => {
      const usersWhitelisting = url.whitelistedBy.find((id) => userId === id);
      const usersBlocking = url.blockedBy.find((id) => userId === id);
      console.log({
        usersWhitelisting,
        usersBlocking,
      });
      if (usersWhitelisting) {
        return false;
      }
      if (usersBlocking) {
        return true;
      }
      console.log(url.whitelistedBy.length, url.blockedBy.length);
      return url.whitelistedBy.length < url.blockedBy.length;
    });
    console.log(
      `Sending ${blockedUrls.length} blocked urls out of ${urls.length}`
    );
    res.send({
      urls: blockedUrls,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Server listening at ${host}:${port}`);
});
