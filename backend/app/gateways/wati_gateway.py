import httpx
import logging
import urllib.parse
from typing import Any, Dict, List
from app.gateways.base import BaseGateway

logger = logging.getLogger(__name__)

class WatiGateway(BaseGateway):
    """
    WATI WhatsApp Gateway.
    Config expected keys:
        wati_endpoint: The base URL for your WATI account (e.g., https://live-mt-server.wati.io/10156822)
        wati_token: The Bearer token for authentication
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        # We take the endpoint as-is, just strip trailing slashes and common API paths to avoid doubling
        raw_endpoint = config.get("wati_endpoint", "").rstrip("/")
        self.endpoint = raw_endpoint.replace("/api/v1", "").replace("/sendTemplateMessage", "").replace("/sendSessionMessage", "").replace("/getContacts", "").rstrip("/")
        
        # Clean token: remove redundant 'Bearer ' prefix if user added it, and strip spaces
        self.token = config.get("wati_token", "").replace("Bearer ", "").strip()
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.template_name = config.get("wati_template_name", "").strip()

    async def send_single(self, recipient: str, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Send a session message or a template message via WATI.
        recipient: Phone number with country code (e.g., 919876543210)
        """
        if not self.endpoint or not self.token:
            return {"success": False, "error": "WATI configuration incomplete (missing endpoint or token)."}

        # WATI expects the phone number without '+'
        clean_recipient = str(recipient).lstrip("+")
        base_url = self.endpoint

        # Check if we should send a template message
        template_name = None
        if context and context.get("template_name"):
            template_name = context.get("template_name")
        elif message and message.startswith("template:"):
            template_name = message.replace("template:", "").strip()
        elif self.template_name:
            template_name = self.template_name

        if template_name:
            # Construct WATI template message URL
            url = f"{base_url}/api/v1/sendTemplateMessage?whatsappNumber={clean_recipient}"
            
            # Wati expects parameters in format [{"name": "name", "value": "value"}]
            parameters = []
            if context and context.get("parameters"):
                parameters = context.get("parameters")
            elif context and context.get("contact"):
                contact = context["contact"]
                parameters = [
                    {"name": "name", "value": getattr(contact, "user_name", "") or ""},
                    {"name": "email", "value": getattr(contact, "email", "") or ""},
                    {"name": "phone", "value": getattr(contact, "phone", "") or ""}
                ]

            payload = {
                "template_name": template_name,
                "broadcast_name": "OCAP Broadcast",
                "parameters": parameters
            }
            logger.info(f"WATI: Attempting to send template message to {recipient} via {url}")
        else:
            if not message:
                return {"success": False, "error": "Internal Error: Message content is empty."}

            # Encoded message for query parameter
            encoded_message = urllib.parse.quote(message)
            url = f"{base_url}/api/v1/sendSessionMessage/{clean_recipient}?messageText={encoded_message}"
            
            logger.info(f"WATI: Attempting to send session message to URL: {url}")
            
            # Include whatsappNumber in body too as some versions require it
            payload = {
                "whatsappNumber": clean_recipient,
                "messageText": message,
                "body": message
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                logger.info(f"WATI Response Status: {response.status_code}")
                logger.info(f"WATI Response Body: {response.text}")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("result") == "success" or data.get("validWhatsAppNumber") is True or data.get("status") == "success" or data.get("result") is True:
                        return {"success": True, "recipient": recipient, "message_id": data.get("id")}
                    else:
                        # Return detailed error from API if available
                        err_msg = data.get("errors") or data.get("message") or data.get("info") or f"API Response: {data}"
                        err_str = str(err_msg)
                        if "Ticket has been expired" in err_str:
                            err_str = (
                                f"WhatsApp session expired (Ticket has been expired). "
                                f"To send a free-form message, please text your WhatsApp Business number first from +{clean_recipient} "
                                f"to open a 24-hour session window. Alternatively, configure a pre-approved WATI Template Name "
                                f"in your project settings to bypass this session window."
                            )
                        return {"success": False, "error": err_str}
                else:
                    return {"success": False, "error": f"WATI Error {response.status_code}: {response.text}"}
        except Exception as e:
            logger.error(f"WATI Exception during send to {recipient}: {e}")
            return {"success": False, "error": str(e)}

    async def send_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for item in batch:
            res = await self.send_single(item["recipient"], item["message"], item.get("context"))
            results.append(res)
        return results

    async def get_status(self, message_id: str) -> str:
        return "sent"

    async def verify_connection(self) -> tuple[bool, str]:
        if not self.endpoint or not self.token:
            return False, "WATI configuration incomplete."

        # Attempt to fetch contacts with limit 1
        url = f"{self.endpoint}/api/v1/getContacts?pageSize=1&pageNumber=1"
        logger.info(f"WATI: Verifying connection with URL: {url}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=self.headers)
                logger.info(f"WATI Verify Status: {response.status_code}")
                if response.status_code == 200:
                    return True, "WATI connection successful."
                else:
                    return False, f"WATI Error {response.status_code}: {response.text}"
        except Exception as e:
            return False, f"WATI Connection Failed: {str(e)}"
