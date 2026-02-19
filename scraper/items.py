"""
Curated list of 50 Australian grocery staples with search terms per store.
Each item maps to a canonical name, category, unit, and store-specific search queries.
"""

ITEMS = [
    # Dairy
    {"name": "Full Cream Milk 2L", "category": "Dairy", "unit": "2L", "unit_measure": "L", "unit_quantity": 2.0, "woolworths_search": "full cream milk 2l", "coles_search": "full cream milk 2l"},
    {"name": "Light Milk 2L", "category": "Dairy", "unit": "2L", "unit_measure": "L", "unit_quantity": 2.0, "woolworths_search": "light milk 2l", "coles_search": "lite milk 2l"},
    {"name": "Butter 500g", "category": "Dairy", "unit": "500g", "unit_measure": "kg", "unit_quantity": 0.5, "woolworths_search": "butter 500g", "coles_search": "butter 500g"},
    {"name": "Cheddar Cheese 500g", "category": "Dairy", "unit": "500g", "unit_measure": "kg", "unit_quantity": 0.5, "woolworths_search": "tasty cheese block 500g", "coles_search": "tasty cheese block 500g"},
    {"name": "Greek Yoghurt 1kg", "category": "Dairy", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "greek yoghurt 1kg", "coles_search": "greek yoghurt 1kg"},
    {"name": "Free Range Eggs 12pk", "category": "Dairy", "unit": "12pk", "unit_measure": "each", "unit_quantity": 12, "woolworths_search": "free range eggs 12", "coles_search": "free range eggs 12"},

    # Bread & Bakery
    {"name": "White Bread Loaf", "category": "Bread & Bakery", "unit": "loaf", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "white bread loaf", "coles_search": "white sandwich bread"},
    {"name": "Wholemeal Bread Loaf", "category": "Bread & Bakery", "unit": "loaf", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "wholemeal bread loaf", "coles_search": "wholemeal bread loaf"},
    {"name": "Wraps 8pk", "category": "Bread & Bakery", "unit": "8pk", "unit_measure": "each", "unit_quantity": 8, "woolworths_search": "wraps 8 pack", "coles_search": "wraps 8 pack"},
    {"name": "Sourdough Loaf", "category": "Bread & Bakery", "unit": "loaf", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "sourdough bread loaf", "coles_search": "sourdough bread loaf"},

    # Meat & Protein
    {"name": "Chicken Breast 1kg", "category": "Meat & Protein", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "chicken breast fillets 1kg", "coles_search": "chicken breast 1kg"},
    {"name": "Beef Mince 500g", "category": "Meat & Protein", "unit": "500g", "unit_measure": "kg", "unit_quantity": 0.5, "woolworths_search": "beef mince 500g", "coles_search": "beef mince 500g"},
    {"name": "Pork Sausages 500g", "category": "Meat & Protein", "unit": "500g", "unit_measure": "kg", "unit_quantity": 0.5, "woolworths_search": "pork sausages 500g", "coles_search": "pork sausages 500g"},
    {"name": "Salmon Fillets 200g", "category": "Meat & Protein", "unit": "200g", "unit_measure": "kg", "unit_quantity": 0.2, "woolworths_search": "salmon fillets 200g", "coles_search": "salmon fillets 200g"},
    {"name": "Bacon 250g", "category": "Meat & Protein", "unit": "250g", "unit_measure": "kg", "unit_quantity": 0.25, "woolworths_search": "bacon rashers 250g", "coles_search": "bacon rashers 250g"},
    {"name": "Canned Tuna 95g", "category": "Meat & Protein", "unit": "95g", "unit_measure": "kg", "unit_quantity": 0.095, "woolworths_search": "tuna in springwater 95g", "coles_search": "tuna in springwater 95g"},

    # Fruit
    {"name": "Bananas 1kg", "category": "Fruit", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "bananas", "coles_search": "bananas"},
    {"name": "Royal Gala Apples 1kg", "category": "Fruit", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "royal gala apples", "coles_search": "royal gala apples"},
    {"name": "Navel Oranges 1kg", "category": "Fruit", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "navel oranges", "coles_search": "navel oranges"},
    {"name": "Strawberries 250g", "category": "Fruit", "unit": "250g", "unit_measure": "kg", "unit_quantity": 0.25, "woolworths_search": "strawberries punnet", "coles_search": "strawberries 250g"},
    {"name": "Avocado", "category": "Fruit", "unit": "each", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "avocado each", "coles_search": "avocado each"},

    # Vegetables
    {"name": "Potatoes 2kg", "category": "Vegetables", "unit": "2kg", "unit_measure": "kg", "unit_quantity": 2.0, "woolworths_search": "potatoes washed 2kg", "coles_search": "washed potatoes 2kg"},
    {"name": "Brown Onions 1kg", "category": "Vegetables", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "brown onions 1kg", "coles_search": "brown onions 1kg"},
    {"name": "Tomatoes 1kg", "category": "Vegetables", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "tomatoes truss", "coles_search": "truss tomatoes"},
    {"name": "Broccoli", "category": "Vegetables", "unit": "each", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "broccoli", "coles_search": "broccoli"},
    {"name": "Carrots 1kg", "category": "Vegetables", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "carrots 1kg", "coles_search": "carrots 1kg"},
    {"name": "Iceberg Lettuce", "category": "Vegetables", "unit": "each", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "iceberg lettuce", "coles_search": "iceberg lettuce"},

    # Pantry
    {"name": "White Rice 1kg", "category": "Pantry", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "white rice 1kg", "coles_search": "white rice 1kg"},
    {"name": "Penne Pasta 500g", "category": "Pantry", "unit": "500g", "unit_measure": "kg", "unit_quantity": 0.5, "woolworths_search": "penne pasta 500g", "coles_search": "penne pasta 500g"},
    {"name": "Olive Oil 500mL", "category": "Pantry", "unit": "500mL", "unit_measure": "L", "unit_quantity": 0.5, "woolworths_search": "extra virgin olive oil 500ml", "coles_search": "extra virgin olive oil 500ml"},
    {"name": "Canned Tomatoes 400g", "category": "Pantry", "unit": "400g", "unit_measure": "kg", "unit_quantity": 0.4, "woolworths_search": "diced tomatoes 400g", "coles_search": "diced tomatoes 400g"},
    {"name": "Peanut Butter 375g", "category": "Pantry", "unit": "375g", "unit_measure": "kg", "unit_quantity": 0.375, "woolworths_search": "peanut butter smooth 375g", "coles_search": "peanut butter smooth 375g"},
    {"name": "Vegemite 380g", "category": "Pantry", "unit": "380g", "unit_measure": "kg", "unit_quantity": 0.38, "woolworths_search": "vegemite 380g", "coles_search": "vegemite 380g"},
    {"name": "Weet-Bix 575g", "category": "Pantry", "unit": "575g", "unit_measure": "kg", "unit_quantity": 0.575, "woolworths_search": "weet-bix 575g", "coles_search": "weet-bix 575g"},
    {"name": "Rolled Oats 1kg", "category": "Pantry", "unit": "1kg", "unit_measure": "kg", "unit_quantity": 1.0, "woolworths_search": "rolled oats 1kg", "coles_search": "rolled oats 1kg"},

    # Snacks
    {"name": "Tim Tams Original", "category": "Snacks", "unit": "200g", "unit_measure": "kg", "unit_quantity": 0.2, "woolworths_search": "tim tam original", "coles_search": "tim tam original"},
    {"name": "Shapes BBQ", "category": "Snacks", "unit": "175g", "unit_measure": "kg", "unit_quantity": 0.175, "woolworths_search": "shapes bbq", "coles_search": "shapes bbq"},
    {"name": "Smith's Original Chips 170g", "category": "Snacks", "unit": "170g", "unit_measure": "kg", "unit_quantity": 0.17, "woolworths_search": "smiths original chips 170g", "coles_search": "smiths chips original 170g"},

    # Drinks
    {"name": "Instant Coffee 200g", "category": "Drinks", "unit": "200g", "unit_measure": "kg", "unit_quantity": 0.2, "woolworths_search": "nescafe blend 43 200g", "coles_search": "nescafe blend 43 200g"},
    {"name": "Tea Bags 100pk", "category": "Drinks", "unit": "100pk", "unit_measure": "each", "unit_quantity": 100, "woolworths_search": "tea bags 100", "coles_search": "tea bags 100"},
    {"name": "Orange Juice 2L", "category": "Drinks", "unit": "2L", "unit_measure": "L", "unit_quantity": 2.0, "woolworths_search": "orange juice 2l", "coles_search": "orange juice 2l"},
    {"name": "Coca-Cola 1.25L", "category": "Drinks", "unit": "1.25L", "unit_measure": "L", "unit_quantity": 1.25, "woolworths_search": "coca cola 1.25l", "coles_search": "coca cola 1.25l"},

    # Household
    {"name": "Toilet Paper 12pk", "category": "Household", "unit": "12pk", "unit_measure": "each", "unit_quantity": 12, "woolworths_search": "toilet paper 12 pack", "coles_search": "toilet paper 12 pack"},
    {"name": "Paper Towel 4pk", "category": "Household", "unit": "4pk", "unit_measure": "each", "unit_quantity": 4, "woolworths_search": "paper towel 4 pack", "coles_search": "paper towel 4 pack"},
    {"name": "Dish Detergent 500mL", "category": "Household", "unit": "500mL", "unit_measure": "L", "unit_quantity": 0.5, "woolworths_search": "dishwashing liquid 500ml", "coles_search": "dishwashing liquid 500ml"},
    {"name": "Laundry Liquid 1L", "category": "Household", "unit": "1L", "unit_measure": "L", "unit_quantity": 1.0, "woolworths_search": "laundry liquid 1l", "coles_search": "laundry liquid 1l"},

    # Essentials
    {"name": "Tissues 200pk", "category": "Essentials", "unit": "200pk", "unit_measure": "each", "unit_quantity": 200, "woolworths_search": "tissues 200", "coles_search": "tissues 200"},
    {"name": "Aluminium Foil 30m", "category": "Essentials", "unit": "30m", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "aluminium foil 30m", "coles_search": "alfoil 30m"},
    {"name": "Glad Wrap 30m", "category": "Essentials", "unit": "30m", "unit_measure": "each", "unit_quantity": 1, "woolworths_search": "glad wrap 30m", "coles_search": "glad wrap 30m"},
    {"name": "Sponges 5pk", "category": "Essentials", "unit": "5pk", "unit_measure": "each", "unit_quantity": 5, "woolworths_search": "sponges 5 pack", "coles_search": "sponges 5 pack"},
]
