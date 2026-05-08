import logging
import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v19.0"

class SocialGateway:
    def __init__(self, config: dict):
        self.config = config

    async def post_to_platform(self, platform: str, content: str):
        method_name = f"post_to_{platform.lower()}"
        method = getattr(self, method_name, self.post_to_generic)
        return await method(content)

    async def post_to_facebook(self, content: str):
        fb = self.config.get("facebook", {})
        page_id = fb.get("page_id")
        token = fb.get("token")

        if not page_id or not token:
            return False, "Facebook Page ID or Token not configured"

        url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{page_id}/feed"

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.post(url, data={"message": content, "access_token": token})
            data = res.json()
            if res.status_code == 200 and "id" in data:
                logger.info(f"[SOCIAL] Facebook post published: {data['id']}")
                return True, f"Posted to Facebook (post id: {data['id']})"
            else:
                error = data.get("error", {}).get("message", str(data))
                logger.error(f"[SOCIAL] Facebook API error: {error}")
                return False, f"Facebook error: {error}"
        except Exception as e:
            logger.error(f"[SOCIAL] Facebook request failed: {e}")
            return False, f"Facebook request failed: {str(e)}"

    async def post_to_instagram(self, content: str):
        ig = self.config.get("instagram", {})
        account_id = ig.get("account_id")
        token = ig.get("token")

        if not account_id or not token:
            return False, "Instagram Account ID or Token not configured"

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r1 = await client.post(
                    f"https://graph.facebook.com/{GRAPH_API_VERSION}/{account_id}/media",
                    data={"caption": content, "media_type": "TEXT", "access_token": token}
                )
                d1 = r1.json()
                if "id" not in d1:
                    return False, f"Instagram error: {d1.get('error', {}).get('message', str(d1))}"

                r2 = await client.post(
                    f"https://graph.facebook.com/{GRAPH_API_VERSION}/{account_id}/media_publish",
                    data={"creation_id": d1["id"], "access_token": token}
                )
                d2 = r2.json()
                if "id" in d2:
                    return True, f"Posted to Instagram (id: {d2['id']})"
                return False, f"Instagram publish error: {d2.get('error', {}).get('message', str(d2))}"
        except Exception as e:
            return False, f"Instagram request failed: {str(e)}"

    async def post_to_twitter(self, content: str):
        return False, "Twitter/X integration not yet implemented"

    async def post_to_linkedin(self, content: str):
        return False, "LinkedIn integration not yet implemented"

    async def post_to_generic(self, content: str):
        return False, "Unknown platform"
