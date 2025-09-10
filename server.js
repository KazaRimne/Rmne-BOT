// ROLE_MAP: 來源角色 -> 目標角色
const ROLE_MAP = {
    "1346250078238544004": "1415357826662011021",
    "1346253003467784194": "1415360988949250141",
    "1346253445161812048": "1415360988949250141",
    "1346253804622053427": "1415360988949250141",
    "1346250832466808832": "1415361550457507840"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 只處理 POST /linked-role-verification
    if (request.method === "POST" && url.pathname === "/linked-role-verification") {
      try {
        const body = await request.json();
        const userId = body.user_id;
        const accessToken = body.access_token;

        // 取得使用者 guild member 資料
        const userResp = await fetch(`https://discord.com/api/v10/users/@me/guilds/${env.GUILD_ID}/member`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!userResp.ok) throw new Error("無法取得使用者資料");

        const userData = await userResp.json();
        const roles = userData.roles;

        // 依 ROLE_MAP 判斷哪些 Linked Roles 可以給
        const role_connections = Object.entries(ROLE_MAP).map(([sourceRole, targetRole]) => ({
          platform_name: "MyApp",
          platform_username: userData.user?.username || "Unknown",
          connected: roles.includes(sourceRole),
          target_role_id: targetRole
        }));

        return new Response(JSON.stringify({ role_connections }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: "Verification failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not found", { status: 404 });
  }
};
