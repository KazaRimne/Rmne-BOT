import * as dotenv from 'dotenv'
import crypto from "crypto";
import fetch from 'node-fetch';
import express from 'express';
import cookieParser from 'cookie-parser';
import config from './config.js';
import * as discord from './discord.js';
import * as storage from './storage.js';
import { linkedRoleHandler } from "./verify.js";
import { Client, GatewayIntentBits } from 'discord.js';

dotenv.config(); 

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot 已登入：${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

app.get("/linked-role", linkedRoleHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running at https://replit.rimnebot.repl.co`);
});
/**
 * Main HTTP server used for the bot.
 */

 const app = express();
 app.use(cookieParser(config.COOKIE_SECRET));

 /**
  * Just a happy little route to show our server is up.
  */
 app.get('/', (req, res) => {
   res.send('👋');
 });

/**
 * Route configured in the Discord developer console which facilitates the
 * connection between Discord and any additional services you may use. 
 * To start the flow, generate the OAuth2 consent dialog url for Discord, 
 * and redirect the user there.
 */
app.get('/linked-role', async (req, res) => {
  const { url, state } = discord.getOAuthUrl();

  // Store the signed state param in the user's cookies so we can verify
  // the value later. See:
  // https://discord.com/developers/docs/topics/oauth2#state-and-security
  res.cookie('clientState', state, { maxAge: 1000 * 60 * 5, signed: true });

  // Send the user to the Discord owned OAuth2 authorization endpoint
  res.redirect(url);
});

/**
 * Route configured in the Discord developer console, the redirect Url to which
 * the user is sent after approving the bot for their Discord account. This
 * completes a few steps:
 * 1. Uses the code to acquire Discord OAuth2 tokens
 * 2. Uses the Discord Access Token to fetch the user profile
 * 3. Stores the OAuth2 Discord Tokens in Redis / Firestore
 * 4. Lets the user know it's all good and to go back to Discord
 */
 app.get('/discord-oauth-callback', async (req, res) => {
  try {
    // 1. Uses the code and state to acquire Discord OAuth2 tokens
    const code = req.query['code'];
    const discordState = req.query['state'];

    // make sure the state parameter exists
    const { clientState } = req.signedCookies;
    if (clientState !== discordState) {
      console.error('State verification failed.');
      return res.sendStatus(403);
    }

    const tokens = await discord.getOAuthTokens(code);

    // 2. Uses the Discord Access Token to fetch the user profile
    const meData = await discord.getUserData(tokens);
    const userId = meData.user.id;
    await storage.storeDiscordTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    });

    // 3. Update the users metadata, assuming future updates will be posted to the `/update-metadata` endpoint
    await updateMetadata(userId);

    res.send('You did it!  Now go back to Discord.');
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

/**
 * Example route that would be invoked when an external data source changes. 
 * This example calls a common `updateMetadata` method that pushes static
 * data to Discord.
 */
 app.post('/update-metadata', async (req, res) => {
  try {
    const userId = req.body.userId;
    await updateMetadata(userId)

    res.sendStatus(204);
  } catch (e) {
    res.sendStatus(500);
  }
});

/**
 * Given a Discord UserId, push static make-believe data to the Discord 
 * metadata endpoint. 
 */
async function updateMetadata(userId) {
  // Fetch the Discord tokens from storage
  const tokens = await storage.getDiscordTokens(userId);
    
  let metadata = {};
  try {
    // Fetch the new metadata you want to use from an external source. 
    // This data could be POST-ed to this endpoint, but every service
    // is going to be different.  To keep the example simple, we'll
    // just generate some random data. 
    metadata = {
      cookieseaten: 1483,
      allergictonuts: 0, // 0 for false, 1 for true
      firstcookiebaked: '2003-12-20',
    };
  } catch (e) {
    e.message = `Error fetching external data: ${e.message}`;
    console.error(e);
    // If fetching the profile data for the external service fails for any reason,
    // ensure metadata on the Discord side is nulled out. This prevents cases
    // where the user revokes an external app permissions, and is left with
    // stale linked role data.
  }

  // Push the data to Discord.
  await discord.pushMetadata(userId, tokens, metadata);
}


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const aapp = express();
aapp.use(express.json());
aapp.use(cookieParser());

const ROLE_MAP = {
  "1346250078238544004": "kazarimne",
  "1346253003467784194": "member",
  "1346253445161812048": "member",
  "1346253804622053427": "member",
  "1346250832466808832": "admin"
};

// 已授權用戶 token
const userTokens = {}; // { userId: access_token }

// 生成 OAuth2 state
function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

// OAuth2 連結
aapp.get("/login", (req, res) => {
  const state = generateState();
  res.cookie("oauth_state", state, { maxAge: 5 * 60 * 1000, httpOnly: true });

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "role_connections.write identify",
    state,
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// OAuth2 回呼
aapp.get("/login", (req, res) => {
  const state = generateState();
  res.cookie("oauth_state", state, { maxAge: 5 * 60 * 1000, httpOnly: true });

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "role_connections.write identify",
    state
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// -------------------
// OAuth2 回呼
// -------------------
aapp.get("/discord-oauth-callback", async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.cookies.oauth_state) return res.status(403).send("Invalid state");

  // 交換 access token
  const data = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: DISCORD_REDIRECT_URI
  });

  const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: data,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  const tokens = await tokenResp.json();

  // 取得使用者 ID
  const userResp = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const userData = await userResp.json();
  const userId = userData.id;

  // 存 token
  userTokens[userId] = tokens.access_token;

  res.send("授權成功！現在可以更新 Linked Role");
});

// -------------------
// 註冊 Linked Role Metadata
// -------------------
async function registerMetadata() {
  const url = `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/role-connections/metadata`;
  const headers = {
    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json"
  };

  // 根據 ROLE_MAP 自動生成 metadata
  const uniqueKeys = [...new Set(Object.values(ROLE_MAP))]; // 取唯一 key
  const metadata = uniqueKeys.map(key => ({
    key,
    name: key,
    description: `The ${key} of the user`,
    type: 1 // type 1 = integer
  }));

  try {
    const resp = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(metadata)
    });

    if ([200, 204].includes(resp.status)) {
      console.log("Metadata 註冊成功！");
    } else {
      console.log(`Metadata 註冊失敗: ${resp.status}`);
      console.log(await resp.text());
    }
  } catch (err) {
    console.error("註冊 Metadata 時發生錯誤:", err);
  }
}

// -------------------
// 更新 Linked Role
// -------------------
async function updateLinkedRole(userId, roles) {
  const accessToken = userTokens[userId];
  if (!accessToken) {
    console.log(`用戶 ${userId} 沒有授權 OAuth2，跳過`);
    return;
  }

  for (const [sourceRole, targetKey] of Object.entries(ROLE_MAP)) {
    const connected = roles.includes(sourceRole);

    const payload = {
      platform_name: "MyApp",
      platform_username: "Unknown",
      platform_id: userId,
      metadata: { [targetKey]: connected ? 1 : 0 }
    };

    const resp = await fetch(
      `https://discord.com/api/v10/users/@me/applications/${DISCORD_CLIENT_ID}/role-connection`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (![200, 204].includes(resp.status)) {
      console.log(`更新 Linked Role 失敗: ${resp.status}, ${await resp.text()}`);
    }
  }
}

// -------------------
// Discord Bot
// -------------------
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.on("ready", async () => {
  console.log(`Bot 已上線: ${client.user.tag}`);
  // 上線時先註冊 Metadata
  await registerMetadata();
});

// 偵測用戶角色變化
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache.map(r => r.id);
  const newRoles = newMember.roles.cache.map(r => r.id);

  const relevantOld = oldRoles.filter(r => Object.keys(ROLE_MAP).includes(r));
  const relevantNew = newRoles.filter(r => Object.keys(ROLE_MAP).includes(r));

  if (JSON.stringify(relevantOld) !== JSON.stringify(relevantNew)) {
    await updateLinkedRole(newMember.id, newRoles);
  }
});

// -------------------
// 啟動服務器
// -------------------
client.login(DISCORD_BOT_TOKEN);
