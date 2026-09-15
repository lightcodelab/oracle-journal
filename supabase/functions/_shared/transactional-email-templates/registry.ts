import type { ComponentType } from 'npm:react@18.3.1'
import { template as affiliateApprovedTemplate } from './affiliate-approved.tsx'
import { template as adminNewSignupTemplate } from './admin-new-signup.tsx'
import { template as adminNewPaymentTemplate } from './admin-new-payment.tsx'
import { template as adminDailySummaryTemplate } from './admin-daily-summary.tsx'
import { template as remembranceLetterReadyTemplate } from './remembrance-letter-ready.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome.tsx'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'affiliate-approved': affiliateApprovedTemplate,
  'admin-new-signup': adminNewSignupTemplate,
  'admin-new-payment': adminNewPaymentTemplate,
  'admin-daily-summary': adminDailySummaryTemplate,
}
