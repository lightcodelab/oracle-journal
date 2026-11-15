/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Kind = 'two_days' | 'today' | 'overdue'
interface Props { name?: string; kind?: Kind; dueDate?: string; daysOverdue?: number; accountUrl?: string }

const copy = (kind: Kind, dueDate?: string, daysOverdue?: number) => {
  if (kind === 'today') return {
    preview: 'Your Temple membership renews today',
    heading: 'Your membership renews today',
    body: 'Your THE TEMPLE of Sustainment membership payment is due today. If your card details are up to date, there is nothing you need to do.',
    cta: 'Check my payment details',
  }
  if (kind === 'overdue') return {
    preview: 'Your Temple membership payment did not go through',
    heading: 'Your payment did not go through',
    body: `We were not able to take your membership payment${dueDate ? ` due on ${dueDate}` : ''}${daysOverdue ? `, and it is now ${daysOverdue} days overdue` : ''}. Please update your payment details so your access to the Temple stays open.`,
    cta: 'Update my payment details',
  }
  return {
    preview: 'Your Temple membership renews in 2 days',
    heading: 'Your membership renews in 2 days',
    body: `Your THE TEMPLE of Sustainment membership payment is due${dueDate ? ` on ${dueDate}` : ' in 2 days'}. If your card details are up to date, there is nothing you need to do.`,
    cta: 'Check my payment details',
  }
}

const Email = ({ name, kind = 'two_days', dueDate, daysOverdue, accountUrl = 'https://inside.thetempleofsustainment.com/account' }: Props) => {
  const c = copy(kind, dueDate, daysOverdue)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{c.heading}</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>{c.body}</Text>
          <Button style={button} href={accountUrl}>{c.cta}</Button>
          <Hr style={hr} />
          <Text style={muted}>With love, Julie and Tash. If you have any questions, simply reply to support@lightcodelab.com.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.kind === 'today' ? 'Your Temple membership renews today'
    : d.kind === 'overdue' ? 'Your Temple membership payment is overdue'
    : 'Your Temple membership renews in 2 days',
  displayName: 'Payment reminder',
  previewData: { name: 'Jane', kind: 'overdue', dueDate: '12 November 2026', daysOverdue: 3 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { color: '#1c1512', fontSize: '26px', margin: '0 0 20px', fontWeight: 400 as const }
const text = { color: '#3a322c', fontSize: '16px', lineHeight: '26px', margin: '0 0 16px' }
const button = { backgroundColor: '#ad8330', color: '#ffffff', borderRadius: '8px', padding: '13px 26px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '10px 0 6px' }
const hr = { borderColor: '#e6ded2', margin: '28px 0 18px' }
const muted = { color: '#6d6257', fontSize: '14px', lineHeight: '22px', margin: '0' }
