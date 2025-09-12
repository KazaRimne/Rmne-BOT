import fetch from "node-fetch";

async function linkedRoleHandler(req, res) {
  try {
    const code = req.query.code; // Discord 帶回來的 OAuth2 code
    if (!code) {
      // 如果沒有 code，就先導向 Discord OAuth2 授權頁
      return res.redirect(
        `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=https://replit.rimnebot.repl.co/discord-oauth-callback&response_type=code&scope=identify`
      );
    }

    // 用 code 換 token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://replit.rimnebot.repl.co/discord-oauth-callback"
      })
    });
    const tokenData = await tokenRes.json();

    // 拿 user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    // 回傳給 Discord Linked Roles
    res.json({
      user_id: user.id,
      platform_name: "Replit Test",
      metadata: {
        level: 10,
        verified: true
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth2 Failed");
  }
}

module.exports = { linkedRoleHandler };
