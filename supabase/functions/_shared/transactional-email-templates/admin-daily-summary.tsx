import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  dayLabel?: string
  visits?: number
  uniqueVisitors?: number
  ctaClicks?: number
  checkoutsStarted?: number
  signups?: number
  payments?: number
  revenue?: string
  activeMemberships?: number
  topSources?: string
  dashboardUrl?: string
}

const Email = ({
  dayLabel,
  visits = 0,
  uniqueVisitors = 0,
  ctaClicks = 0,
  checkoutsStarted = 0,
  signups = 0,
  payments = 0,
  revenue,
  activeMemberships = 0,
  topSources,
  dashboardUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Yesterday in THE TEMPLE — visits, sign-ups and payments</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>THE TEMPLE of Sustainment</Text>
        <Heading style={heading}>Yesterday in THE TEMPLE</Heading>
        <Text style={text}>{dayLabel ? `A summary for ${dayLabel}.` : 'A summary of the past day.'}</Text>
        <Section style={box}>
          <Text style={row}><strong>Sales page visits:</strong> {visits} ({uniqueVisitors} unique)</Text>
          <Text style={row}><strong>Sign-up button clicks:</strong> {ctaClicks}</Text>
          <Text style={row}><strong>Checkouts started:</strong> {checkoutsStarted}</Text>
          <Text style={row}><strong>New accounts:</strong> {signups}</Text>
          <Text style={row}><strong>Payments received:</strong> {payments}</Text>
          <Text style={row}><strong>Revenue:</strong> {revenue || '$0.00 AUD'}</Text>
          <Text style={row}><strong>Active memberships in total:</strong> {activeMemberships}</Text>
        </Section>
        {topSources ? <Text style={text}><strong>Where people came from:</strong> {topSources}</Text> : null}
        <Section style={buttonSection}>
          <Button href={dashboardUrl} style={button}>
            Open the Launch Dashboard
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={small}>With Love, Julie &amp; Tash,  THE TEMPLE of Sustainment</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `THE TEMPLE daily summary${data?.dayLabel ? ` — ${data.dayLabel}` : ''}`,
  displayName: 'Admin — daily summary',
  previewData: {
    dayLabel: '14 September 2026',
    visits: 214,
    uniqueVisitors: 168,
    ctaClicks: 41,
    checkoutsStarted: 12,
    signups: 7,
    payments: 5,
    revenue: '$210.00 AUD',
    activeMemberships: 38,
    topSources: 'instagram (84), direct (61), google (23)',
    dashboardUrl: 'https://inside.thetempleofsustainment.com/admin/launch',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const eyebrow = {
  color: '#8a6d1f',
  fontSize: '12px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}
const heading = { color: '#1d1712', fontSize: '26px', margin: '0 0 20px' }
const text = { color: '#3a2f26', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const box = {
  backgroundColor: '#f7f1e3',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const row = { color: '#3a2f26', fontSize: '14px', lineHeight: '22px', margin: '0 0 6px' }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: '#b08d3f',
  color: '#1d1712',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5dcc8', margin: '8px 0 20px' }
const small = { color: '#6b5d4d', fontSize: '13px', lineHeight: '20px', margin: '0 0 12px' }
