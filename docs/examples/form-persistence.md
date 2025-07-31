# Form Persistence Examples

Examples of persisting form data to prevent data loss and improve user experience.

## Basic Form Auto-Save

```typescript
import { Strata } from 'strata-storage';

class FormPersistence {
  private storage: Strata;
  private formId: string;
  private saveDelay = 1000; // 1 second
  private saveTimer: any;
  
  constructor(formId: string) {
    this.storage = new Strata();
    this.formId = formId;
  }
  
  attachToForm(formElement: HTMLFormElement) {
    // Load saved data
    this.loadFormData(formElement);
    
    // Listen for changes
    formElement.addEventListener('input', (e) => {
      this.scheduleAutoSave(formElement);
    });
    
    // Clear on submit
    formElement.addEventListener('submit', () => {
      this.clearFormData();
    });
  }
  
  private scheduleAutoSave(form: HTMLFormElement) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveFormData(form);
    }, this.saveDelay);
  }
  
  private async saveFormData(form: HTMLFormElement) {
    const formData = new FormData(form);
    const data: any = {};
    
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    await this.storage.set(`form:${this.formId}`, {
      data,
      savedAt: Date.now()
    });
  }
  
  private async loadFormData(form: HTMLFormElement) {
    const saved = await this.storage.get(`form:${this.formId}`);
    if (!saved) return;
    
    Object.entries(saved.data).forEach(([key, value]) => {
      const field = form.elements.namedItem(key) as HTMLInputElement;
      if (field) {
        field.value = value as string;
      }
    });
  }
  
  async clearFormData() {
    await this.storage.remove(`form:${this.formId}`);
  }
}
```

## Multi-Step Form

```typescript
class MultiStepForm {
  private storage: Strata;
  private formId: string;
  private currentStep = 1;
  
  async saveStep(stepNumber: number, data: any) {
    const formData = await this.getFormData();
    formData.steps[stepNumber] = {
      data,
      completedAt: Date.now()
    };
    formData.currentStep = stepNumber;
    formData.lastUpdated = Date.now();
    
    await this.storage.set(`form:${this.formId}`, formData);
  }
  
  async loadStep(stepNumber: number) {
    const formData = await this.getFormData();
    return formData.steps[stepNumber]?.data || {};
  }
  
  async getProgress(): Promise<FormProgress> {
    const formData = await this.getFormData();
    const totalSteps = 5; // Example
    const completedSteps = Object.keys(formData.steps).length;
    
    return {
      currentStep: formData.currentStep,
      completedSteps,
      totalSteps,
      percentComplete: (completedSteps / totalSteps) * 100
    };
  }
  
  private async getFormData() {
    const data = await this.storage.get(`form:${this.formId}`);
    return data || {
      steps: {},
      currentStep: 1,
      startedAt: Date.now()
    };
  }
}
```

## Draft Recovery

```typescript
class DraftRecovery {
  private storage: Strata;
  
  async checkForDraft(formId: string): Promise<DraftInfo | null> {
    const draft = await this.storage.get(`draft:${formId}`);
    
    if (!draft) return null;
    
    const age = Date.now() - draft.savedAt;
    const ageInMinutes = Math.floor(age / 60000);
    
    return {
      exists: true,
      savedAt: draft.savedAt,
      ageInMinutes,
      preview: this.generatePreview(draft.data)
    };
  }
  
  async promptRecovery(formId: string): Promise<boolean> {
    const draftInfo = await this.checkForDraft(formId);
    
    if (!draftInfo) return false;
    
    const message = `Found a draft from ${draftInfo.ageInMinutes} minutes ago. ` +
                   `Preview: ${draftInfo.preview}\n\nRestore this draft?`;
    
    return confirm(message);
  }
  
  private generatePreview(data: any): string {
    const values = Object.values(data)
      .filter(v => v && typeof v === 'string')
      .slice(0, 3);
    
    return values.join(', ') + (values.length > 3 ? '...' : '');
  }
}
```

## Field Validation State

```typescript
class FormValidation {
  private storage: Strata;
  private formId: string;
  
  async saveFieldValidation(fieldName: string, validation: FieldValidation) {
    const key = `validation:${this.formId}:${fieldName}`;
    
    await this.storage.set(key, {
      ...validation,
      validatedAt: Date.now()
    }, {
      ttl: 3600000 // 1 hour
    });
  }
  
  async getFieldValidation(fieldName: string): Promise<FieldValidation | null> {
    const key = `validation:${this.formId}:${fieldName}`;
    return await this.storage.get(key);
  }
  
  async validateForm(form: HTMLFormElement): Promise<FormValidationResult> {
    const results: Record<string, FieldValidation> = {};
    let isValid = true;
    
    const elements = Array.from(form.elements) as HTMLInputElement[];
    
    for (const field of elements) {
      if (!field.name) continue;
      
      const validation = await this.validateField(field);
      results[field.name] = validation;
      
      if (!validation.isValid) {
        isValid = false;
      }
      
      // Cache validation result
      await this.saveFieldValidation(field.name, validation);
    }
    
    return { isValid, fields: results };
  }
  
  private async validateField(field: HTMLInputElement): Promise<FieldValidation> {
    // Example validation logic
    if (field.required && !field.value) {
      return {
        isValid: false,
        error: 'This field is required'
      };
    }
    
    if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        return {
          isValid: false,
          error: 'Invalid email format'
        };
      }
    }
    
    return { isValid: true };
  }
}
```

## File Upload Progress

```typescript
class FileUploadForm {
  private storage: Strata;
  
  async trackUpload(uploadId: string, file: File) {
    await this.storage.set(`upload:${uploadId}`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'pending',
      progress: 0,
      startedAt: Date.now()
    });
  }
  
  async updateProgress(uploadId: string, progress: number) {
    const upload = await this.storage.get(`upload:${uploadId}`);
    if (upload) {
      upload.progress = progress;
      upload.status = progress === 100 ? 'completed' : 'uploading';
      await this.storage.set(`upload:${uploadId}`, upload);
    }
  }
  
  async resumeUpload(uploadId: string): Promise<ResumeInfo | null> {
    const upload = await this.storage.get(`upload:${uploadId}`);
    
    if (!upload || upload.status === 'completed') {
      return null;
    }
    
    return {
      fileName: upload.fileName,
      bytesUploaded: Math.floor((upload.progress / 100) * upload.fileSize),
      totalBytes: upload.fileSize,
      canResume: upload.status === 'uploading'
    };
  }
}
```

## Form Analytics

```typescript
class FormAnalytics {
  private storage: Strata;
  
  async trackFieldInteraction(formId: string, fieldName: string, event: string) {
    const key = `analytics:form:${formId}:${Date.now()}`;
    
    await this.storage.set(key, {
      formId,
      fieldName,
      event,
      timestamp: Date.now()
    }, {
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
  
  async getFormMetrics(formId: string): Promise<FormMetrics> {
    const events = await this.storage.query({
      key: { $startsWith: `analytics:form:${formId}:` }
    });
    
    const metrics: FormMetrics = {
      totalInteractions: events.length,
      fieldInteractions: {},
      abandonmentRate: 0,
      averageTimeToComplete: 0
    };
    
    // Calculate field-level metrics
    events.forEach(event => {
      const field = event.value.fieldName;
      if (!metrics.fieldInteractions[field]) {
        metrics.fieldInteractions[field] = 0;
      }
      metrics.fieldInteractions[field]++;
    });
    
    return metrics;
  }
}
```

## Conditional Fields

```typescript
class ConditionalForm {
  private storage: Strata;
  private formId: string;
  
  async saveConditionalState(conditions: Record<string, boolean>) {
    await this.storage.set(`conditions:${this.formId}`, {
      conditions,
      updatedAt: Date.now()
    });
  }
  
  async loadConditionalState(): Promise<Record<string, boolean>> {
    const saved = await this.storage.get(`conditions:${this.formId}`);
    return saved?.conditions || {};
  }
  
  async updateFieldVisibility(fieldName: string, condition: boolean) {
    const conditions = await this.loadConditionalState();
    conditions[fieldName] = condition;
    
    await this.saveConditionalState(conditions);
    
    // Update form data if field is hidden
    if (!condition) {
      await this.clearFieldData(fieldName);
    }
  }
  
  private async clearFieldData(fieldName: string) {
    const formData = await this.storage.get(`form:${this.formId}`);
    if (formData?.data) {
      delete formData.data[fieldName];
      await this.storage.set(`form:${this.formId}`, formData);
    }
  }
}
```

## Form Session Management

```typescript
class FormSession {
  private storage: Strata;
  private sessionId: string;
  
  async startSession(formId: string) {
    this.sessionId = generateSessionId();
    
    await this.storage.set(`session:${this.sessionId}`, {
      formId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      completed: false
    });
    
    return this.sessionId;
  }
  
  async updateActivity() {
    const session = await this.storage.get(`session:${this.sessionId}`);
    if (session) {
      session.lastActivity = Date.now();
      await this.storage.set(`session:${this.sessionId}`, session);
    }
  }
  
  async getSessionDuration(): Promise<number> {
    const session = await this.storage.get(`session:${this.sessionId}`);
    if (!session) return 0;
    
    return Date.now() - session.startedAt;
  }
  
  async completeSession() {
    const session = await this.storage.get(`session:${this.sessionId}`);
    if (session) {
      session.completed = true;
      session.completedAt = Date.now();
      session.duration = Date.now() - session.startedAt;
      
      await this.storage.set(`session:${this.sessionId}`, session, {
        ttl: 7 * 24 * 60 * 60 * 1000 // Keep for 7 days
      });
    }
  }
}
```

## See Also

- [User Authentication](./user-auth.md)
- [Shopping Cart](./shopping-cart.md)
- [Error Handling](./error-handling.md)