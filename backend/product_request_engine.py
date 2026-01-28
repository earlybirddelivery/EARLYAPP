"""
product_request_engine.py - Product Request Queue Management System
Handles customer product requests and admin approval workflow
"""

from datetime import datetime
from typing import Optional, List, Dict
from database import db
from bson.objectid import ObjectId


class ProductRequestEngine:
    """
    Manages product addition requests from customers
    Admin approval workflow with notifications
    """

    # Status constants
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"
    STATUS_IN_PROGRESS = "IN_PROGRESS"

    REQUEST_STATUSES = [STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED, STATUS_IN_PROGRESS]

    @staticmethod
    def create_request(
        customer_id: str,
        product_name: str,
        description: str,
        category: Optional[str] = None,
        estimated_price: Optional[float] = None,
        urgency: str = "normal",  # low, normal, high
        notes: Optional[str] = None
    ) -> Dict:
        """
        Create new product request
        
        Args:
            customer_id: ID of requesting customer
            product_name: Name of requested product
            description: Detailed description
            category: Product category
            estimated_price: Estimated price if known
            urgency: Request urgency level
            notes: Additional notes from customer
            
        Returns:
            Created request object with ID
            
        Raises:
            ValueError: If product_name is empty
        """
        if not product_name or not product_name.strip():
            raise ValueError("Product name is required")

        request_obj = {
            "customer_id": customer_id,
            "product_name": product_name.strip(),
            "description": description.strip() if description else "",
            "category": category,
            "estimated_price": estimated_price,
            "urgency": urgency,
            "notes": notes,
            "status": ProductRequestEngine.STATUS_PENDING,
            "votes": 1,  # Customer's own vote
            "voted_by": [customer_id],  # Track who voted
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "approved_at": None,
            "rejected_at": None,
            "rejection_reason": None,
            "admin_notes": None,
            "approved_by": None
        }

        result = db.product_requests.insert_one(request_obj)
        request_obj["_id"] = str(result.inserted_id)
        
        return request_obj

    @staticmethod
    def get_request(request_id: str) -> Optional[Dict]:
        """Get request by ID"""
        try:
            request = db.product_requests.find_one({"_id": ObjectId(request_id)})
            if request:
                request["_id"] = str(request["_id"])
            return request
        except:
            return None

    @staticmethod
    def list_requests(
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "votes"  # votes, created_at, urgency
    ) -> List[Dict]:
        """
        List product requests with filtering
        
        Args:
            status: Filter by status (PENDING, APPROVED, etc)
            skip: Pagination offset
            limit: Maximum results
            sort_by: Sort field (votes, created_at, urgency)
            
        Returns:
            List of requests
        """
        query = {}
        if status:
            query["status"] = status

        # Sort order
        sort_order = -1 if sort_by == "votes" else -1
        sort_field = sort_by if sort_by in ["votes", "urgency"] else "created_at"

        requests = list(
            db.product_requests.find(query)
            .sort(sort_field, sort_order)
            .skip(skip)
            .limit(limit)
        )

        for req in requests:
            req["_id"] = str(req["_id"])

        return requests

    @staticmethod
    def get_customer_requests(customer_id: str) -> List[Dict]:
        """Get all requests from specific customer"""
        requests = list(
            db.product_requests.find({"customer_id": customer_id})
            .sort("created_at", -1)
        )

        for req in requests:
            req["_id"] = str(req["_id"])

        return requests

    @staticmethod
    def upvote_request(request_id: str, customer_id: str) -> bool:
        """
        Customer upvotes a request (showing interest)
        
        Args:
            request_id: Request to upvote
            customer_id: Customer voting
            
        Returns:
            True if vote added, False if already voted
        """
        try:
            request = db.product_requests.find_one({"_id": ObjectId(request_id)})
            if not request:
                return False

            # Check if already voted
            if customer_id in request.get("voted_by", []):
                return False  # Already voted

            # Add vote
            db.product_requests.update_one(
                {"_id": ObjectId(request_id)},
                {
                    "$inc": {"votes": 1},
                    "$push": {"voted_by": customer_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            return True
        except:
            return False

    @staticmethod
    def approve_request(
        request_id: str,
        admin_id: str,
        admin_notes: Optional[str] = None
    ) -> Dict:
        """
        Admin approves a product request
        
        Args:
            request_id: Request to approve
            admin_id: Admin approving
            admin_notes: Notes from admin
            
        Returns:
            Updated request object
            
        Raises:
            ValueError: If request not found or already approved
        """
        try:
            request = db.product_requests.find_one({"_id": ObjectId(request_id)})
            if not request:
                raise ValueError("Request not found")

            if request.get("status") != ProductRequestEngine.STATUS_PENDING:
                raise ValueError(f"Can only approve PENDING requests, current status: {request.get('status')}")

            # Update request
            db.product_requests.update_one(
                {"_id": ObjectId(request_id)},
                {
                    "$set": {
                        "status": ProductRequestEngine.STATUS_APPROVED,
                        "approved_by": admin_id,
                        "approved_at": datetime.utcnow(),
                        "admin_notes": admin_notes,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Fetch and return updated
            updated = db.product_requests.find_one({"_id": ObjectId(request_id)})
            updated["_id"] = str(updated["_id"])
            
            # Trigger notification (WhatsApp)
            ProductRequestEngine._send_approval_notification(updated)
            
            return updated
        except Exception as e:
            raise ValueError(str(e))

    @staticmethod
    def reject_request(
        request_id: str,
        admin_id: str,
        rejection_reason: str,
        admin_notes: Optional[str] = None
    ) -> Dict:
        """
        Admin rejects a product request
        
        Args:
            request_id: Request to reject
            admin_id: Admin rejecting
            rejection_reason: Reason for rejection
            admin_notes: Additional notes
            
        Returns:
            Updated request object
            
        Raises:
            ValueError: If request not found or not pending
        """
        try:
            request = db.product_requests.find_one({"_id": ObjectId(request_id)})
            if not request:
                raise ValueError("Request not found")

            if request.get("status") != ProductRequestEngine.STATUS_PENDING:
                raise ValueError(f"Can only reject PENDING requests")

            # Update request
            db.product_requests.update_one(
                {"_id": ObjectId(request_id)},
                {
                    "$set": {
                        "status": ProductRequestEngine.STATUS_REJECTED,
                        "rejected_at": datetime.utcnow(),
                        "rejection_reason": rejection_reason,
                        "admin_notes": admin_notes,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Fetch and return updated
            updated = db.product_requests.find_one({"_id": ObjectId(request_id)})
            updated["_id"] = str(updated["_id"])
            
            # Trigger notification (WhatsApp)
            ProductRequestEngine._send_rejection_notification(updated)
            
            return updated
        except Exception as e:
            raise ValueError(str(e))

    @staticmethod
    def get_statistics() -> Dict:
        """
        Get request statistics for admin dashboard
        
        Returns:
            Dict with stats
        """
        total = db.product_requests.count_documents({})
        pending = db.product_requests.count_documents({"status": ProductRequestEngine.STATUS_PENDING})
        approved = db.product_requests.count_documents({"status": ProductRequestEngine.STATUS_APPROVED})
        rejected = db.product_requests.count_documents({"status": ProductRequestEngine.STATUS_REJECTED})

        # Top requested products
        top_products = list(
            db.product_requests.aggregate([
                {"$group": {"_id": "$product_name", "count": {"$sum": 1}, "votes": {"$sum": "$votes"}}},
                {"$sort": {"votes": -1}},
                {"$limit": 5}
            ])
        )

        return {
            "total_requests": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": (approved / total * 100) if total > 0 else 0,
            "top_requested": top_products
        }

    @staticmethod
    def _send_approval_notification(request: Dict):
        """Send WhatsApp notification for approved request"""
        try:
            # TODO: Integrate with WhatsApp service
            customer_id = request.get("customer_id")
            product_name = request.get("product_name")
            # Message: "Your request for {product_name} has been approved! We'll add it soon."
        except Exception as e:
            print(f"Error sending approval notification: {e}")

    @staticmethod
    def _send_rejection_notification(request: Dict):
        """Send WhatsApp notification for rejected request"""
        try:
            # TODO: Integrate with WhatsApp service
            customer_id = request.get("customer_id")
            product_name = request.get("product_name")
            reason = request.get("rejection_reason")
            # Message: "Your request for {product_name} was not approved. Reason: {reason}"
        except Exception as e:
            print(f"Error sending rejection notification: {e}")


if __name__ == "__main__":
    # Test
    print("ProductRequestEngine loaded successfully")
