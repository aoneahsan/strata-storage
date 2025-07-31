# Analytics Examples

Examples of implementing analytics tracking and data collection with Strata Storage.

## Basic Event Tracking

```typescript
import { Strata } from 'strata-storage';

class Analytics {
  private storage: Strata;
  private sessionId: string;
  
  constructor() {
    this.storage = new Strata({
      namespace: 'analytics',
      compression: { enabled: true }
    });
    this.sessionId = this.generateSessionId();
  }
  
  async track(eventName: string, properties?: any) {
    const event = {
      id: generateId(),
      name: eventName,
      properties,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    await this.storage.set(`event:${event.id}`, event, {
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Queue for batch sending
    await this.queueForBatch(event);
  }
  
  private async queueForBatch(event: any) {
    const queue = await this.storage.get('event-queue') || [];
    queue.push(event);
    
    if (queue.length >= 10) {
      await this.sendBatch(queue);
      await this.storage.remove('event-queue');
    } else {
      await this.storage.set('event-queue', queue);
    }
  }
}
```

## Page View Tracking

```typescript
class PageViewTracker {
  private storage: Strata;
  private startTime: number;
  private pageId: string;
  
  async trackPageView() {
    this.startTime = Date.now();
    this.pageId = generateId();
    
    const pageView = {
      id: this.pageId,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: this.startTime,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height
      }
    };
    
    await this.storage.set(`pageview:${this.pageId}`, pageView);
    
    // Track time on page
    window.addEventListener('beforeunload', () => {
      this.trackTimeOnPage();
    });
  }
  
  private async trackTimeOnPage() {
    const duration = Date.now() - this.startTime;
    const pageView = await this.storage.get(`pageview:${this.pageId}`);
    
    if (pageView) {
      pageView.duration = duration;
      pageView.exitTime = Date.now();
      await this.storage.set(`pageview:${this.pageId}`, pageView);
    }
  }
}
```

## User Behavior Analytics

```typescript
class UserBehaviorAnalytics {
  private storage: Strata;
  private interactions: any[] = [];
  
  async trackInteraction(element: HTMLElement, type: string) {
    const interaction = {
      type,
      element: {
        tag: element.tagName,
        id: element.id,
        class: element.className,
        text: element.textContent?.substring(0, 50)
      },
      timestamp: Date.now(),
      position: this.getElementPosition(element)
    };
    
    this.interactions.push(interaction);
    
    // Batch save interactions
    if (this.interactions.length >= 20) {
      await this.saveInteractions();
    }
  }
  
  private async saveInteractions() {
    const sessionId = await this.getSessionId();
    
    await this.storage.set(`interactions:${sessionId}:${Date.now()}`, {
      interactions: this.interactions,
      count: this.interactions.length,
      sessionId,
      timestamp: Date.now()
    });
    
    this.interactions = [];
  }
  
  async generateHeatmap(url: string): Promise<HeatmapData> {
    const interactions = await this.storage.query({
      key: { $startsWith: 'interactions:' },
      'value.url': url
    });
    
    const heatmap: HeatmapData = {
      clicks: [],
      hovers: [],
      scrollDepth: 0
    };
    
    interactions.forEach(item => {
      item.value.interactions.forEach((interaction: any) => {
        if (interaction.type === 'click') {
          heatmap.clicks.push(interaction.position);
        } else if (interaction.type === 'hover') {
          heatmap.hovers.push(interaction.position);
        }
      });
    });
    
    return heatmap;
  }
}
```

## Conversion Tracking

```typescript
class ConversionTracker {
  private storage: Strata;
  
  async trackConversion(conversionType: string, value?: number, metadata?: any) {
    const conversion = {
      id: generateId(),
      type: conversionType,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: await this.getSessionId(),
      source: await this.getTrafficSource()
    };
    
    await this.storage.set(`conversion:${conversion.id}`, conversion);
    
    // Update conversion funnel
    await this.updateFunnel(conversionType);
  }
  
  private async updateFunnel(conversionType: string) {
    const funnelKey = `funnel:${conversionType}`;
    const funnel = await this.storage.get(funnelKey) || {
      steps: {},
      conversions: 0
    };
    
    funnel.conversions++;
    funnel.lastConversion = Date.now();
    
    await this.storage.set(funnelKey, funnel);
  }
  
  async getConversionRate(type: string, timeframe: number): Promise<number> {
    const since = Date.now() - timeframe;
    
    const conversions = await this.storage.query({
      key: { $startsWith: 'conversion:' },
      'value.type': type,
      'value.timestamp': { $gte: since }
    });
    
    const sessions = await this.storage.query({
      key: { $startsWith: 'session:' },
      'value.timestamp': { $gte: since }
    });
    
    return (conversions.length / sessions.length) * 100;
  }
}
```

## Custom Metrics

```typescript
class CustomMetrics {
  private storage: Strata;
  
  async recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };
    
    await this.storage.set(`metric:${name}:${Date.now()}`, metric, {
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Update aggregates
    await this.updateAggregates(name, value);
  }
  
  private async updateAggregates(name: string, value: number) {
    const hourKey = `aggregate:${name}:hour:${Math.floor(Date.now() / 3600000)}`;
    const dayKey = `aggregate:${name}:day:${Math.floor(Date.now() / 86400000)}`;
    
    await this.updateAggregate(hourKey, value, 3600000);
    await this.updateAggregate(dayKey, value, 86400000);
  }
  
  private async updateAggregate(key: string, value: number, ttl: number) {
    const agg = await this.storage.get(key) || {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity
    };
    
    agg.count++;
    agg.sum += value;
    agg.min = Math.min(agg.min, value);
    agg.max = Math.max(agg.max, value);
    agg.avg = agg.sum / agg.count;
    
    await this.storage.set(key, agg, { ttl });
  }
}
```

## A/B Testing

```typescript
class ABTesting {
  private storage: Strata;
  
  async getVariant(experimentId: string): Promise<string> {
    // Check if user already has a variant
    const key = `experiment:${experimentId}`;
    const existing = await this.storage.get(key);
    
    if (existing) {
      return existing.variant;
    }
    
    // Assign new variant
    const variant = Math.random() < 0.5 ? 'A' : 'B';
    
    await this.storage.set(key, {
      variant,
      assignedAt: Date.now(),
      experimentId
    });
    
    // Track assignment
    await this.trackAssignment(experimentId, variant);
    
    return variant;
  }
  
  async trackGoal(experimentId: string, goalName: string, value?: number) {
    const experiment = await this.storage.get(`experiment:${experimentId}`);
    if (!experiment) return;
    
    const goal = {
      experimentId,
      variant: experiment.variant,
      goalName,
      value,
      timestamp: Date.now()
    };
    
    await this.storage.set(`goal:${experimentId}:${Date.now()}`, goal);
  }
  
  async getResults(experimentId: string): Promise<ExperimentResults> {
    const goals = await this.storage.query({
      key: { $startsWith: `goal:${experimentId}:` }
    });
    
    const results: ExperimentResults = {
      A: { conversions: 0, totalValue: 0 },
      B: { conversions: 0, totalValue: 0 }
    };
    
    goals.forEach(item => {
      const goal = item.value;
      results[goal.variant].conversions++;
      results[goal.variant].totalValue += goal.value || 0;
    });
    
    return results;
  }
}
```

## Performance Monitoring

```typescript
class PerformanceMonitor {
  private storage: Strata;
  
  async trackPerformance() {
    const metrics = {
      navigation: performance.timing,
      resources: performance.getEntriesByType('resource'),
      paint: performance.getEntriesByType('paint'),
      memory: (performance as any).memory
    };
    
    const summary = {
      pageLoadTime: metrics.navigation.loadEventEnd - metrics.navigation.navigationStart,
      domContentLoaded: metrics.navigation.domContentLoadedEventEnd - metrics.navigation.navigationStart,
      firstPaint: metrics.paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: metrics.paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      resourceCount: metrics.resources.length,
      totalResourceSize: metrics.resources.reduce((sum, r: any) => sum + (r.transferSize || 0), 0),
      timestamp: Date.now()
    };
    
    await this.storage.set(`performance:${Date.now()}`, summary, {
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  
  async getPerformanceTrends(hours = 24): Promise<PerformanceTrends> {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    
    const metrics = await this.storage.query({
      key: { $startsWith: 'performance:' },
      'value.timestamp': { $gte: since }
    });
    
    return this.calculateTrends(metrics);
  }
}
```

## Error Tracking

```typescript
class ErrorTracker {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata();
    this.setupErrorHandlers();
  }
  
  private setupErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        promise: event.promise
      });
    });
  }
  
  async trackError(error: any) {
    const errorRecord = {
      id: generateId(),
      ...error,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: await this.getSessionId()
    };
    
    await this.storage.set(`error:${errorRecord.id}`, errorRecord, {
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Update error statistics
    await this.updateErrorStats(error);
  }
  
  async getErrorReport(hours = 24): Promise<ErrorReport> {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    
    const errors = await this.storage.query({
      key: { $startsWith: 'error:' },
      'value.timestamp': { $gte: since }
    });
    
    const grouped = this.groupErrors(errors);
    
    return {
      totalErrors: errors.length,
      uniqueErrors: grouped.size,
      topErrors: Array.from(grouped.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
    };
  }
}
```

## See Also

- [User Authentication](./user-auth.md)
- [Performance Optimization](./performance.md)
- [Data Sync](./data-sync.md)