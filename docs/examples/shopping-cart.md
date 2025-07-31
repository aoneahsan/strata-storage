# Shopping Cart Examples

Examples of implementing shopping cart functionality with Strata Storage.

## Basic Shopping Cart

```typescript
import { Strata } from 'strata-storage';

class ShoppingCart {
  private storage: Strata;
  private cartKey = 'shopping-cart';
  
  constructor() {
    this.storage = new Strata({
      sync: { enabled: true } // Sync across tabs
    });
  }
  
  async addItem(product: Product, quantity = 1) {
    const cart = await this.getCart();
    
    const existingItem = cart.items.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image
      });
    }
    
    cart.updatedAt = Date.now();
    await this.saveCart(cart);
  }
  
  async removeItem(productId: string) {
    const cart = await this.getCart();
    cart.items = cart.items.filter(item => item.id !== productId);
    cart.updatedAt = Date.now();
    await this.saveCart(cart);
  }
  
  async updateQuantity(productId: string, quantity: number) {
    const cart = await this.getCart();
    const item = cart.items.find(i => i.id === productId);
    
    if (item) {
      if (quantity <= 0) {
        await this.removeItem(productId);
      } else {
        item.quantity = quantity;
        cart.updatedAt = Date.now();
        await this.saveCart(cart);
      }
    }
  }
  
  async getCart(): Promise<Cart> {
    const cart = await this.storage.get(this.cartKey);
    return cart || { items: [], updatedAt: Date.now() };
  }
  
  private async saveCart(cart: Cart) {
    await this.storage.set(this.cartKey, cart);
  }
}
```

## Cart with Persistence

```typescript
class PersistentCart {
  private storage: Strata;
  private tempCartKey = 'temp-cart';
  private savedCartKey = 'saved-cart';
  
  async saveForLater(productId: string) {
    const tempCart = await this.getCart(this.tempCartKey);
    const savedCart = await this.getCart(this.savedCartKey);
    
    const item = tempCart.items.find(i => i.id === productId);
    if (item) {
      // Move from temp to saved
      tempCart.items = tempCart.items.filter(i => i.id !== productId);
      savedCart.items.push(item);
      
      await Promise.all([
        this.storage.set(this.tempCartKey, tempCart),
        this.storage.set(this.savedCartKey, savedCart)
      ]);
    }
  }
  
  async moveToCart(productId: string) {
    const tempCart = await this.getCart(this.tempCartKey);
    const savedCart = await this.getCart(this.savedCartKey);
    
    const item = savedCart.items.find(i => i.id === productId);
    if (item) {
      savedCart.items = savedCart.items.filter(i => i.id !== productId);
      tempCart.items.push(item);
      
      await Promise.all([
        this.storage.set(this.tempCartKey, tempCart),
        this.storage.set(this.savedCartKey, savedCart)
      ]);
    }
  }
}
```

## Cart Analytics

```typescript
class CartAnalytics {
  private storage: Strata;
  
  async trackAddToCart(product: Product, quantity: number) {
    await this.storage.set(`analytics:cart:${Date.now()}`, {
      event: 'add_to_cart',
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price
      },
      quantity,
      timestamp: Date.now()
    }, {
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
  
  async getCartStats() {
    const events = await this.storage.query({
      key: { $startsWith: 'analytics:cart:' },
      'value.timestamp': { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 }
    });
    
    const stats = {
      totalAdds: 0,
      uniqueProducts: new Set(),
      totalValue: 0,
      averageQuantity: 0
    };
    
    for (const event of events) {
      if (event.value.event === 'add_to_cart') {
        stats.totalAdds++;
        stats.uniqueProducts.add(event.value.product.id);
        stats.totalValue += event.value.product.price * event.value.quantity;
        stats.averageQuantity += event.value.quantity;
      }
    }
    
    stats.averageQuantity /= stats.totalAdds || 1;
    
    return {
      ...stats,
      uniqueProducts: stats.uniqueProducts.size
    };
  }
}
```

## Cart Recovery

```typescript
class CartRecovery {
  private storage: Strata;
  
  async saveAbandonedCart(email: string) {
    const cart = await this.storage.get('shopping-cart');
    if (!cart || cart.items.length === 0) return;
    
    await this.storage.set(`abandoned:${email}`, {
      cart,
      email,
      abandonedAt: Date.now(),
      recovered: false
    }, {
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
  
  async recoverCart(recoveryToken: string) {
    const abandoned = await this.storage.get(`abandoned:${recoveryToken}`);
    
    if (abandoned && !abandoned.recovered) {
      // Restore cart
      await this.storage.set('shopping-cart', abandoned.cart);
      
      // Mark as recovered
      abandoned.recovered = true;
      abandoned.recoveredAt = Date.now();
      await this.storage.set(`abandoned:${recoveryToken}`, abandoned);
      
      return abandoned.cart;
    }
    
    return null;
  }
}
```

## Cart Calculations

```typescript
class CartCalculator {
  private storage: Strata;
  
  async calculateTotals() {
    const cart = await this.storage.get('shopping-cart') || { items: [] };
    const discounts = await this.getActiveDiscounts();
    
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    
    // Calculate subtotal
    for (const item of cart.items) {
      subtotal += item.price * item.quantity;
    }
    
    // Apply discounts
    for (const disc of discounts) {
      if (disc.type === 'percentage') {
        discount += subtotal * (disc.value / 100);
      } else if (disc.type === 'fixed') {
        discount += disc.value;
      }
    }
    
    // Calculate tax (example: 8%)
    const taxRate = 0.08;
    tax = (subtotal - discount) * taxRate;
    
    const total = subtotal - discount + tax;
    
    // Cache the calculation
    await this.storage.set('cart-totals', {
      subtotal,
      discount,
      tax,
      total,
      calculatedAt: Date.now()
    }, {
      ttl: 300000 // 5 minutes
    });
    
    return { subtotal, discount, tax, total };
  }
}
```

## Multi-Currency Cart

```typescript
class MultiCurrencyCart {
  private storage: Strata;
  private exchangeRates = new Map<string, number>();
  
  async setItemCurrency(productId: string, currency: string) {
    const cart = await this.getCart();
    const item = cart.items.find(i => i.id === productId);
    
    if (item) {
      const rate = await this.getExchangeRate(item.currency, currency);
      item.originalPrice = item.price;
      item.originalCurrency = item.currency;
      item.price = item.price * rate;
      item.currency = currency;
      
      await this.saveCart(cart);
    }
  }
  
  async getExchangeRate(from: string, to: string): Promise<number> {
    const key = `${from}-${to}`;
    
    // Check cache
    const cached = await this.storage.get(`exchange:${key}`);
    if (cached) return cached.rate;
    
    // Fetch fresh rate
    const response = await fetch(`/api/exchange/${from}/${to}`);
    const data = await response.json();
    
    // Cache for 1 hour
    await this.storage.set(`exchange:${key}`, {
      rate: data.rate,
      timestamp: Date.now()
    }, {
      ttl: 3600000
    });
    
    return data.rate;
  }
}
```

## Cart Validation

```typescript
class CartValidator {
  private storage: Strata;
  
  async validateCart(): Promise<ValidationResult> {
    const cart = await this.storage.get('shopping-cart');
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!cart || cart.items.length === 0) {
      errors.push('Cart is empty');
      return { valid: false, errors, warnings };
    }
    
    // Check stock availability
    for (const item of cart.items) {
      const stock = await this.checkStock(item.id);
      
      if (stock === 0) {
        errors.push(`${item.name} is out of stock`);
      } else if (stock < item.quantity) {
        warnings.push(`Only ${stock} ${item.name} available`);
        item.quantity = stock; // Adjust quantity
      }
    }
    
    // Check price changes
    for (const item of cart.items) {
      const currentPrice = await this.getCurrentPrice(item.id);
      
      if (currentPrice !== item.price) {
        warnings.push(`Price changed for ${item.name}`);
        item.price = currentPrice;
      }
    }
    
    // Save updated cart
    if (warnings.length > 0) {
      await this.storage.set('shopping-cart', cart);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

## Guest Cart Merge

```typescript
class CartMerger {
  private storage: Strata;
  
  async mergeGuestCart(userId: string) {
    const guestCart = await this.storage.get('guest-cart');
    const userCart = await this.storage.get(`user-cart:${userId}`);
    
    if (!guestCart || guestCart.items.length === 0) {
      return userCart;
    }
    
    if (!userCart || userCart.items.length === 0) {
      // Just use guest cart
      await this.storage.set(`user-cart:${userId}`, guestCart);
      await this.storage.remove('guest-cart');
      return guestCart;
    }
    
    // Merge carts
    const merged = { ...userCart };
    
    for (const guestItem of guestCart.items) {
      const existingItem = merged.items.find(i => i.id === guestItem.id);
      
      if (existingItem) {
        existingItem.quantity += guestItem.quantity;
      } else {
        merged.items.push(guestItem);
      }
    }
    
    merged.updatedAt = Date.now();
    
    // Save merged cart
    await this.storage.set(`user-cart:${userId}`, merged);
    await this.storage.remove('guest-cart');
    
    return merged;
  }
}
```

## See Also

- [Data Sync](./data-sync.md)
- [User Authentication](./user-auth.md)
- [Form Persistence](./form-persistence.md)