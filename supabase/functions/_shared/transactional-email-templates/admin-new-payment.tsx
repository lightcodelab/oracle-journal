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
  memberName?: string
  memberEmail?: string
  amount?: string
  plan?: string
  cadence?: string
  referredBy?: string
  dashboardUrl?: string
}

const Email = ({ memberName, memberEmail, amount, plan, cadence, referredBy, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A membership payment has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>THE TEMPLE of Sustainment</Text>
        <Heading style={heading}>New membership payment</Heading>
        <Text style={text}>A payment has just come through and access is now open.</Text>
        <Section style={box}>
          <Text style={row}><strong>Member:</strong> {memberName || 'Not given'}</Text>
          <Text style={row}><strong>Email:</strong> {memberEmail || 'Not given'}</Text>
          <Text style={row}><strong>Amount:</strong> {amount || 'Not available'}</Text>
          <Text style={row}><strong>Membership:</strong> {plan || 'Membership'}{cadence ? ` (${cadence})` : ''}</Text>
          {referredBy ? <Text style={row}><strong>Referred by:</strong> {referredBy}</Text> : null}
        </Section>
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
  subject: 'New membership payment received',
  displayName: 'Admin — new payment',
  previewData: {
    memberName: 'Jane Doe',
    memberEmail: 'jane@example.com',
    amount: '$35.00 AUD',
    plan: 'Founding Member',
    cadence: 'monthly',
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
