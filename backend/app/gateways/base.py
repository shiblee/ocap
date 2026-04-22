from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseGateway(ABC):
    @abstractmethod
    async def send_single(self, recipient: str, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a single message."""
        pass

    @abstractmethod
    async def send_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Send a batch of messages."""
        pass

    @abstractmethod
    async def get_status(self, message_id: str) -> str:
        """Get the delivery status of a message."""
        pass
