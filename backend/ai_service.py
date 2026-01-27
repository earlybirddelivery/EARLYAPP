import os
from dotenv import load_dotenv
from typing import List, Dict
import json

load_dotenv()

class AIRecommendationService:
    def __init__(self):
        # Removed Emergent LLM integration - using fallback recommendations
        pass
    
    async def get_grocery_recommendations(self, family_profile: Dict, past_orders: List[Dict] = None) -> Dict:
        """Generate grocery recommendations based on family profile"""
        return self._get_fallback_grocery_recommendations(family_profile)
    
    async def get_meal_plan(self, family_profile: Dict, days: int = 7) -> Dict:
        """Generate meal plan for the family"""
        return self._get_fallback_meal_plan(days)
    
    async def calculate_milk_requirement(self, family_profile: Dict) -> Dict:
        """Calculate daily milk requirement"""
        return self._get_fallback_milk_requirement(family_profile)
    
    def _parse_recommendations(self, response: str) -> List[str]:
        """Parse AI response into list of recommendations"""
        # Try to extract JSON if present
        try:
            if '{' in response and '}' in response:
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and 'items' in data:
                    return data['items']
        except:
            pass
        
        # Fallback: split by lines
        lines = [line.strip() for line in response.split('\n') if line.strip() and not line.strip().startswith('#')]
        return lines[:20]  # Limit to 20 items
    
    def _get_fallback_grocery_recommendations(self, family_profile: Dict) -> Dict:
        """Fallback grocery list if AI fails"""
        household_size = family_profile.get('household_size', 4)
        
        recommendations = [
            f"Vegetables (5-7 kg): Tomatoes, Onions, Potatoes, Spinach, Carrots",
            f"Fruits (3-4 kg): Apples, Bananas, Seasonal fruits",
            f"Milk ({household_size * 0.5} liters/day)",
            f"Curd/Yogurt (1 kg)",
            f"Rice ({household_size} kg)",
            f"Wheat flour ({household_size} kg)",
            f"Dal/Pulses (1 kg mixed)",
            f"Cooking oil (2 liters)",
            f"Eggs (1 dozen)" if household_size > 2 else "Eggs (6 pieces)",
            "Bread (2 loaves)",
            "Tea/Coffee",
            "Sugar (1 kg)",
            "Salt, Spices (as needed)"
        ]
        
        return {
            "recommendations": recommendations,
            "reasoning": "Standard recommendations based on household size"
        }
    
    def _get_fallback_meal_plan(self, days: int) -> Dict:
        """Fallback meal plan if AI fails"""
        return {
            "recommendations": [
                "Day-wise meal plan:",
                "Breakfast: Parathas/Idli/Poha with tea/coffee",
                "Lunch: Rice, Dal, Roti, Vegetable curry, Salad",
                "Dinner: Roti, Vegetable dish, Rice, Curd",
                "Vary vegetables and preparations daily for nutrition and variety"
            ],
            "reasoning": "Standard balanced meal plan for Indian households"
        }
    
    def _get_fallback_milk_requirement(self, family_profile: Dict) -> Dict:
        """Fallback milk calculation if AI fails"""
        members = family_profile.get('members', [])
        total_ml = 0
        
        for member in members:
            age = member.get('age', 30)
            if age < 2:
                total_ml += 500
            elif age < 9:
                total_ml += 500
            elif age < 18:
                total_ml += 750
            else:
                total_ml += 350
        
        # Add extra for cooking/tea
        total_ml += 500
        
        liters = total_ml / 1000
        
        return {
            "recommendations": [f"Recommended daily milk: {liters:.1f} liters"],
            "reasoning": f"Based on {len(members)} family members and standard nutritional guidelines"
        }

# Singleton instance
ai_service = AIRecommendationService()
