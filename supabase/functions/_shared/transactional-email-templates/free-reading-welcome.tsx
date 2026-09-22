/// <reference types="npm:@types/react@18.3.1" />
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
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  readingUrl?: string
}

const Email = ({ name, readingUrl = 'https://inside.thetempleofsustainment.com/remembrance/spreads' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your free Past, Present, Future reading is waiting</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your reading is waiting</Heading>
        <Text style={text}>
          {name ? `Hello ${name},` : 'Hello,'}
        </Text>
        <Text style={text}>
          Your account at THE TEMPLE of Sustainment is open. Inside is one Past,
          Present, Future card reading — drawn from the decks and written for the
          exact cards that come to you.
        </Text>
        <Text style={text}>
          Take your time with it. There are three reflection questions beneath the
          reading, and anything you write there is saved privately to your account,
          so you can return and add more later.
        </Text>
        <Button style={button} href={readingUrl}>
          Open your reading
        </Button>
        <Hr style={hr} />
        <Text style={muted}>
          When you are ready for more, membership opens the other five spreads,
          every card deck, the courses, the Remembrance Letters, Living Pattern and
          your private journal.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your free card reading is ready',
  displayName: 'Free reading welcome',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { color: '#1c1512', fontSize: '26px', margin: '0 0 20px', fontWeight: 400 as const }
const text = { color: '#3a322c', fontSize: '16px', lineHeight: '26px', margin: '0 0 16px' }
const button = {
  backgroundColor: '#a9873d',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '13px 26px',
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '10px 0 6px',
}
const hr = { borderColor: '#e6ded2', margin: '28px 0 18px' }
const muted = { color: '#6d6257', fontSize: '14px', lineHeight: '22px', margin: '0' }
