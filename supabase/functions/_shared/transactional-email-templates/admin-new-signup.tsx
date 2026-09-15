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
  joinedAt?: string
  referredBy?: string
  dashboardUrl?: string
}

const Email = ({ memberName, memberEmail, joinedAt, referredBy, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A new account has been created in THE TEMPLE</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>THE TEMPLE of Sustainment</Text>
        <Heading style={heading}>New sign-up</Heading>
        <Text style={text}>Someone has just created an account.</Text>
        <Section style={box}>
          <Text style={row}><strong>Name:</strong> {memberName || 'Not given'}</Text>
          <Text style={row}><strong>Email:</strong> {memberEmail || 'Not given'}</Text>
          <Text style={row}><strong>Created:</strong> {joinedAt || 'Just now'}</Text>
          {referredBy ? <Text style={row}><strong>Referred by:</strong> {referredBy}</Text> : null}
        </Section>
        <Text style={text}>
          You'll receive a second email if and when their payment goes through.
        </Text>
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
  subject: 'New sign-up in THE TEMPLE',
  displayName: 'Admin — new sign-up',
  previewData: {
    memberName: 'Jane Doe',
    memberEmail: 'jane@example.com',
    joinedAt: '15 September 2026, 11:04 am',
    referredBy: 'jane-a1b2',
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
