import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  referralCode?: string
  referralUrl?: string
  portalUrl?: string
}

const Email = ({ name, referralCode, referralUrl, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your affiliate application has been approved — welcome to THE TEMPLE</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>THE TEMPLE of Sustainment</Text>
        <Heading style={heading}>Welcome — you're approved</Heading>
        <Text style={text}>{name ? `Dear ${name},` : 'Dear friend,'}</Text>
        <Text style={text}>
          Your affiliate application has been approved. Thank you for wanting to share THE TEMPLE
          with the people in your world — it means a great deal.
        </Text>
        <Text style={text}>
          Your personal referral link is ready. Anyone who joins through it is credited to you,
          even if they sign up weeks later:
        </Text>
        <Section style={linkBox}>
          <Link href={referralUrl} style={linkText}>
            {referralUrl}
          </Link>
        </Section>
        <Text style={text}>
          Your affiliate portal has everything you need: your links, ready-to-share wording for
          posts, messages and emails, and a live view of your referrals and earnings.
        </Text>
        <Section style={buttonSection}>
          <Button href={portalUrl} style={button}>
            Open your affiliate portal
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={small}>
          Keep your referral code somewhere safe: <strong>{referralCode}</strong>. If you ever have
          questions, simply reply to this email.
        </Text>
        <Text style={small}>With warmth, THE TEMPLE of Sustainment</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to THE TEMPLE affiliate circle — you are approved',
  displayName: 'Affiliate approved',
  previewData: {
    name: 'Jane',
    referralCode: 'jane-a1b2',
    referralUrl: 'https://inside.thetempleofsustainment.com/r/jane-a1b2',
    portalUrl: 'https://inside.thetempleofsustainment.com/affiliate',
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
const linkBox = {
  backgroundColor: '#f7f1e3',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const linkText = { color: '#8a6d1f', fontSize: '14px', wordBreak: 'break-all' as const }
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
